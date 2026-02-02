import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/dashboard/returns
 * Fetch RTO and returned orders for the merchant's store
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // RTO statuses to filter
    const rtoStatuses = ['returned', 'rto_initiated', 'rto_in_transit', 'rto_delivered', 'cancelled']
    const filterStatuses = status && status !== 'all' ? [status] : rtoStatuses

    // Build query for orders
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        email,
        phone,
        total,
        fulfillment_status,
        awb_code,
        courier_name,
        shipping_address,
        created_at,
        shipped_at,
        updated_at
      `)
      .eq('store_id', store.id)
      .in('fulfillment_status', filterStatuses)
      .order('updated_at', { ascending: false })

    // Add search filter
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: orders, error: ordersError } = await query.limit(100)

    if (ordersError) {
      console.error('Failed to fetch RTO orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Get total orders count for RTO rate calculation
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .in('fulfillment_status', ['shipped', 'delivered', 'out_for_delivery', ...rtoStatuses])

    // Calculate stats
    const stats = {
      total_rto: orders?.length || 0,
      rto_in_transit: orders?.filter((o) => o.fulfillment_status === 'rto_in_transit' || o.fulfillment_status === 'rto_initiated').length || 0,
      rto_delivered: orders?.filter((o) => o.fulfillment_status === 'rto_delivered' || o.fulfillment_status === 'returned').length || 0,
      rto_rate: totalOrders ? ((orders?.length || 0) / totalOrders) * 100 : 0,
      total_rto_value: orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
    }

    // Transform orders for response
    const transformedOrders = orders?.map((order) => {
      const shippingAddress = order.shipping_address as Record<string, string> || {}

      // Try to get RTO timestamps from shipment events
      // For now, use updated_at as a proxy
      const rtoInitiatedAt = order.fulfillment_status.includes('rto') ? order.updated_at : null
      const rtoDeliveredAt = order.fulfillment_status === 'rto_delivered' ? order.updated_at : null

      return {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_email: order.email,
        customer_phone: order.phone,
        total: order.total,
        fulfillment_status: order.fulfillment_status,
        awb_code: order.awb_code,
        courier_name: order.courier_name,
        shipping_address: {
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          pincode: shippingAddress.pincode || '',
        },
        created_at: order.created_at,
        shipped_at: order.shipped_at,
        rto_initiated_at: rtoInitiatedAt,
        rto_delivered_at: rtoDeliveredAt,
        rto_reason: getRTOReason(order.fulfillment_status),  // Placeholder - could be stored in DB
      }
    }) || []

    return NextResponse.json({
      orders: transformedOrders,
      stats,
    })
  } catch (error) {
    console.error('Returns API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get RTO reason based on status (placeholder - could be enhanced with actual tracking data)
 */
function getRTOReason(status: string): string | undefined {
  const reasons: Record<string, string> = {
    rto_initiated: 'Customer not available / Refused delivery',
    rto_in_transit: 'Returning to origin',
    rto_delivered: 'Package returned to warehouse',
    returned: 'Customer return',
    cancelled: 'Order cancelled',
  }
  return reasons[status]
}
