import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { shiprocket } from '@/lib/shipping/shiprocket'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Shiprocket is configured
    if (!shiprocket.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Shiprocket is not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { order_id, pickup_date } = body

    if (!order_id || !pickup_date) {
      return NextResponse.json(
        { success: false, error: 'Order ID and pickup date are required' },
        { status: 400 }
      )
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, stores!inner(owner_id)')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Verify ownership
    if (order.stores.owner_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Check if shipment exists
    if (!order.shiprocket_shipment_id) {
      return NextResponse.json(
        { success: false, error: 'No shipment found. Please generate shipping label first.' },
        { status: 400 }
      )
    }

    // Check if pickup already scheduled
    if (order.pickup_scheduled_date) {
      return NextResponse.json(
        { success: false, error: 'Pickup already scheduled for this order' },
        { status: 400 }
      )
    }

    console.log('[Shipping] Scheduling pickup for order:', order.order_number)

    // Schedule pickup with Shiprocket
    const pickupResponse = await shiprocket.schedulePickup({
      shipment_id: order.shiprocket_shipment_id,
      pickup_date: pickup_date
    })

    // Update order with pickup info
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pickup_scheduled_date: new Date(pickup_date).toISOString(),
        pickup_token: pickupResponse.pickup_token_number,
        fulfillment_status: 'processing'
      })
      .eq('id', order_id)

    if (updateError) {
      console.error('[Shipping] Failed to update order:', updateError)
    }

    // Log event
    await supabase.from('shipment_events').insert({
      order_id: order_id,
      awb_code: order.awb_code,
      event_date: new Date().toISOString(),
      status: 'PICKUP_SCHEDULED',
      activity: `Pickup scheduled for ${pickup_date}`,
      location: 'Pickup Location'
    })

    console.log('[Shipping] Pickup scheduled:', pickupResponse)

    return NextResponse.json({
      success: true,
      pickup: {
        scheduled_date: pickup_date,
        token_number: pickupResponse.pickup_token_number,
        status: pickupResponse.response
      }
    })
  } catch (error) {
    console.error('[Shipping] Schedule pickup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule pickup'
      },
      { status: 500 }
    )
  }
}
