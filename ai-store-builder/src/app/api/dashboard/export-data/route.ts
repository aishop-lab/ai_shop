import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import AdmZip from 'adm-zip'
import { Parser } from 'json2csv'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for large exports

interface CustomerData {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
  orders_count: number
  total_spent: number
  first_order_date: string
  last_order_date: string
}

interface OrderExport {
  order_number: string
  date: string
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: string
  shipping_city: string
  shipping_state: string
  shipping_pincode: string
  items: string
  subtotal: number
  shipping_cost: number
  tax_amount: number
  discount_amount: number
  coupon_code: string
  total_amount: number
  payment_method: string
  payment_status: string
  order_status: string
  tracking_number: string
  courier_name: string
  notes: string
}

interface ProductExport {
  title: string
  description: string
  sku: string
  slug: string
  price: number
  compare_at_price: number | null
  quantity: number
  track_quantity: boolean
  category: string
  tags: string
  status: string
  featured: boolean
  images: string
  created_at: string
}

export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (storeError || !stores?.[0]) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const store = stores[0]

    // Fetch all data in parallel
    const [
      customersResult,
      ordersResult,
      productsResult,
      analyticsResult
    ] = await Promise.all([
      fetchCustomers(supabase, store.id),
      fetchOrders(supabase, store.id),
      fetchProducts(supabase, store.id),
      fetchAnalytics(supabase, store.id)
    ])

    // Create CSV data
    const customersCSV = customersResult.length > 0
      ? new Parser({ fields: Object.keys(customersResult[0]) }).parse(customersResult)
      : 'No customer data'

    const ordersCSV = ordersResult.length > 0
      ? new Parser({ fields: Object.keys(ordersResult[0]) }).parse(ordersResult)
      : 'No order data'

    const productsCSV = productsResult.length > 0
      ? new Parser({ fields: Object.keys(productsResult[0]) }).parse(productsResult)
      : 'No product data'

    // Prepare store settings
    const storeSettings = {
      name: store.name,
      slug: store.slug,
      status: store.status,
      logo_url: store.logo_url,
      primary_color: store.primary_color,
      secondary_color: store.secondary_color,
      brand_vibe: store.brand_vibe,
      blueprint: store.blueprint,
      settings: store.settings,
      shipping_settings: store.shipping_settings,
      marketing_pixels: store.marketing_pixels,
      created_at: store.created_at
    }

    // Create ZIP file
    const zip = new AdmZip()

    zip.addFile('customers.csv', Buffer.from(customersCSV, 'utf-8'))
    zip.addFile('orders.csv', Buffer.from(ordersCSV, 'utf-8'))
    zip.addFile('products.csv', Buffer.from(productsCSV, 'utf-8'))
    zip.addFile('analytics.json', Buffer.from(JSON.stringify(analyticsResult, null, 2), 'utf-8'))
    zip.addFile('settings.json', Buffer.from(JSON.stringify(storeSettings, null, 2), 'utf-8'))
    zip.addFile('README.txt', Buffer.from(generateReadme(store.name), 'utf-8'))

    const zipBuffer = zip.toBuffer()

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `${store.slug}_data_${dateStr}.zip`

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(zipBuffer)

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('[Export Data] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}

async function fetchCustomers(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string): Promise<CustomerData[]> {
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name, customer_email, customer_phone, shipping_address, total_amount, created_at')
    .eq('store_id', storeId)

  if (!orders || orders.length === 0) {
    return []
  }

  // Deduplicate and aggregate customer data
  const customerMap = new Map<string, CustomerData>()

  orders.forEach(order => {
    const email = order.customer_email || ''
    const shippingAddr = (order.shipping_address || {}) as Record<string, string>

    if (!email) return

    const existing = customerMap.get(email)

    if (existing) {
      existing.orders_count += 1
      existing.total_spent += order.total_amount || 0
      if (order.created_at > existing.last_order_date) {
        existing.last_order_date = order.created_at
      }
    } else {
      customerMap.set(email, {
        name: order.customer_name || '',
        email: email,
        phone: order.customer_phone || '',
        address: shippingAddr.address_line1 || '',
        city: shippingAddr.city || '',
        state: shippingAddr.state || '',
        pincode: shippingAddr.pincode || '',
        orders_count: 1,
        total_spent: order.total_amount || 0,
        first_order_date: order.created_at,
        last_order_date: order.created_at
      })
    }
  })

  return Array.from(customerMap.values())
}

async function fetchOrders(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string): Promise<OrderExport[]> {
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        title,
        quantity,
        price
      )
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (!orders) return []

  return orders.map(order => {
    const shippingAddr = (order.shipping_address || {}) as Record<string, string>
    const items = (order.order_items || []) as Array<{ title: string; quantity: number; price: number }>

    return {
      order_number: order.order_number || '',
      date: order.created_at || '',
      customer_name: order.customer_name || '',
      customer_email: order.customer_email || '',
      customer_phone: order.customer_phone || '',
      shipping_address: shippingAddr.address_line1 || '',
      shipping_city: shippingAddr.city || '',
      shipping_state: shippingAddr.state || '',
      shipping_pincode: shippingAddr.pincode || '',
      items: items.map(i => `${i.title} x${i.quantity}`).join('; '),
      subtotal: order.subtotal || 0,
      shipping_cost: order.shipping_cost || 0,
      tax_amount: order.tax_amount || 0,
      discount_amount: order.discount_amount || 0,
      coupon_code: order.coupon_code || '',
      total_amount: order.total_amount || 0,
      payment_method: order.payment_method || '',
      payment_status: order.payment_status || '',
      order_status: order.order_status || '',
      tracking_number: order.tracking_number || '',
      courier_name: order.courier_name || '',
      notes: order.notes || ''
    }
  })
}

async function fetchProducts(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string): Promise<ProductExport[]> {
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      product_images (url, position)
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (!products) return []

  return products.map(product => {
    const images = (product.product_images || []) as Array<{ url: string; position: number }>
    const sortedImages = images.sort((a, b) => a.position - b.position)

    return {
      title: product.title || '',
      description: product.description || '',
      sku: product.sku || '',
      slug: product.slug || '',
      price: product.price || 0,
      compare_at_price: product.compare_at_price,
      quantity: product.quantity || 0,
      track_quantity: product.track_quantity ?? true,
      category: product.category || '',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      status: product.status || '',
      featured: product.featured ?? false,
      images: sortedImages.map(i => i.url).join('; '),
      created_at: product.created_at || ''
    }
  })
}

async function fetchAnalytics(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string) {
  // Get date ranges
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Fetch orders for analytics
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount, created_at, payment_status, order_status')
    .eq('store_id', storeId)
    .gte('created_at', ninetyDaysAgo.toISOString())

  // Calculate metrics
  const allTimeOrders = orders || []
  const last30DaysOrders = allTimeOrders.filter(o => new Date(o.created_at) >= thirtyDaysAgo)

  const totalRevenue = allTimeOrders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0)

  const last30DaysRevenue = last30DaysOrders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0)

  // Orders by status
  const ordersByStatus = allTimeOrders.reduce((acc, order) => {
    const status = order.order_status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Daily revenue for last 30 days
  const dailyRevenue: Record<string, number> = {}
  last30DaysOrders.forEach(order => {
    if (order.payment_status === 'paid') {
      const date = order.created_at.split('T')[0]
      dailyRevenue[date] = (dailyRevenue[date] || 0) + (order.total_amount || 0)
    }
  })

  // Top products by revenue
  const { data: topProducts } = await supabase
    .from('order_items')
    .select(`
      product_id,
      title,
      quantity,
      price,
      orders!inner (store_id, payment_status)
    `)
    .eq('orders.store_id', storeId)
    .eq('orders.payment_status', 'paid')

  const productRevenue: Record<string, { title: string; revenue: number; quantity: number }> = {}
  ;(topProducts || []).forEach((item: { product_id: string; title: string; quantity: number; price: number }) => {
    const id = item.product_id
    if (!productRevenue[id]) {
      productRevenue[id] = { title: item.title, revenue: 0, quantity: 0 }
    }
    productRevenue[id].revenue += item.price * item.quantity
    productRevenue[id].quantity += item.quantity
  })

  const topProductsList = Object.entries(productRevenue)
    .map(([id, data]) => ({ product_id: id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return {
    export_date: now.toISOString(),
    period: {
      start: ninetyDaysAgo.toISOString(),
      end: now.toISOString()
    },
    summary: {
      total_orders: allTimeOrders.length,
      total_revenue: totalRevenue,
      last_30_days_orders: last30DaysOrders.length,
      last_30_days_revenue: last30DaysRevenue,
      average_order_value: allTimeOrders.length > 0 ? totalRevenue / allTimeOrders.length : 0
    },
    orders_by_status: ordersByStatus,
    daily_revenue: dailyRevenue,
    top_products: topProductsList
  }
}

function generateReadme(storeName: string): string {
  return `${storeName} - Data Export
================================

Generated: ${new Date().toISOString()}

Files Included:
--------------
1. customers.csv
   - All unique customers from your orders
   - Includes: name, email, phone, address, order count, total spent

2. orders.csv
   - Complete order history
   - Includes: order details, customer info, shipping, payment status, items

3. products.csv
   - Your entire product catalog
   - Includes: title, description, pricing, inventory, images, status

4. analytics.json
   - Sales and performance data
   - Includes: revenue summary, daily breakdown, top products

5. settings.json
   - Store configuration
   - Includes: branding, shipping settings, marketing pixels

Data Ownership:
--------------
You own all your data. You can use this export to:
- Migrate to another platform
- Create backups
- Analyze your business
- Meet GDPR/compliance requirements

Support:
--------
If you have questions about your data, contact support.

This export was generated from AI Store Builder.
`
}
