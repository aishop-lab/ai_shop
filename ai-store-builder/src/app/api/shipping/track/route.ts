import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { shiprocket, mapShiprocketStatus } from '@/lib/shipping/shiprocket'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const awbCode = searchParams.get('awb_code')

    if (!orderId && !awbCode) {
      return NextResponse.json(
        { success: false, error: 'Order ID or AWB code is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get order to verify ownership and get AWB
    let order
    if (orderId) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          store_id,
          awb_code,
          shiprocket_shipment_id,
          tracking_number,
          courier_name,
          order_status,
          estimated_delivery_date
        `)
        .eq('id', orderId)
        .single()

      if (error || !data) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
      }
      order = data
    }

    // Verify user owns this order's store
    if (order) {
      const { data: store } = await supabase
        .from('stores')
        .select('owner_id')
        .eq('id', order.store_id)
        .single()

      if (!store || store.owner_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
      }
    }

    const trackingCode = awbCode || order?.awb_code

    if (!trackingCode) {
      return NextResponse.json(
        { success: false, error: 'No tracking information available for this order' },
        { status: 400 }
      )
    }

    // Check if Shiprocket is configured
    if (!shiprocket.isConfigured()) {
      // Return local tracking events if Shiprocket is not configured
      const { data: events } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('order_id', orderId)
        .order('event_date', { ascending: false })

      return NextResponse.json({
        success: true,
        tracking: {
          awb_code: trackingCode,
          courier_name: order?.courier_name,
          current_status: order?.order_status,
          estimated_delivery: order?.estimated_delivery_date,
          events: events || []
        }
      })
    }

    // Get tracking from Shiprocket
    const trackingData = await shiprocket.trackByAWB(trackingCode)

    if (!trackingData.tracking_data || trackingData.tracking_data.track_status === 0) {
      // No tracking data yet - return what we have
      return NextResponse.json({
        success: true,
        tracking: {
          awb_code: trackingCode,
          courier_name: order?.courier_name,
          current_status: order?.order_status || 'processing',
          estimated_delivery: order?.estimated_delivery_date,
          events: [],
          message: 'Tracking information not yet available'
        }
      })
    }

    const shipmentTrack = trackingData.tracking_data.shipment_track?.[0]
    const activities = trackingData.tracking_data.shipment_track_activities || []

    // Map current status
    const currentStatus = shipmentTrack?.current_status || 'PROCESSING'
    const mappedStatus = mapShiprocketStatus(currentStatus)

    // Update order status if changed
    if (order && mappedStatus !== order.order_status) {
      await supabase
        .from('orders')
        .update({
          order_status: mappedStatus,
          ...(mappedStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {})
        })
        .eq('id', order.id)
    }

    // Store new tracking events
    if (orderId && activities.length > 0) {
      // Get existing events to avoid duplicates
      const { data: existingEvents } = await supabase
        .from('shipment_events')
        .select('event_date, status')
        .eq('order_id', orderId)

      const existingSet = new Set(
        existingEvents?.map((e) => `${e.event_date}-${e.status}`) || []
      )

      const newEvents = activities
        .filter((activity) => {
          const key = `${activity.date}-${activity.status}`
          return !existingSet.has(key)
        })
        .map((activity) => ({
          order_id: orderId,
          awb_code: trackingCode,
          event_date: activity.date,
          status: activity.status,
          activity: activity.activity,
          location: activity.location
        }))

      if (newEvents.length > 0) {
        await supabase.from('shipment_events').insert(newEvents)
      }
    }

    return NextResponse.json({
      success: true,
      tracking: {
        awb_code: trackingCode,
        courier_name: order?.courier_name,
        current_status: currentStatus,
        mapped_status: mappedStatus,
        estimated_delivery: trackingData.tracking_data.etd || order?.estimated_delivery_date,
        delivered_date: shipmentTrack?.delivered_date,
        destination: shipmentTrack?.destination,
        origin: shipmentTrack?.origin,
        track_url: trackingData.tracking_data.track_url,
        events: activities.map((activity) => ({
          date: activity.date,
          status: activity.status,
          activity: activity.activity,
          location: activity.location
        }))
      }
    })
  } catch (error) {
    console.error('[Shipping] Track error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tracking'
      },
      { status: 500 }
    )
  }
}
