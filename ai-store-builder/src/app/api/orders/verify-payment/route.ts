import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyRazorpaySignature, getStoreRazorpayCredentials } from '@/lib/payment/razorpay'
import { reduceInventory, releaseReservation } from '@/lib/orders/inventory'
import { sendOrderConfirmationEmail } from '@/lib/email/order-confirmation'
import type { VerifyPaymentResponse, Order, OrderItem } from '@/lib/types/order'

// Validation schema for payment verification
const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Razorpay order ID required'),
  razorpay_payment_id: z.string().min(1, 'Razorpay payment ID required'),
  razorpay_signature: z.string().min(1, 'Razorpay signature required'),
  order_id: z.string().uuid('Invalid order ID'),
})

export async function POST(
  request: NextRequest
): Promise<NextResponse<VerifyPaymentResponse>> {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = verifyPaymentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
        },
        { status: 400 }
      )
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
    } = validationResult.data

    // 1. Get order details first (we need store_id to fetch credentials)
    const { data: order, error: orderError } = await getSupabaseAdmin()
      .from('orders')
      .select(
        `
        *,
        order_items (*)
      `
      )
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', order_id)
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // 2. Fetch store-specific Razorpay credentials (if configured)
    const storeCredentials = await getStoreRazorpayCredentials(order.store_id, getSupabaseAdmin())

    // 3. Verify Razorpay signature (using store credentials if available)
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      storeCredentials?.key_secret
    )

    if (!isValid) {
      console.error('Invalid payment signature for order:', order_id)
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // 4. Verify order matches Razorpay order
    if (order.razorpay_order_id !== razorpay_order_id) {
      console.error('Order ID mismatch:', {
        expected: order.razorpay_order_id,
        received: razorpay_order_id,
      })
      return NextResponse.json(
        { success: false, error: 'Order mismatch' },
        { status: 400 }
      )
    }

    // 5. Check if already paid (idempotency)
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
      })
    }

    // 6. Update order status
    const { error: updateError } = await getSupabaseAdmin()
      .from('orders')
      .update({
        payment_status: 'paid',
        fulfillment_status: 'processing',
        metadata: { razorpay_payment_id },
        paid_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      )
    }

    // 7. Reduce inventory (variant-aware)
    const orderItems = (order.order_items || []) as OrderItem[]
    await reduceInventory(
      orderItems.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id || undefined,
        quantity: item.quantity,
      }))
    )

    // 8. Release inventory reservation
    await releaseReservation(order_id)

    // 9. Send confirmation email
    const orderWithStore: Order & { store?: { name: string } } = {
      ...order,
      order_items: orderItems,
    }

    // Get store name for email
    const { data: store } = await getSupabaseAdmin()
      .from('stores')
      .select('name')
      .eq('id', order.store_id)
      .single()

    if (store) {
      orderWithStore.store = { name: store.name }
    }

    await sendOrderConfirmationEmail(orderWithStore as unknown as Parameters<typeof sendOrderConfirmationEmail>[0])

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Payment verification failed' },
      { status: 500 }
    )
  }
}
