import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateSession } from '@/lib/customer/auth'

// Get customer order history
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') // optional filter

    // Build query
    let query = getSupabaseAdmin()
      .from('orders')
      .select(`
        id,
        order_number,
        order_status,
        payment_status,
        payment_method,
        subtotal,
        shipping_cost,
        discount_amount,
        total_amount,
        shipping_name,
        shipping_city,
        shipping_state,
        tracking_number,
        courier_name,
        created_at,
        shipped_at,
        delivered_at,
        order_items (
          id,
          product_title,
          quantity,
          unit_price,
          total_price,
          variant_title,
          product:products (
            slug,
            product_images (
              url,
              alt_text
            )
          )
        )
      `, { count: 'exact' })
      .or(`customer_id.eq.${sessionResult.customer.id},customer_email.eq.${sessionResult.customer.email}`)
      .eq('store_id', sessionResult.customer.store_id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('order_status', status)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Failed to fetch orders:', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
