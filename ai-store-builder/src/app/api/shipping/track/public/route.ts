import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { shiprocket, mapShiprocketStatus } from '@/lib/shipping/shiprocket'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/shipping/track/public
 *
 * Public tracking endpoint for customers to track their orders.
 * Doesn't require authentication but validates order exists.
 *
 * Query params:
 * - order_number: The order number to track (required)
 * - email: Customer email for verification (optional, adds extra security)
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting to prevent abuse
    const rateLimitResult = rateLimit(request, RATE_LIMITS.API)
    if (rateLimitResult) return rateLimitResult

    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('order_number')
    const email = searchParams.get('email')

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      )
    }

    // Fetch order
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        email,
        awb_code,
        shiprocket_shipment_id,
        tracking_number,
        courier_name,
        fulfillment_status,
        estimated_delivery_date,
        shipped_at,
        delivered_at
      `)
      .eq('order_number', orderNumber)

    // Optional email verification for extra security
    if (email) {
      query = query.eq('email', email.toLowerCase())
    }

    const { data: order, error } = await query.single()

    if (error || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // If no AWB code yet, return current status from order
    if (!order.awb_code) {
      return NextResponse.json({
        success: true,
        tracking: {
          order_number: order.order_number,
          awb_code: null,
          courier_name: order.courier_name,
          current_status: order.fulfillment_status || 'processing',
          mapped_status: order.fulfillment_status || 'processing',
          estimated_delivery: order.estimated_delivery_date,
          shipped_at: order.shipped_at,
          delivered_date: order.delivered_at,
          events: [],
          message: 'Your order is being processed. Tracking information will be available once shipped.'
        }
      })
    }

    // Check if Shiprocket is configured
    if (!shiprocket.isConfigured()) {
      // Return local tracking data if Shiprocket is not configured
      const { data: events } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('order_id', order.id)
        .order('event_date', { ascending: false })

      return NextResponse.json({
        success: true,
        tracking: {
          order_number: order.order_number,
          awb_code: order.awb_code,
          courier_name: order.courier_name,
          current_status: order.fulfillment_status,
          mapped_status: order.fulfillment_status,
          estimated_delivery: order.estimated_delivery_date,
          shipped_at: order.shipped_at,
          delivered_date: order.delivered_at,
          events: (events || []).map(e => ({
            date: e.event_date,
            status: e.status,
            activity: e.activity,
            location: e.location
          }))
        }
      })
    }

    // Get tracking from Shiprocket
    const trackingData = await shiprocket.trackByAWB(order.awb_code)

    if (!trackingData.tracking_data || trackingData.tracking_data.track_status === 0) {
      // No tracking data yet from Shiprocket - return what we have
      return NextResponse.json({
        success: true,
        tracking: {
          order_number: order.order_number,
          awb_code: order.awb_code,
          courier_name: order.courier_name,
          current_status: order.fulfillment_status || 'shipped',
          mapped_status: order.fulfillment_status || 'shipped',
          estimated_delivery: order.estimated_delivery_date,
          shipped_at: order.shipped_at,
          delivered_date: order.delivered_at,
          events: [],
          message: 'Tracking information will be available shortly.'
        }
      })
    }

    const shipmentTrack = trackingData.tracking_data.shipment_track?.[0]
    const activities = trackingData.tracking_data.shipment_track_activities || []

    // Map current status
    const currentStatus = shipmentTrack?.current_status || 'PROCESSING'
    const mappedStatus = mapShiprocketStatus(currentStatus)

    // Update order status if changed (background operation)
    if (mappedStatus !== order.fulfillment_status) {
      supabase
        .from('orders')
        .update({
          fulfillment_status: mappedStatus,
          ...(mappedStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {})
        })
        .eq('id', order.id)
        .then(({ error }) => {
          if (error) console.error('Failed to update order status:', error)
        })
    }

    // Store new tracking events (background operation)
    if (activities.length > 0) {
      const { data: existingEvents } = await supabase
        .from('shipment_events')
        .select('event_date, status')
        .eq('order_id', order.id)

      const existingSet = new Set(
        existingEvents?.map((e) => `${e.event_date}-${e.status}`) || []
      )

      const newEvents = activities
        .filter((activity) => {
          const key = `${activity.date}-${activity.status}`
          return !existingSet.has(key)
        })
        .map((activity) => ({
          order_id: order.id,
          awb_code: order.awb_code,
          event_date: activity.date,
          status: activity.status,
          activity: activity.activity,
          location: activity.location
        }))

      if (newEvents.length > 0) {
        supabase.from('shipment_events').insert(newEvents)
          .then(({ error }) => {
            if (error) console.error('Failed to store events:', error)
          })
      }
    }

    return NextResponse.json({
      success: true,
      tracking: {
        order_number: order.order_number,
        awb_code: order.awb_code,
        courier_name: order.courier_name,
        current_status: currentStatus,
        mapped_status: mappedStatus,
        estimated_delivery: trackingData.tracking_data.etd || order.estimated_delivery_date,
        shipped_at: order.shipped_at,
        delivered_date: shipmentTrack?.delivered_date || order.delivered_at,
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
    console.error('[Public Tracking] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get tracking information'
      },
      { status: 500 }
    )
  }
}
