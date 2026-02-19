import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getStoreStripeCredentials } from '@/lib/payment/stripe'
import { decrypt } from '@/lib/encryption'
import { reduceInventory, releaseReservation, restoreInventory } from '@/lib/orders/inventory'
import {
  sendOrderConfirmationEmail,
  sendRefundProcessedEmail,
} from '@/lib/email/order-confirmation'
import { sendOrderConfirmationWhatsApp } from '@/lib/whatsapp/msg91'
import { sendNewOrderMerchantEmail, sendShipmentFailedEmail } from '@/lib/email/merchant-notifications'
import { autoCreateShipmentForStore } from '@/lib/shipping/provider-manager'
import { createNotification } from '@/lib/notifications'
import type { OrderItem } from '@/lib/types/order'

/**
 * Get the webhook secret to use for verification.
 * Tries store-specific secret based on metadata, falls back to platform secret.
 */
async function getWebhookSecret(storeId?: string): Promise<string | null> {
  if (storeId) {
    const { data: store } = await getSupabaseAdmin()
      .from('stores')
      .select('stripe_webhook_secret_encrypted, stripe_credentials_verified')
      .eq('id', storeId)
      .single()

    if (store?.stripe_webhook_secret_encrypted && store.stripe_credentials_verified) {
      try {
        return decrypt(store.stripe_webhook_secret_encrypted)
      } catch (err) {
        console.error('Failed to decrypt store Stripe webhook secret:', err)
      }
    }
  }

  return process.env.STRIPE_WEBHOOK_SECRET || null
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Stripe Webhook: Missing signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // We need to construct the event first to get the store_id from metadata.
    // But we need the secret to construct the event. Try platform secret first.
    const platformSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event: Stripe.Event | null = null
    let verifiedWithPlatform = false

    // Try platform secret first
    if (platformSecret) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
          apiVersion: '2026-01-28.clover',
        })
        event = stripe.webhooks.constructEvent(body, signature, platformSecret)
        verifiedWithPlatform = true
      } catch {
        // Platform secret didn't work, will try store-specific below
      }
    }

    if (!event) {
      // Parse the body to get store_id for store-specific secret lookup
      let rawEvent: any
      try {
        rawEvent = JSON.parse(body)
      } catch {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
      }

      const storeId = rawEvent?.data?.object?.metadata?.store_id
      if (!storeId) {
        return NextResponse.json({ error: 'Unable to verify webhook signature' }, { status: 400 })
      }

      const storeSecret = await getWebhookSecret(storeId)
      if (!storeSecret) {
        return NextResponse.json({ error: 'No webhook secret configured' }, { status: 500 })
      }

      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
          apiVersion: '2026-01-28.clover',
        })
        event = stripe.webhooks.constructEvent(body, signature, storeSecret)
      } catch (err) {
        console.error('Stripe Webhook: Invalid signature (tried both platform and store secrets)')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    console.log('Stripe webhook received:', event.type)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      default:
        console.log('Unhandled Stripe webhook event:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.session.completed event
 * Marks order as paid, reduces inventory, sends notifications, auto-creates shipment
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.order_id
  const storeId = session.metadata?.store_id

  if (!orderId || !storeId) {
    console.error('Stripe Webhook: Missing order_id or store_id in metadata')
    return
  }

  console.log('Stripe checkout completed for order:', orderId)

  // Find order
  const { data: order, error: findError } = await getSupabaseAdmin()
    .from('orders')
    .select(`*, order_items (*)`)
    .eq('id', orderId)
    .single()

  if (findError || !order) {
    console.error('Order not found:', orderId)
    return
  }

  // Skip if already paid (idempotency)
  if (order.payment_status === 'paid') {
    console.log('Order already paid:', order.id)
    return
  }

  // Get payment intent ID
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id

  // Update order status
  const { error: updateError } = await getSupabaseAdmin()
    .from('orders')
    .update({
      payment_status: 'paid',
      order_status: 'confirmed',
      stripe_payment_intent_id: paymentIntentId || null,
      paid_at: new Date().toISOString(),
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

  // Get store and owner info
  const { data: store } = await getSupabaseAdmin()
    .from('stores')
    .select('name, owner_id, contact_email')
    .eq('id', order.store_id)
    .single()

  let merchantEmail: string | undefined
  if (store?.owner_id) {
    const { data: authUser } = await getSupabaseAdmin().auth.admin.getUserById(store.owner_id)
    merchantEmail = authUser?.user?.email || store.contact_email || undefined
  }

  // Send confirmation email to customer
  const orderWithStore = {
    ...order,
    order_items: orderItems,
    store: store ? { name: store.name } : undefined,
  }
  await sendOrderConfirmationEmail(orderWithStore as unknown as Parameters<typeof sendOrderConfirmationEmail>[0])

  // Send WhatsApp notification
  if (order.shipping_phone || order.phone) {
    await sendOrderConfirmationWhatsApp({
      phone: order.shipping_phone || order.phone,
      customerName: order.shipping_name || order.customer_name || 'Customer',
      orderNumber: order.order_number,
      totalAmount: order.total || order.total_amount,
      storeName: store?.name || 'Store',
      items: orderItems.map((item) => ({
        title: ((item as unknown as Record<string, unknown>).product_title || (item as unknown as Record<string, unknown>).title || 'Product') as string,
        quantity: item.quantity,
        price: item.unit_price,
      })),
    })
  }

  // Send merchant notification
  if (merchantEmail && store) {
    const shippingAddr = typeof order.shipping_address === 'string'
      ? JSON.parse(order.shipping_address)
      : (order.shipping_address || {})

    await sendNewOrderMerchantEmail({
      merchantEmail,
      storeName: store.name,
      orderNumber: order.order_number,
      customerName: order.shipping_name || order.customer_name || 'Customer',
      customerEmail: order.customer_email || order.email || '',
      customerPhone: order.shipping_phone || order.phone || undefined,
      items: orderItems.map((item) => ({
        product_title: ((item as unknown as Record<string, unknown>).product_title || (item as unknown as Record<string, unknown>).title || 'Product') as string,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: (item as unknown as Record<string, unknown>).total_price as number,
        sku: ((item as unknown as Record<string, unknown>).sku || undefined) as string | undefined,
      })),
      subtotal: order.subtotal || order.total || order.total_amount,
      shippingCost: order.shipping_cost || order.shipping_amount || 0,
      totalAmount: order.total || order.total_amount,
      shippingAddress: shippingAddr,
      paymentMethod: 'stripe',
      paymentStatus: 'paid',
    })
  }

  console.log('Stripe order confirmed:', order.order_number)

  // Auto-create shipment
  const shippingAddr = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : (order.shipping_address || {})

  autoCreateShipmentForStore(
    order.store_id,
    order.id,
    {
      orderNumber: order.order_number,
      customerName: order.shipping_name || order.customer_name || 'Customer',
      customerPhone: order.shipping_phone || order.phone || '',
      customerEmail: order.customer_email || order.email,
      deliveryAddress: `${shippingAddr.address_line1 || shippingAddr.address || ''}${shippingAddr.address_line2 ? ', ' + shippingAddr.address_line2 : ''}`,
      deliveryCity: shippingAddr.city || '',
      deliveryState: shippingAddr.state || '',
      deliveryPincode: shippingAddr.pincode || shippingAddr.zip || '',
      items: orderItems.map((item) => ({
        name: ((item as unknown as Record<string, unknown>).product_title || (item as unknown as Record<string, unknown>).title || 'Product') as string,
        sku: item.variant_sku || item.product_id,
        quantity: item.quantity,
        price: item.unit_price,
      })),
      orderValue: order.total || order.total_amount,
      paymentMode: 'prepaid',
    }
  )
    .then(async (result) => {
      if (result.success && result.provider !== 'self') {
        console.log(`[AutoShipment] Shipment created for Stripe order ${order.order_number}`)
        if (result.awbCode) {
          await getSupabaseAdmin()
            .from('orders')
            .update({
              shipping_provider: result.provider,
              awb_code: result.awbCode,
              courier_name: result.courierName,
              shiprocket_shipment_id: result.shipmentId ? parseInt(result.shipmentId) : null,
            })
            .eq('id', order.id)
        }
      } else if (result.provider === 'self') {
        await getSupabaseAdmin()
          .from('orders')
          .update({ shipping_provider: 'self' })
          .eq('id', order.id)
      } else {
        console.error(`[AutoShipment] Failed for Stripe order ${order.order_number}:`, result.error)
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
              attempts: result.attempts,
            },
          })
        }
        if (merchantEmail && store) {
          await sendShipmentFailedEmail({
            merchantEmail,
            storeName: store.name,
            orderNumber: order.order_number,
            customerName: order.shipping_name || order.customer_name || 'Customer',
            error: result.error || 'Unknown error',
            attempts: result.attempts || 0,
          })
        }
      }
    })
    .catch((err) => {
      console.error(`[AutoShipment] Unexpected error for Stripe order ${order.order_number}:`, err)
    })
}

/**
 * Handle checkout.session.expired event
 * Cancels the order and releases inventory
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.order_id

  if (!orderId) {
    console.error('Stripe Webhook: Missing order_id in expired session metadata')
    return
  }

  console.log('Stripe checkout expired for order:', orderId)

  const { data: order, error: findError } = await getSupabaseAdmin()
    .from('orders')
    .select('id, payment_status')
    .eq('id', orderId)
    .single()

  if (findError || !order) {
    console.error('Order not found for expired session:', orderId)
    return
  }

  // Skip if already paid or cancelled
  if (order.payment_status === 'paid' || order.payment_status === 'failed') {
    return
  }

  // Cancel the order
  await getSupabaseAdmin()
    .from('orders')
    .update({
      payment_status: 'failed',
      order_status: 'cancelled',
      payment_error: 'Stripe checkout session expired',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  // Release inventory reservation
  await releaseReservation(order.id)

  console.log('Order cancelled due to Stripe session expiry:', orderId)
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id

  if (!paymentIntentId) {
    console.error('Stripe Webhook: Missing payment_intent in refund charge')
    return
  }

  console.log('Stripe charge refunded:', charge.id)

  // Find order by payment intent ID
  const { data: order, error: findError } = await getSupabaseAdmin()
    .from('orders')
    .select('*, order_items(*)')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single()

  if (findError || !order) {
    console.error('Order not found for Stripe payment intent:', paymentIntentId)
    return
  }

  const refundAmount = (charge.amount_refunded || 0) / 100
  const isFullRefund = refundAmount >= (order.total || order.total_amount)

  // Create refund record
  await getSupabaseAdmin().from('refunds').insert({
    order_id: order.id,
    amount: refundAmount,
    status: 'processed',
    created_at: new Date().toISOString(),
    processed_at: new Date().toISOString(),
  })

  if (isFullRefund) {
    await getSupabaseAdmin()
      .from('orders')
      .update({
        payment_status: 'refunded',
        order_status: 'refunded',
      })
      .eq('id', order.id)

    // Restore inventory
    const orderItems = (order.order_items || []) as OrderItem[]
    await restoreInventory(
      orderItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }))
    )
  }

  // Send refund notification
  await sendRefundProcessedEmail(order, refundAmount)

  console.log('Stripe refund processed for order:', order.order_number)
}
