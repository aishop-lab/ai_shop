import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mapShiprocketStatus } from '@/lib/shipping/shiprocket'
import {
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
} from '@/lib/email/order-confirmation'
import {
  sendOrderShippedWhatsApp,
  sendOrderDeliveredWhatsApp,
  sendOutForDeliveryWhatsApp,
} from '@/lib/whatsapp/msg91'

// Use service role for webhooks (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Shiprocket webhook payload types
interface ShiprocketWebhookPayload {
  awb: string
  courier_name: string
  current_status: string
  current_status_id: number
  shipment_status: string
  shipment_status_id: number
  current_timestamp: string
  order_id: string // This is our order_number
  sr_order_id: number
  sr_shipment_id: number
  etd: string
  scans: Array<{
    location: string
    date: string
    activity: string
    status: string
  }>
}

export async function POST(request: Request) {
  try {
    const payload: ShiprocketWebhookPayload = await request.json()

    console.log('[Shiprocket Webhook] Received:', {
      awb: payload.awb,
      status: payload.current_status,
      order_id: payload.order_id
    })

    // Find the order by order_number (Shiprocket's order_id is our order_number)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_number', payload.order_id)
      .single()

    if (orderError || !order) {
      console.warn('[Shiprocket Webhook] Order not found:', payload.order_id)
      // Return 200 to acknowledge receipt even if order not found
      return NextResponse.json({ success: true, message: 'Order not found' })
    }

    // Fetch store info for email notifications
    const { data: store } = await supabase
      .from('stores')
      .select('name, contact_email')
      .eq('id', order.store_id)
      .single()

    // Map Shiprocket status to our status
    const mappedStatus = mapShiprocketStatus(payload.current_status)

    // Build update object
    const updateData: Record<string, unknown> = {
      fulfillment_status: mappedStatus
    }

    // Add timestamp based on status
    if (mappedStatus === 'shipped' && payload.current_status.toUpperCase() === 'SHIPPED') {
      updateData.shipped_at = new Date().toISOString()
    } else if (mappedStatus === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)

    if (updateError) {
      console.error('[Shiprocket Webhook] Update error:', updateError)
    }

    // Log the event
    await supabase.from('shipment_events').insert({
      order_id: order.id,
      awb_code: payload.awb,
      event_date: payload.current_timestamp || new Date().toISOString(),
      status: payload.current_status,
      activity: getActivityDescription(payload.current_status),
      location: payload.scans?.[0]?.location || ''
    })

    // Store all scan events if provided
    if (payload.scans && payload.scans.length > 0) {
      // Get existing events to avoid duplicates
      const { data: existingEvents } = await supabase
        .from('shipment_events')
        .select('event_date, status')
        .eq('order_id', order.id)

      const existingSet = new Set(
        existingEvents?.map((e) => `${e.event_date}-${e.status}`) || []
      )

      const newEvents = payload.scans
        .filter((scan) => {
          const key = `${scan.date}-${scan.status}`
          return !existingSet.has(key)
        })
        .map((scan) => ({
          order_id: order.id,
          awb_code: payload.awb,
          event_date: scan.date,
          status: scan.status,
          activity: scan.activity,
          location: scan.location
        }))

      if (newEvents.length > 0) {
        await supabase.from('shipment_events').insert(newEvents)
      }
    }

    // Send email notification for important status changes
    const storeInfo = store ? { name: store.name, contact_email: store.contact_email } : undefined

    if (mappedStatus === 'shipped') {
      // Update tracking info from webhook
      await supabase
        .from('orders')
        .update({
          tracking_number: payload.awb,
          courier_name: payload.courier_name,
          estimated_delivery_date: payload.etd || null,
        })
        .eq('id', order.id)

      // Send email
      await sendOrderShippedEmail({
        ...order,
        tracking_number: payload.awb,
        courier_name: payload.courier_name,
        store: storeInfo,
      })

      // Send WhatsApp notification
      if (order.shipping_phone) {
        await sendOrderShippedWhatsApp({
          phone: order.shipping_phone,
          customerName: order.shipping_name || 'Customer',
          orderNumber: order.order_number,
          courierName: payload.courier_name,
          trackingNumber: payload.awb,
          estimatedDelivery: payload.etd || undefined
        })
      }

      console.log('[Shiprocket Webhook] Shipped notifications sent for order:', order.order_number)
    } else if (mappedStatus === 'out_for_delivery') {
      // Send WhatsApp notification for out for delivery
      if (order.shipping_phone) {
        await sendOutForDeliveryWhatsApp({
          phone: order.shipping_phone,
          customerName: order.shipping_name || 'Customer',
          orderNumber: order.order_number
        })
      }
      console.log('[Shiprocket Webhook] Out for delivery notification sent for order:', order.order_number)
    } else if (mappedStatus === 'delivered') {
      // Send email
      await sendOrderDeliveredEmail({
        ...order,
        store: storeInfo,
      })

      // Send WhatsApp notification
      if (order.shipping_phone) {
        await sendOrderDeliveredWhatsApp({
          phone: order.shipping_phone,
          customerName: order.shipping_name || 'Customer',
          orderNumber: order.order_number,
          storeName: storeInfo?.name || 'Store'
        })
      }

      console.log('[Shiprocket Webhook] Delivered notifications sent for order:', order.order_number)
    }

    console.log('[Shiprocket Webhook] Processed successfully:', {
      order_id: order.id,
      new_status: mappedStatus
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Shiprocket Webhook] Error:', error)
    // Return 200 to prevent Shiprocket from retrying
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    })
  }
}

function getActivityDescription(status: string): string {
  const descriptions: Record<string, string> = {
    NEW: 'Order created',
    'AWB ASSIGNED': 'Tracking number assigned',
    'LABEL GENERATED': 'Shipping label generated',
    'PICKUP SCHEDULED': 'Pickup scheduled',
    'PICKUP QUEUED': 'Pickup queued',
    MANIFESTED: 'Shipment manifested',
    SHIPPED: 'Package shipped',
    'IN TRANSIT': 'Package in transit',
    'OUT FOR DELIVERY': 'Out for delivery',
    DELIVERED: 'Package delivered',
    CANCELED: 'Shipment cancelled',
    'RTO INITIATED': 'Return to origin initiated',
    'RTO DELIVERED': 'Returned to origin',
    LOST: 'Package lost',
    DAMAGED: 'Package damaged'
  }

  return descriptions[status.toUpperCase()] || status
}
