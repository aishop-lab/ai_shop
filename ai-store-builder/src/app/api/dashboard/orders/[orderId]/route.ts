import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'
import type { OrderUpdateRequest } from '@/lib/types/dashboard'
import {
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
} from '@/lib/email/order-confirmation'
import { restoreInventory, releaseReservation } from '@/lib/orders/inventory'
import { refundPayment } from '@/lib/payment/razorpay'

interface RouteParams {
  params: Promise<{ orderId: string }>
}

// Validation schema for order updates - uses database fulfillment_status values
const orderUpdateSchema = z.object({
  order_status: z.enum([
    'unfulfilled',
    'processing',
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'returned',
    'cancelled'
  ]).optional(),
  tracking_number: z.string().optional(),
  courier_name: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderId } = await params

    const { data: order, error } = await getSupabaseAdmin()
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Map database column names to Order type expected by frontend
    const mappedOrder = {
      ...order,
      customer_email: order.email,
      customer_phone: order.phone,
      shipping_cost: order.shipping_amount,
      total_amount: order.total,
      order_status: order.fulfillment_status,
      order_items: Array.isArray(order.order_items)
        ? order.order_items.map((item: Record<string, unknown>) => ({
            ...item,
            product_title: item.title,
            product_image: item.image_url,
            total_price: item.total,
          }))
        : [],
    }

    return NextResponse.json({ order: mappedOrder })

  } catch (error) {
    console.error('Order fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderId } = await params
    const body = await request.json()

    // Validate request body
    const validationResult = orderUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { order_status, tracking_number, courier_name, notes } = validationResult.data

    // Get current order to check status transition validity
    // Database column is 'fulfillment_status', not 'order_status'
    const { data: currentOrder, error: fetchError } = await getSupabaseAdmin()
      .from('orders')
      .select('fulfillment_status, payment_status')
      .eq('id', orderId)
      .single()

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (order_status) {
      // Validate status transitions
      const validTransitions = getValidStatusTransitions(currentOrder.fulfillment_status)
      if (!validTransitions.includes(order_status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${currentOrder.fulfillment_status} to ${order_status}`,
            validTransitions
          },
          { status: 400 }
        )
      }

      // Database column is 'fulfillment_status'
      updates.fulfillment_status = order_status

      // Set timestamps based on status
      switch (order_status) {
        case 'shipped':
          updates.shipped_at = new Date().toISOString()
          break
        case 'delivered':
          updates.delivered_at = new Date().toISOString()
          break
        case 'cancelled':
          updates.cancelled_at = new Date().toISOString()
          break
      }
    }

    if (tracking_number !== undefined) updates.tracking_number = tracking_number
    if (courier_name !== undefined) updates.courier_name = courier_name
    if (notes !== undefined) updates.notes = notes

    // Update order
    const { data: order, error: updateError } = await getSupabaseAdmin()
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single()

    if (updateError) throw updateError

    // Get store info for emails
    const { data: store } = await getSupabaseAdmin()
      .from('stores')
      .select('name, contact_email')
      .eq('id', order.store_id)
      .single()

    const storeInfo = store ? { name: store.name, contact_email: store.contact_email } : undefined

    // Handle status-specific actions
    if (order_status === 'shipped' && order.tracking_number) {
      await sendOrderShippedEmail({
        ...order,
        store: storeInfo,
      })
    }

    if (order_status === 'delivered') {
      await sendOrderDeliveredEmail({
        ...order,
        store: storeInfo,
      })
    }

    // Handle cancellation: refund + inventory restoration
    if (order_status === 'cancelled') {
      let refundResult = null

      // If payment was made (not COD pending), initiate full refund
      if (currentOrder.payment_status === 'paid' && order.razorpay_payment_id) {
        try {
          refundResult = await refundPayment(
            order.razorpay_payment_id,
            undefined,
            { order_id: orderId, reason: 'Order cancelled' }
          )

          // Create refund record
          await getSupabaseAdmin().from('refunds').insert({
            order_id: orderId,
            store_id: order.store_id,
            razorpay_refund_id: refundResult.id,
            amount: order.total,
            reason: 'Order cancelled by seller',
            status: 'processed',
            refund_type: 'full',
            processed_at: new Date().toISOString(),
          })

          // Update payment status to refunded
          await getSupabaseAdmin()
            .from('orders')
            .update({ payment_status: 'refunded' })
            .eq('id', orderId)
        } catch (refundError) {
          console.error('Auto-refund failed during status update:', refundError)
        }
      }

      // Restore inventory
      const orderItems = (order.order_items || []).map((item: { product_id: string; variant_id?: string; quantity: number }) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
      }))

      if (orderItems.length > 0) {
        await restoreInventory(orderItems)
      }

      // Release reservations
      await releaseReservation(orderId)

      // Send cancellation email
      await sendOrderCancelledEmail(
        { ...order, store: storeInfo },
        refundResult ? 'Your payment will be refunded within 5-7 business days.' : undefined
      )
    }

    return NextResponse.json({
      order,
      message: `Order status updated to ${order_status || 'updated'}`
    })

  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// Delete order (soft delete - mark as cancelled)
// Handles auto-refund for paid orders and inventory restoration
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderId } = await params

    // Fetch full order with items for inventory restoration
    const { data: order, error: fetchError } = await getSupabaseAdmin()
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Can only cancel unfulfilled, processing, or packed orders (using fulfillment_status column)
    if (!['unfulfilled', 'processing', 'packed'].includes(order.fulfillment_status)) {
      return NextResponse.json(
        { error: `Cannot cancel order with status: ${order.fulfillment_status}` },
        { status: 400 }
      )
    }

    let refundResult = null
    let newPaymentStatus = order.payment_status

    // If payment was made (not COD pending), initiate full refund
    if (order.payment_status === 'paid' && order.razorpay_payment_id) {
      try {
        // Initiate full refund via Razorpay
        refundResult = await refundPayment(
          order.razorpay_payment_id,
          undefined, // Full refund (no amount = full)
          { order_id: orderId, reason: 'Order cancelled' }
        )

        // Create refund record in database
        await getSupabaseAdmin().from('refunds').insert({
          order_id: orderId,
          store_id: order.store_id,
          razorpay_refund_id: refundResult.id,
          amount: order.total,
          reason: 'Order cancelled by seller',
          status: 'processed',
          refund_type: 'full',
          processed_at: new Date().toISOString(),
        })

        newPaymentStatus = 'refunded'
      } catch (refundError) {
        console.error('Auto-refund failed:', refundError)
        // Continue with cancellation even if refund fails
        // The seller can manually process the refund later
      }
    }

    // Update order status (database column is 'fulfillment_status')
    const { error: updateError } = await getSupabaseAdmin()
      .from('orders')
      .update({
        fulfillment_status: 'cancelled',
        payment_status: newPaymentStatus,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    // Restore inventory for all order items
    const orderItems = (order.order_items || []).map((item: { product_id: string; variant_id?: string; quantity: number }) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
    }))

    if (orderItems.length > 0) {
      await restoreInventory(orderItems)
    }

    // Release any pending inventory reservations
    await releaseReservation(orderId)

    // Fetch store info for email
    const { data: store } = await getSupabaseAdmin()
      .from('stores')
      .select('name, contact_email')
      .eq('id', order.store_id)
      .single()

    // Send cancellation email to customer
    await sendOrderCancelledEmail(
      {
        ...order,
        store: store ? { name: store.name, contact_email: store.contact_email } : undefined,
      },
      refundResult ? 'Your payment will be refunded within 5-7 business days.' : undefined
    )

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      refunded: !!refundResult,
      refund_id: refundResult?.id,
      inventory_restored: orderItems.length > 0,
    })

  } catch (error) {
    console.error('Order cancellation error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}

// Helper function to get valid status transitions (using database fulfillment_status values)
function getValidStatusTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    unfulfilled: ['processing', 'packed', 'shipped', 'cancelled'],
    processing: ['packed', 'shipped', 'cancelled'],
    packed: ['shipped', 'cancelled'],
    shipped: ['out_for_delivery', 'delivered', 'returned', 'cancelled'],
    out_for_delivery: ['delivered', 'returned'],
    delivered: ['returned'],
    returned: [],
    cancelled: []
  }

  return transitions[currentStatus] || []
}
