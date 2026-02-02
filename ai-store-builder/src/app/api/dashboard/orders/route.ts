import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { OrdersListResponse } from '@/lib/types/dashboard'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('store_id')
    const status = searchParams.get('status') // all, pending, confirmed, shipped, etc.
    const paymentStatus = searchParams.get('payment_status') // all, pending, paid, failed
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('store_id', storeId)

    // Filter by order status (database column is 'fulfillment_status')
    if (status && status !== 'all') {
      query = query.eq('fulfillment_status', status)
    }

    // Filter by payment status
    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus)
    }

    // Search by order number or customer name/email (database columns: customer_name, email)
    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Sorting
    const ascending = sortOrder === 'asc'
    
    const { data: orders, count, error } = await query
      .range(from, to)
      .order(sortBy, { ascending })

    if (error) throw error

    // Map database column names to Order type expected by frontend
    const mappedOrders = (orders || []).map((order: Record<string, unknown>) => ({
      ...order,
      // Map database columns to Order type names
      customer_email: order.email,
      customer_phone: order.phone,
      shipping_cost: order.shipping_amount,
      total_amount: order.total,
      order_status: order.fulfillment_status,
      // Map order_items columns if present
      order_items: Array.isArray(order.order_items)
        ? order.order_items.map((item: Record<string, unknown>) => ({
            ...item,
            product_title: item.title,
            product_image: item.image_url,
            total_price: item.total,
          }))
        : [],
    }))

    return NextResponse.json({
      orders: mappedOrders,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
