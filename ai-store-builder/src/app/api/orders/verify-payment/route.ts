import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { verifyRazorpaySignature } from '@/lib/payment/razorpay'
import { reduceInventory, releaseReservation } from '@/lib/orders/inventory'
import { sendOrderConfirmationEmail } from '@/lib/email/order-confirmation'
import type { VerifyPaymentResponse, Order, OrderItem } from '@/lib/types/order'

// Initialize Supabase with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    // 1. Verify Razorpay signature
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )

    if (!isValid) {
      console.error('Invalid payment signature for order:', order_id)
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // 2. Get order details
    const { data: order, error: orderError } = await supabase
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

    // 3. Verify order matches Razorpay order
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

    // 4. Check if already paid (idempotency)
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
      })
    }

    // 5. Update order status
    const { error: updateError } = await supabase
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

    // 6. Reduce inventory (variant-aware)
    const orderItems = (order.order_items || []) as OrderItem[]
    await reduceInventory(
      orderItems.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id || undefined,
        quantity: item.quantity,
      }))
    )

    // 7. Release inventory reservation
    await releaseReservation(order_id)

    // 8. Send confirmation email
    const orderWithStore: Order & { store?: { name: string } } = {
      ...order,
      order_items: orderItems,
    }

    // Get store name for email
    const { data: store } = await supabase
      .from('stores')
      .select('name')
      .eq('id', order.store_id)
      .single()

    if (store) {
      orderWithStore.store = { name: store.name }
    }

    await sendOrderConfirmationEmail(orderWithStore)

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
