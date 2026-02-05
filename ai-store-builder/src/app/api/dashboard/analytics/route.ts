import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { DashboardAnalytics, AnalyticsPeriod, RevenueTrendItem } from '@/lib/types/dashboard'

interface OrderRow {
  id: string
  total: number  // Database column is 'total', not 'total_amount'
  payment_status: string
  fulfillment_status: string  // Database column is 'fulfillment_status', not 'order_status'
  created_at: string
}

interface OrderItemRow {
  product_id: string
  title: string  // Database column is 'title', not 'product_title'
  image_url: string | null  // Database column is 'image_url', not 'product_image'
  quantity: number
  total: number  // Database column is 'total', not 'total_price'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('store_id')
    const period = (searchParams.get('period') || '7d') as AnalyticsPeriod

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      )
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(startDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
    }

    // 1. Revenue metrics - fetch orders
    const { data: orders } = await getSupabaseAdmin()
      .from('orders')
      .select('id, total, payment_status, fulfillment_status, created_at')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const typedOrders = (orders || []) as OrderRow[]

    const paidOrders = typedOrders.filter(o => o.payment_status === 'paid')
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0)
    const totalOrders = typedOrders.length
    const pendingOrders = typedOrders.filter(o => o.payment_status === 'pending').length

    // 2. Product metrics (check for both 'active' and 'published' status)
    const { count: totalProducts } = await getSupabaseAdmin()
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .in('status', ['active', 'published'])

    const { data: lowStockProducts } = await getSupabaseAdmin()
      .from('products')
      .select('id, title, quantity')
      .eq('store_id', storeId)
      .eq('track_quantity', true)
      .lte('quantity', 5)
      .order('quantity', { ascending: true })
      .limit(5)

    // 3. Top selling products
    const paidOrderIds = paidOrders.map(o => o.id)
    
    let topSellingProducts: DashboardAnalytics['topSellingProducts'] = []
    
    if (paidOrderIds.length > 0) {
      const { data: orderItems } = await getSupabaseAdmin()
        .from('order_items')
        .select('product_id, title, image_url, quantity, total')
        .in('order_id', paidOrderIds)

      const typedItems = (orderItems || []) as OrderItemRow[]

      // Aggregate sales by product
      const productSalesMap = new Map<string, {
        product_id: string
        product_title: string
        product_image?: string
        quantity: number
        revenue: number
      }>()

      typedItems.forEach(item => {
        const existing = productSalesMap.get(item.product_id)
        if (existing) {
          existing.quantity += item.quantity
          existing.revenue += Number(item.total)
        } else {
          productSalesMap.set(item.product_id, {
            product_id: item.product_id,
            product_title: item.title,
            product_image: item.image_url || undefined,
            quantity: item.quantity,
            revenue: Number(item.total)
          })
        }
      })

      topSellingProducts = Array.from(productSalesMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
    }

    // 4. Recent orders
    const { data: recentOrders } = await getSupabaseAdmin()
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(10)

    // 5. Revenue trend
    const revenueTrend = generateRevenueTrend(typedOrders, period)

    const analytics: DashboardAnalytics = {
      overview: {
        revenue,
        orders: totalOrders,
        paidOrders: paidOrders.length,
        pendingOrders,
        products: totalProducts || 0,
        averageOrderValue: paidOrders.length > 0 ? revenue / paidOrders.length : 0
      },
      topSellingProducts,
      lowStockProducts: (lowStockProducts || []).map(p => ({
        id: p.id,
        title: p.title,
        quantity: p.quantity
      })),
      recentOrders: recentOrders || [],
      revenueTrend
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

function generateRevenueTrend(orders: OrderRow[], period: AnalyticsPeriod): RevenueTrendItem[] {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
  const trend: RevenueTrendItem[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const dayOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at)
      return orderDate >= date && orderDate < nextDate && o.payment_status === 'paid'
    })

    const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.total), 0)

    trend.push({
      date: date.toISOString().split('T')[0],
      revenue: dayRevenue,
      orders: dayOrders.length
    })
  }

  return trend
}
