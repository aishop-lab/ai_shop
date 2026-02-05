import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('store_id')
    const type = searchParams.get('type') as 'orders' | 'products' | null
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')

    if (!storeId || !type) {
      return NextResponse.json(
        { error: 'Store ID and type required' },
        { status: 400 }
      )
    }

    if (!['orders', 'products'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be orders or products' },
        { status: 400 }
      )
    }

    let data: Record<string, unknown>[] = []
    let filename = ''

    if (type === 'orders') {
      let query = getSupabaseAdmin()
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      // Date filters
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }
      if (status && status !== 'all') {
        query = query.eq('order_status', status)
      }

      const { data: orders, error } = await query

      if (error) throw error

      // Flatten shipping address for CSV
      data = (orders || []).map(order => {
        const shippingAddr = order.shipping_address as Record<string, unknown> || {}
        return {
          order_number: order.order_number || '',
          customer_name: order.customer_name || '',
          customer_email: order.customer_email || '',
          customer_phone: order.customer_phone || '',
          shipping_name: shippingAddr.name || '',
          shipping_address: shippingAddr.address_line1 || '',
          shipping_city: shippingAddr.city || '',
          shipping_state: shippingAddr.state || '',
          shipping_pincode: shippingAddr.pincode || '',
          subtotal: order.subtotal || 0,
          shipping_cost: order.shipping_cost || 0,
          tax_amount: order.tax_amount || 0,
          discount_amount: order.discount_amount || 0,
          total_amount: order.total_amount || 0,
          payment_method: order.payment_method || '',
          payment_status: order.payment_status || '',
          order_status: order.order_status || '',
          tracking_number: order.tracking_number || '',
          courier_name: order.courier_name || '',
          created_at: order.created_at || '',
          shipped_at: order.shipped_at || '',
          delivered_at: order.delivered_at || ''
        }
      })

      filename = `orders-export-${new Date().toISOString().split('T')[0]}.${format}`

    } else if (type === 'products') {
      let query = getSupabaseAdmin()
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const { data: products, error } = await query

      if (error) throw error

      // Flatten for CSV
      data = (products || []).map(product => ({
        title: product.title || '',
        description: product.description || '',
        sku: product.sku || '',
        category: product.category || '',
        price: product.price || 0,
        compare_at_price: product.compare_at_price || '',
        quantity: product.quantity || 0,
        track_quantity: product.track_quantity ? 'Yes' : 'No',
        status: product.status || '',
        featured: product.featured ? 'Yes' : 'No',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        created_at: product.created_at || '',
        updated_at: product.updated_at || ''
      }))

      filename = `products-export-${new Date().toISOString().split('T')[0]}.${format}`
    }

    if (format === 'csv') {
      const csv = convertToCSV(data)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    } else {
      // JSON format
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])

  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header]

      // Handle null/undefined
      if (value === null || value === undefined) {
        return ''
      }

      // Convert to string
      const stringValue = String(value)

      // Escape special characters for CSV
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }

      return stringValue
    }).join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}
