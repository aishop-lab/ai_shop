import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { OrderUpdateRequest } from '@/lib/types/dashboard'
import {
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
} from '@/lib/email/order-confirmation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ orderId: string }>
}

// Validation schema for order updates
const orderUpdateSchema = z.object({
  order_status: z.enum([
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
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

    const { data: order, error } = await supabase
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

    return NextResponse.json({ order })

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
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('order_status, payment_status')
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
      const validTransitions = getValidStatusTransitions(currentOrder.order_status)
      if (!validTransitions.includes(order_status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${currentOrder.order_status} to ${order_status}`,
            validTransitions
          },
          { status: 400 }
        )
      }

      updates.order_status = order_status

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
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single()

    if (updateError) throw updateError

    // Send email notifications based on status change
    if (order_status === 'shipped' && order.tracking_number) {
      const { data: store } = await supabase
        .from('stores')
        .select('name, contact_email')
        .eq('id', order.store_id)
        .single()

      await sendOrderShippedEmail({
        ...order,
        store: store ? { name: store.name, contact_email: store.contact_email } : undefined,
      })
    }

    if (order_status === 'delivered') {
      const { data: store } = await supabase
        .from('stores')
        .select('name, contact_email')
        .eq('id', order.store_id)
        .single()

      await sendOrderDeliveredEmail({
        ...order,
        store: store ? { name: store.name, contact_email: store.contact_email } : undefined,
      })
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
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderId } = await params

    // Check if order exists and can be cancelled
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('order_status, payment_status')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.order_status)) {
      return NextResponse.json(
        { error: `Cannot cancel order with status: ${order.order_status}` },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    // TODO: If payment was made, initiate refund
    // TODO: Restore inventory

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully'
    })

  } catch (error) {
    console.error('Order delete error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}

// Helper function to get valid status transitions
function getValidStatusTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'shipped', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: []
  }

  return transitions[currentStatus] || []
}
