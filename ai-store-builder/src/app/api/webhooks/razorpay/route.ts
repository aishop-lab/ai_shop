import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '@/lib/payment/razorpay'
import { reduceInventory, releaseReservation, restoreInventory } from '@/lib/orders/inventory'
import {
  sendOrderConfirmationEmail,
  sendRefundProcessedEmail,
} from '@/lib/email/order-confirmation'
import { sendOrderConfirmationWhatsApp } from '@/lib/whatsapp/msg91'
import { sendNewOrderMerchantEmail, sendShipmentFailedEmail } from '@/lib/email/merchant-notifications'
import { autoCreateShipment } from '@/lib/shipping/shiprocket'
import { createNotification } from '@/lib/notifications'
import type {
  RazorpayWebhookEvent,
  RazorpayPayment,
  RazorpayRefund,
  Order,
  OrderItem,
} from '@/lib/types/order'

// Initialize Supabase with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      console.error('Webhook: Missing signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Webhook: Missing webhook secret')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const isValid = verifyWebhookSignature(body, signature, webhookSecret)

    if (!isValid) {
      console.error('Webhook: Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Parse event
    const event: RazorpayWebhookEvent = JSON.parse(body)

    console.log('Webhook received:', event.event)

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment!.entity)
        break

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment!.entity)
        break

      case 'refund.created':
        await handleRefundCreated(event.payload.refund!.entity)
        break

      case 'refund.processed':
        await handleRefundProcessed(event.payload.refund!.entity)
        break

      case 'refund.failed':
        await handleRefundFailed(event.payload.refund!.entity)
        break

      default:
        console.log('Unhandled webhook event:', event.event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle payment.captured event
 * This is the primary success path for payments
 */
async function handlePaymentCaptured(payment: RazorpayPayment): Promise<void> {
  const razorpayOrderId = payment.order_id

  console.log('Payment captured:', payment.id, 'for order:', razorpayOrderId)

  // Find order by Razorpay order ID
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select(
      `
      *,
      order_items (*)
    `
    )
    .eq('razorpay_order_id', razorpayOrderId)
    .single()

  if (findError || !order) {
    console.error('Order not found for Razorpay order:', razorpayOrderId)
    return
  }

  // Skip if already paid (idempotency)
  if (order.payment_status === 'paid') {
    console.log('Order already paid:', order.id)
    return
  }

  // Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      order_status: 'confirmed',
      razorpay_payment_id: payment.id,
      paid_at: new Date(payment.created_at * 1000).toISOString(),
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('Failed to update order:', updateError)
    return
  }

  // Reduce inventory
  const orderItems = (order.order_items || []) as OrderItem[]
  await reduceInventory(
    orderItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }))
  )

  // Release inventory reservation
  await releaseReservation(order.id)

  // Get store and owner info for notifications
  const { data: store } = await supabase
    .from('stores')
    .select('name, owner_id, contact_email')
    .eq('id', order.store_id)
    .single()

  // Get merchant email from auth
  let merchantEmail: string | undefined
  if (store?.owner_id) {
    const { data: authUser } = await supabase.auth.admin.getUserById(store.owner_id)
    merchantEmail = authUser?.user?.email || store.contact_email || undefined
  }

  // Send confirmation email to customer
  const orderWithStore: Order & { store?: { name: string } } = {
    ...order,
    order_items: orderItems,
    store: store ? { name: store.name } : undefined,
  }

  await sendOrderConfirmationEmail(orderWithStore)

  // Send WhatsApp notification to customer (if phone provided)
  if (order.shipping_phone) {
    await sendOrderConfirmationWhatsApp({
      phone: order.shipping_phone,
      customerName: order.shipping_name || order.customer_email?.split('@')[0] || 'Customer',
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
      storeName: store?.name || 'Store',
      items: orderItems.map((item: OrderItem) => ({
        title: item.product_title || item.title || 'Product',
        quantity: item.quantity,
        price: item.unit_price
      }))
    })
  }

  // Send new order notification to merchant
  if (merchantEmail && store) {
    const shippingAddress = {
      name: order.shipping_name || '',
      address_line1: order.shipping_address_line1 || '',
      address_line2: order.shipping_address_line2 || undefined,
      city: order.shipping_city || '',
      state: order.shipping_state || '',
      pincode: order.shipping_pincode || '',
      country: order.shipping_country || 'India',
      phone: order.shipping_phone || ''
    }

    await sendNewOrderMerchantEmail({
      merchantEmail,
      storeName: store.name,
      orderNumber: order.order_number,
      customerName: order.shipping_name || order.customer_email || 'Customer',
      customerEmail: order.customer_email || '',
      customerPhone: order.shipping_phone || undefined,
      items: orderItems.map((item: OrderItem) => ({
        product_title: item.product_title || item.title || 'Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        sku: item.sku || undefined
      })),
      subtotal: order.subtotal || order.total_amount,
      shippingCost: order.shipping_cost || 0,
      totalAmount: order.total_amount,
      shippingAddress,
      paymentMethod: order.payment_method || 'online',
      paymentStatus: 'paid'
    })
  }

  console.log('Order confirmed:', order.order_number)

  // AUTO-CREATE SHIPROCKET SHIPMENT
  // This runs asynchronously to not block the webhook response
  autoCreateShipment(supabase, order.id, { courier_preference: 'cheapest' })
    .then(async (result) => {
      if (result.success) {
        console.log(`[AutoShipment] Shipment created for order ${order.order_number}:`, {
          awb: result.awb_code,
          courier: result.courier_name
        })
      } else {
        // All retries failed - notify merchant
        console.error(`[AutoShipment] Failed for order ${order.order_number}:`, result.error)

        // Create dashboard notification
        if (store?.owner_id) {
          await createNotification({
            store_id: order.store_id,
            user_id: store.owner_id,
            type: 'system',
            title: 'Shipment Creation Failed',
            message: `Could not auto-create shipment for order ${order.order_number}. Please create it manually.`,
            priority: 'high',
            data: {
              order_id: order.id,
              order_number: order.order_number,
              error: result.error,
              attempts: result.attempts
            }
          })
        }

        // Send email notification to merchant
        if (merchantEmail && store) {
          await sendShipmentFailedEmail({
            merchantEmail,
            storeName: store.name,
            orderNumber: order.order_number,
            customerName: order.shipping_name || order.customer_email || 'Customer',
            error: result.error || 'Unknown error',
            attempts: result.attempts || 0
          })
        }
      }
    })
    .catch((err) => {
      console.error(`[AutoShipment] Unexpected error for order ${order.order_number}:`, err)
    })
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payment: RazorpayPayment): Promise<void> {
  const razorpayOrderId = payment.order_id

  console.log('Payment failed:', payment.id, 'for order:', razorpayOrderId)

  // Find order by Razorpay order ID
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('id, order_items(*)')
    .eq('razorpay_order_id', razorpayOrderId)
    .single()

  if (findError || !order) {
    console.error('Order not found for Razorpay order:', razorpayOrderId)
    return
  }

  // Update order status
  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      order_status: 'cancelled',
      payment_error: payment.error_description || 'Payment failed',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  // Release inventory reservation
  await releaseReservation(order.id)

  console.log('Order cancelled due to payment failure:', order.id)
}

/**
 * Handle refund.created event
 */
async function handleRefundCreated(refund: RazorpayRefund): Promise<void> {
  const paymentId = refund.payment_id

  console.log('Refund created:', refund.id, 'for payment:', paymentId)

  // Find order by payment ID
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('razorpay_payment_id', paymentId)
    .single()

  if (findError || !order) {
    console.error('Order not found for payment:', paymentId)
    return
  }

  // Create refund record
  await supabase.from('refunds').insert({
    order_id: order.id,
    razorpay_refund_id: refund.id,
    amount: refund.amount / 100, // Convert from paise
    status: 'pending',
    created_at: new Date(refund.created_at * 1000).toISOString(),
  })

  console.log('Refund record created for order:', order.order_number)
}

/**
 * Handle refund.processed event
 */
async function handleRefundProcessed(refund: RazorpayRefund): Promise<void> {
  const paymentId = refund.payment_id

  console.log('Refund processed:', refund.id, 'for payment:', paymentId)

  // Find order by payment ID
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('razorpay_payment_id', paymentId)
    .single()

  if (findError || !order) {
    console.error('Order not found for payment:', paymentId)
    return
  }

  const refundAmount = refund.amount / 100 // Convert from paise
  const isFullRefund = refundAmount >= order.total_amount

  // Update refund record
  await supabase
    .from('refunds')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('razorpay_refund_id', refund.id)

  // Update order status for full refunds
  if (isFullRefund) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'refunded',
        order_status: 'refunded',
      })
      .eq('id', order.id)

    // Restore inventory for full refunds
    const orderItems = (order.order_items || []) as OrderItem[]
    await restoreInventory(
      orderItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }))
    )
  }

  // Send refund notification email
  await sendRefundProcessedEmail(order, refundAmount)

  console.log('Refund completed for order:', order.order_number)
}

/**
 * Handle refund.failed event
 */
async function handleRefundFailed(refund: RazorpayRefund): Promise<void> {
  console.log('Refund failed:', refund.id)

  // Update refund record
  await supabase
    .from('refunds')
    .update({
      status: 'failed',
    })
    .eq('razorpay_refund_id', refund.id)
}
