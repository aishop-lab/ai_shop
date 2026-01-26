import { Resend } from 'resend'
import type { Order, OrderItem, ShippingAddress } from '@/lib/types/order'
import OrderConfirmationEmail from '@/../emails/order-confirmation'
import OrderShippedEmail from '@/../emails/order-shipped'
import OrderDeliveredEmail from '@/../emails/order-delivered'
import RefundProcessedEmail from '@/../emails/refund-processed'
import OrderCancelledEmail from '@/../emails/order-cancelled'

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// Production domain configuration for subdomain URLs
const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'storeforge.site'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Get the full URL for a store (used in email links)
 */
function getStoreUrl(storeSlug: string): string {
  if (IS_PRODUCTION) {
    return `https://${storeSlug}.${PRODUCTION_DOMAIN}`
  }
  return `${baseUrl}/${storeSlug}`
}

interface OrderWithStore extends Order {
  store?: {
    name: string
    contact_email?: string
    logo_url?: string
  }
}

/**
 * Send order confirmation email to customer
 * Note: Database uses different column names than the Order type
 * Database: email, phone, shipping_amount, total, fulfillment_status
 * Order type: customer_email, customer_phone, shipping_cost, total_amount, order_status
 */
export async function sendOrderConfirmationEmail(
  order: OrderWithStore & Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeName = order.store?.name || 'Store'
    const items = (order.order_items || []) as (OrderItem & Record<string, unknown>)[]

    // Handle both database column names and type names
    const customerEmail = (order.email || order.customer_email) as string
    const customerName = order.customer_name as string
    const shippingCost = (order.shipping_amount ?? order.shipping_cost ?? 0) as number
    const totalAmount = (order.total ?? order.total_amount ?? 0) as number

    // If Resend is not configured, log and return
    if (!resend) {
      console.log('=== ORDER CONFIRMATION EMAIL (Resend not configured) ===')
      console.log('To:', customerEmail)
      console.log('Order:', order.order_number)
      console.log('==========================================================')
      return { success: true }
    }

    const { data, error } = await resend.emails.send({
      from: `${storeName} <${fromEmail}>`,
      to: customerEmail,
      subject: `Order Confirmed - #${order.order_number}`,
      react: OrderConfirmationEmail({
        orderNumber: order.order_number,
        customerName: customerName,
        items: items.map(item => ({
          product_title: (item.title || item.product_title) as string,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: (item.total ?? item.total_price ?? 0) as number,
        })),
        subtotal: order.subtotal,
        shippingCost: shippingCost,
        taxAmount: order.tax_amount,
        discountAmount: order.discount_amount,
        totalAmount: totalAmount,
        shippingAddress: order.shipping_address as ShippingAddress,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        storeName,
        trackingUrl: `${baseUrl}/orders/${order.order_number}`,
      }),
    })

    if (error) {
      console.error('Failed to send order confirmation email:', {
        error: error.message,
        name: error.name,
        to: customerEmail,
        from: fromEmail,
        orderNumber: order.order_number
      })
      return { success: false, error: error.message }
    }

    console.log('Order confirmation email sent successfully:', {
      emailId: data?.id,
      to: customerEmail,
      orderNumber: order.order_number
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send order shipped notification email
 */
export async function sendOrderShippedEmail(
  order: OrderWithStore & Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeName = order.store?.name || 'Store'
    const customerEmail = (order.email || order.customer_email) as string

    // If Resend is not configured, log and return
    if (!resend) {
      console.log('=== ORDER SHIPPED EMAIL (Resend not configured) ===')
      console.log('To:', customerEmail)
      console.log('Order:', order.order_number)
      console.log('Tracking:', order.tracking_number)
      console.log('===================================================')
      return { success: true }
    }

    const trackingUrl = getTrackingUrl(
      order.courier_name || '',
      order.tracking_number || ''
    )

    const { data, error } = await resend.emails.send({
      from: `${storeName} <${fromEmail}>`,
      to: customerEmail,
      subject: `Your Order Has Shipped - #${order.order_number}`,
      react: OrderShippedEmail({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        trackingNumber: order.tracking_number || 'N/A',
        courierName: order.courier_name || 'Courier',
        trackingUrl,
        storeName,
      }),
    })

    if (error) {
      console.error('Failed to send shipping email:', error)
      return { success: false, error: error.message }
    }

    console.log('Shipping notification email sent:', data?.id)
    return { success: true }
  } catch (error) {
    console.error('Failed to send shipping email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send order delivered notification email
 */
export async function sendOrderDeliveredEmail(
  order: OrderWithStore & Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeName = order.store?.name || 'Store'
    const customerEmail = (order.email || order.customer_email) as string

    // If Resend is not configured, log and return
    if (!resend) {
      console.log('=== ORDER DELIVERED EMAIL (Resend not configured) ===')
      console.log('To:', customerEmail)
      console.log('Order:', order.order_number)
      console.log('=====================================================')
      return { success: true }
    }

    const { data, error } = await resend.emails.send({
      from: `${storeName} <${fromEmail}>`,
      to: customerEmail,
      subject: `Your Order Was Delivered - #${order.order_number}`,
      react: OrderDeliveredEmail({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        storeName,
        // TODO: Add review URL when review system is integrated
      }),
    })

    if (error) {
      console.error('Failed to send delivery email:', error)
      return { success: false, error: error.message }
    }

    console.log('Delivery notification email sent:', data?.id)
    return { success: true }
  } catch (error) {
    console.error('Failed to send delivery email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send order cancelled notification email
 */
export async function sendOrderCancelledEmail(
  order: OrderWithStore & Record<string, unknown>,
  refundMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeName = order.store?.name || 'Store'
    const customerEmail = (order.email || order.customer_email) as string

    // If Resend is not configured, log and return
    if (!resend) {
      console.log('=== ORDER CANCELLED EMAIL (Resend not configured) ===')
      console.log('To:', customerEmail)
      console.log('Order Number:', order.order_number)
      console.log('Refund Message:', refundMessage || 'N/A')
      console.log('=====================================================')
      return { success: true }
    }

    const { data, error } = await resend.emails.send({
      from: `${storeName} <${fromEmail}>`,
      to: customerEmail,
      subject: `Order Cancelled - #${order.order_number}`,
      react: OrderCancelledEmail({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        storeName,
        refundMessage,
        supportEmail: order.store?.contact_email,
      }),
    })

    if (error) {
      console.error('Failed to send cancellation email:', error)
      return { success: false, error: error.message }
    }

    console.log('Cancellation notification email sent:', data?.id)
    return { success: true }
  } catch (error) {
    console.error('Failed to send order cancelled email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send refund processed notification email
 */
export async function sendRefundProcessedEmail(
  order: OrderWithStore & Record<string, unknown>,
  refundAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const storeName = order.store?.name || 'Store'
    const customerEmail = (order.email || order.customer_email) as string

    // If Resend is not configured, log and return
    if (!resend) {
      console.log('=== REFUND PROCESSED EMAIL (Resend not configured) ===')
      console.log('To:', customerEmail)
      console.log('Order:', order.order_number)
      console.log('Amount:', refundAmount)
      console.log('======================================================')
      return { success: true }
    }

    const { data, error } = await resend.emails.send({
      from: `${storeName} <${fromEmail}>`,
      to: customerEmail,
      subject: `Refund Processed - #${order.order_number}`,
      react: RefundProcessedEmail({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        refundAmount,
        storeName,
        supportEmail: order.store?.contact_email,
      }),
    })

    if (error) {
      console.error('Failed to send refund email:', error)
      return { success: false, error: error.message }
    }

    console.log('Refund notification email sent:', data?.id)
    return { success: true }
  } catch (error) {
    console.error('Failed to send refund email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Get tracking URL for different couriers
 */
function getTrackingUrl(courier: string, trackingNumber: string): string {
  if (!trackingNumber) return '#'

  const courierLower = courier.toLowerCase()
  const urls: Record<string, string> = {
    delhivery: `https://www.delhivery.com/track/package/${trackingNumber}`,
    bluedart: `https://www.bluedart.com/tracking/${trackingNumber}`,
    dtdc: `https://www.dtdc.in/tracking/${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    ecom: `https://ecomexpress.in/tracking/?awb_field=${trackingNumber}`,
    xpressbees: `https://www.xpressbees.com/track/${trackingNumber}`,
    shadowfax: `https://tracker.shadowfax.in/#/track/${trackingNumber}`,
  }

  return urls[courierLower] || '#'
}

/**
 * Format currency in INR
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
