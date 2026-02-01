import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { validateCartItems } from '@/lib/cart/validation'
import { calculateCartTotal } from '@/lib/cart/calculations'
import { createRazorpayOrder } from '@/lib/payment/razorpay'
import { reserveInventory } from '@/lib/orders/inventory'
import { sendOrderConfirmationEmail } from '@/lib/email/order-confirmation'
import { sendShipmentFailedEmail } from '@/lib/email/merchant-notifications'
import { autoCreateShipment } from '@/lib/shipping/shiprocket'
import { createNotification } from '@/lib/notifications'
import type { StoreSettings } from '@/lib/types/store'
import type { CreateOrderResponse, ShippingAddress } from '@/lib/types/order'

// Initialize Supabase with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Validation schema for order creation (variant-aware)
const createOrderSchema = z.object({
  store_id: z.string().uuid('Invalid store ID'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Invalid product ID'),
        variant_id: z.string().uuid('Invalid variant ID').optional(),
        quantity: z.number().int().positive('Quantity must be positive'),
      })
    )
    .min(1, 'Cart cannot be empty'),
  shipping_address: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(10, 'Valid phone number required'),
    address_line1: z.string().min(1, 'Address is required'),
    address_line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().min(5, 'Valid pincode required'),
    country: z.string().default('India'),
  }),
  customer_details: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email required'),
    phone: z.string().min(10, 'Valid phone number required'),
  }),
  payment_method: z.enum(['razorpay', 'cod']),
})

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateOrderResponse>> {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = createOrderSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors.map((e) => e.message),
        },
        { status: 400 }
      )
    }

    const {
      store_id,
      items,
      shipping_address,
      customer_details,
      payment_method,
    } = validationResult.data

    // 1. Validate cart items
    const { valid, validatedItems, errors } = await validateCartItems(
      store_id,
      items
    )

    if (!valid || validatedItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cart validation failed',
          details: errors,
        },
        { status: 400 }
      )
    }

    // 2. Get store settings
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('settings, owner_id, name')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    const settings = (store.settings || {}) as StoreSettings

    // 3. Check if COD is allowed
    if (payment_method === 'cod' && !settings.shipping?.cod_enabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cash on Delivery is not available for this store',
        },
        { status: 400 }
      )
    }

    // 4. Calculate totals
    const totals = calculateCartTotal(validatedItems, settings, payment_method)

    // 5. Generate order ID and number
    const orderId = crypto.randomUUID()
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`

    // 6. Reserve inventory (prevents overselling) - variant-aware
    const reservationResult = await reserveInventory(
      items.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
      })),
      orderId
    )

    if (!reservationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: reservationResult.error || 'Failed to reserve inventory',
        },
        { status: 400 }
      )
    }

    // 7. Create order in database
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      order_number: orderNumber,
      store_id,
      customer_name: customer_details.name,
      email: customer_details.email,
      phone: customer_details.phone,
      shipping_address: shipping_address as ShippingAddress,
      subtotal: totals.subtotal,
      shipping_amount: totals.shipping,
      tax_amount: totals.tax,
      discount_amount: totals.discount,
      total: totals.total,
      payment_method,
      payment_status: 'pending',
      fulfillment_status: 'unfulfilled',
      is_cod: payment_method === 'cod',
      created_at: new Date().toISOString(),
    })

    if (orderError) {
      console.error('Order creation error:', orderError)
      return NextResponse.json(
        { success: false, error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // 8. Create order items (variant-aware)
    const orderItems = validatedItems.map((item) => {
      // Use variant image if available, otherwise product image
      const imageUrl = item.variant?.image?.url
        || item.product.images?.[0]?.url
        || null

      return {
        order_id: orderId,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        variant_attributes: item.variant_attributes || null,
        variant_sku: item.variant?.sku || null,
        title: item.product.title,
        image_url: imageUrl,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
      }
    })

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      // Clean up order if items failed
      await supabase.from('orders').delete().eq('id', orderId)
      return NextResponse.json(
        { success: false, error: 'Failed to create order items' },
        { status: 500 }
      )
    }

    // 9. Create Razorpay order (for online payment only)
    let razorpayOrder = null
    if (payment_method === 'razorpay') {
      try {
        razorpayOrder = await createRazorpayOrder(
          totals.total,
          'INR',
          orderNumber,
          {
            order_id: orderId,
            store_id,
            customer_email: customer_details.email,
          }
        )

        // Update order with Razorpay order ID
        await supabase
          .from('orders')
          .update({ razorpay_order_id: razorpayOrder.id })
          .eq('id', orderId)
      } catch (razorpayError) {
        console.error('Razorpay order creation failed:', razorpayError)
        // Clean up order and items
        await supabase.from('order_items').delete().eq('order_id', orderId)
        await supabase.from('orders').delete().eq('id', orderId)
        return NextResponse.json(
          { success: false, error: 'Failed to initialize payment' },
          { status: 500 }
        )
      }
    }

    // 10. For COD orders, mark as processing and send confirmation email
    if (payment_method === 'cod') {
      await supabase
        .from('orders')
        .update({
          fulfillment_status: 'processing',
        })
        .eq('id', orderId)

      // Send order confirmation email for COD orders
      try {
        await sendOrderConfirmationEmail({
          id: orderId,
          order_number: orderNumber,
          store_id,
          customer_name: customer_details.name,
          email: customer_details.email,  // Database column name
          phone: customer_details.phone,  // Database column name
          shipping_address: shipping_address as ShippingAddress,
          subtotal: totals.subtotal,
          shipping_amount: totals.shipping,  // Database column name
          tax_amount: totals.tax,
          discount_amount: totals.discount,
          total: totals.total,  // Database column name
          payment_method,
          payment_status: 'pending',
          fulfillment_status: 'processing',
          created_at: new Date().toISOString(),
          order_items: orderItems.map(item => ({
            id: crypto.randomUUID(),
            order_id: orderId,
            product_id: item.product_id,
            variant_id: item.variant_id,
            title: item.title,  // Database column name
            image_url: item.image_url,  // Database column name
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,  // Database column name
          })),
          store: { name: store.name },
        } as Record<string, unknown>)
        console.log('COD order confirmation email sent for:', orderNumber)
      } catch (emailError) {
        console.error('Failed to send COD order confirmation email:', emailError)
        // Don't fail the order if email fails
      }

      // AUTO-CREATE SHIPROCKET SHIPMENT FOR COD ORDERS
      // This runs asynchronously to not block the order response
      autoCreateShipment(supabase, orderId, { courier_preference: 'cheapest' })
        .then(async (result) => {
          if (result.success) {
            console.log(`[AutoShipment] COD shipment created for order ${orderNumber}:`, {
              awb: result.awb_code,
              courier: result.courier_name
            })
          } else {
            // All retries failed - notify merchant
            console.error(`[AutoShipment] Failed for COD order ${orderNumber}:`, result.error)

            // Get merchant email for notification
            const { data: authUser } = await supabase.auth.admin.getUserById(store.owner_id)
            const merchantEmail = authUser?.user?.email

            // Create dashboard notification
            await createNotification(supabase, {
              store_id,
              user_id: store.owner_id,
              type: 'system',
              title: 'Shipment Creation Failed',
              message: `Could not auto-create shipment for COD order ${orderNumber}. Please create it manually.`,
              priority: 'high',
              metadata: {
                order_id: orderId,
                order_number: orderNumber,
                error: result.error,
                attempts: result.attempts
              }
            })

            // Send email notification to merchant
            if (merchantEmail) {
              await sendShipmentFailedEmail({
                merchantEmail,
                storeName: store.name,
                orderNumber,
                customerName: customer_details.name,
                error: result.error || 'Unknown error',
                attempts: result.attempts || 0
              })
            }
          }
        })
        .catch((err) => {
          console.error(`[AutoShipment] Unexpected error for COD order ${orderNumber}:`, err)
        })
    }

    // 11. Return order details
    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        order_number: orderNumber,
        total: totals.total,
        razorpay_order_id: razorpayOrder?.id,
        razorpay_key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      },
    })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
