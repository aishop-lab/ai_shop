import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refundPayment } from '@/lib/payment/razorpay'
import { restoreInventory } from '@/lib/orders/inventory'
import { sendRefundProcessedEmail } from '@/lib/email/order-confirmation'
import { z } from 'zod'

const refundRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  notify_customer: z.boolean().default(true)
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = refundRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { amount, reason, notify_customer } = validationResult.data

    // Get the order with store info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        stores!inner (
          id,
          owner_id,
          name,
          contact_email
        ),
        order_items (*)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify ownership
    if (order.stores.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Validate order can be refunded
    if (order.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Order payment status is not paid. Cannot process refund.' },
        { status: 400 }
      )
    }

    if (amount > order.total_amount) {
      return NextResponse.json(
        { error: 'Refund amount exceeds order total' },
        { status: 400 }
      )
    }

    // Check for existing refunds
    const { data: existingRefunds } = await supabase
      .from('refunds')
      .select('amount, status')
      .eq('order_id', orderId)
      .in('status', ['pending', 'processed'])

    const totalRefunded = existingRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0

    if (totalRefunded + amount > order.total_amount) {
      return NextResponse.json(
        { error: `Total refund amount would exceed order total. Already refunded: ${totalRefunded}` },
        { status: 400 }
      )
    }

    // Check if Razorpay payment exists
    if (!order.razorpay_payment_id) {
      return NextResponse.json(
        { error: 'No Razorpay payment ID found. Cannot process refund for COD orders.' },
        { status: 400 }
      )
    }

    // Process Razorpay refund
    let razorpayRefund
    try {
      razorpayRefund = await refundPayment(
        order.razorpay_payment_id,
        amount,
        { reason, order_id: orderId }
      )
    } catch (rpError) {
      console.error('Razorpay refund failed:', rpError)
      return NextResponse.json(
        { error: 'Failed to process refund with payment provider' },
        { status: 500 }
      )
    }

    // Create refund record
    const { data: refundRecord, error: refundError } = await supabase
      .from('refunds')
      .insert({
        order_id: orderId,
        amount,
        reason,
        status: razorpayRefund.status === 'processed' ? 'processed' : 'pending',
        razorpay_refund_id: razorpayRefund.id,
        processed_at: razorpayRefund.status === 'processed' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (refundError) {
      console.error('Failed to create refund record:', refundError)
      // Note: Razorpay refund was already processed, so we should still return success
      // but log the error for manual reconciliation
    }

    // Determine if this is a full refund
    const isFullRefund = amount >= order.total_amount - totalRefunded
    const newPaymentStatus = isFullRefund ? 'refunded' : 'paid'

    // Update order payment status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: newPaymentStatus,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to update order status:', updateError)
    }

    // If full refund, restore inventory
    if (isFullRefund && order.order_items && order.order_items.length > 0) {
      try {
        await restoreInventory(order.order_items)
      } catch (invError) {
        console.error('Failed to restore inventory:', invError)
        // Non-critical error, continue
      }
    }

    // Send email notification
    if (notify_customer) {
      try {
        await sendRefundProcessedEmail(
          {
            ...order,
            store: {
              name: order.stores.name,
              contact_email: order.stores.contact_email
            }
          },
          amount
        )
      } catch (emailError) {
        console.error('Failed to send refund email:', emailError)
        // Non-critical error, continue
      }
    }

    return NextResponse.json({
      success: true,
      refund: refundRecord || {
        id: razorpayRefund.id,
        order_id: orderId,
        amount,
        reason,
        status: razorpayRefund.status,
        razorpay_refund_id: razorpayRefund.id
      },
      message: `Refund of ${amount} processed successfully`
    })

  } catch (error) {
    console.error('Refund API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: Get refunds for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the order to verify ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('store_id, stores!inner(owner_id)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify ownership
    const storeData = order.stores as unknown as { owner_id: string }
    if (storeData.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get refunds for this order
    const { data: refunds, error: refundsError } = await supabase
      .from('refunds')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (refundsError) {
      return NextResponse.json({ error: 'Failed to fetch refunds' }, { status: 500 })
    }

    return NextResponse.json({ refunds })

  } catch (error) {
    console.error('Get refunds error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
