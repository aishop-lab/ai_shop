import type { Order, OrderItem, ShippingAddress } from '@/lib/types/order'

interface OrderWithStore extends Order {
  store?: {
    name: string
    contact_email?: string
    logo_url?: string
  }
}

/**
 * Send order confirmation email to customer
 * Currently logs the email - integrate with email service (Resend, SendGrid, etc.)
 */
export async function sendOrderConfirmationEmail(
  order: OrderWithStore
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailContent = generateOrderConfirmationEmail(order)

    // TODO: Integrate with email service
    // For now, log the email content
    console.log('=== ORDER CONFIRMATION EMAIL ===')
    console.log('To:', order.customer_email)
    console.log('Subject:', emailContent.subject)
    console.log('Order Number:', order.order_number)
    console.log('Total:', formatCurrency(order.total_amount))
    console.log('================================')

    // Placeholder for actual email sending
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'orders@yourdomain.com',
    //   to: order.customer_email,
    //   subject: emailContent.subject,
    //   html: emailContent.html,
    // })

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
  order: OrderWithStore
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('=== ORDER SHIPPED EMAIL ===')
    console.log('To:', order.customer_email)
    console.log('Order Number:', order.order_number)
    console.log('Tracking Number:', order.tracking_number || 'N/A')
    console.log('Courier:', order.courier_name || 'N/A')
    console.log('===========================')

    return { success: true }
  } catch (error) {
    console.error('Failed to send order shipped email:', error)
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
  order: OrderWithStore,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('=== ORDER CANCELLED EMAIL ===')
    console.log('To:', order.customer_email)
    console.log('Order Number:', order.order_number)
    console.log('Reason:', reason || 'N/A')
    console.log('=============================')

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
  order: OrderWithStore,
  refundAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('=== REFUND PROCESSED EMAIL ===')
    console.log('To:', order.customer_email)
    console.log('Order Number:', order.order_number)
    console.log('Refund Amount:', formatCurrency(refundAmount))
    console.log('==============================')

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
 * Generate order confirmation email content
 */
function generateOrderConfirmationEmail(order: OrderWithStore): {
  subject: string
  html: string
  text: string
} {
  const storeName = order.store?.name || 'Store'
  const subject = `Order Confirmed - ${order.order_number}`

  const itemsHtml = (order.order_items || [])
    .map(
      (item: OrderItem) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          ${item.product_title}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          ${formatCurrency(item.unit_price)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          ${formatCurrency(item.total_price)}
        </td>
      </tr>
    `
    )
    .join('')

  const addressHtml = formatAddress(order.shipping_address)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 32px; margin-bottom: 20px;">
          <h1 style="color: #333; margin: 0 0 8px 0; font-size: 24px;">
            Thank you for your order!
          </h1>
          <p style="color: #666; margin: 0 0 24px 0;">
            Your order has been confirmed and will be processed soon.
          </p>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #666; font-size: 14px;">Order Number</p>
            <p style="margin: 4px 0 0 0; color: #333; font-size: 18px; font-weight: 600;">
              ${order.order_number}
            </p>
          </div>

          <h2 style="color: #333; font-size: 18px; margin: 0 0 16px 0;">Order Summary</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; font-weight: 600;">Item</th>
                <th style="padding: 12px; text-align: center; font-weight: 600;">Qty</th>
                <th style="padding: 12px; text-align: right; font-weight: 600;">Price</th>
                <th style="padding: 12px; text-align: right; font-weight: 600;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="border-top: 2px solid #eee; padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #666;">Subtotal</span>
              <span style="color: #333;">${formatCurrency(order.subtotal)}</span>
            </div>
            ${
              order.shipping_cost > 0
                ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #666;">Shipping</span>
              <span style="color: #333;">${formatCurrency(order.shipping_cost)}</span>
            </div>
            `
                : `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #666;">Shipping</span>
              <span style="color: #22c55e;">FREE</span>
            </div>
            `
            }
            ${
              order.tax_amount > 0
                ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #666;">Tax</span>
              <span style="color: #333;">${formatCurrency(order.tax_amount)}</span>
            </div>
            `
                : ''
            }
            ${
              order.discount_amount > 0
                ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #666;">Discount</span>
              <span style="color: #22c55e;">-${formatCurrency(order.discount_amount)}</span>
            </div>
            `
                : ''
            }
            <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
              <span style="color: #333; font-weight: 600; font-size: 18px;">Total</span>
              <span style="color: #333; font-weight: 600; font-size: 18px;">${formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <div style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #333; font-size: 18px; margin: 0 0 16px 0;">Shipping Address</h2>
          <p style="color: #666; margin: 0; line-height: 1.6;">
            ${addressHtml}
          </p>
        </div>

        <div style="background: white; border-radius: 8px; padding: 24px;">
          <h2 style="color: #333; font-size: 18px; margin: 0 0 8px 0;">Payment Method</h2>
          <p style="color: #666; margin: 0;">
            ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment (Razorpay)'}
          </p>
          <p style="color: ${order.payment_status === 'paid' ? '#22c55e' : '#f59e0b'}; margin: 8px 0 0 0; font-weight: 500;">
            ${order.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
          </p>
        </div>

        <div style="text-align: center; padding: 24px;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            Thank you for shopping with ${storeName}
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Order Confirmed - ${order.order_number}

Thank you for your order!

Order Number: ${order.order_number}

Items:
${(order.order_items || [])
  .map(
    (item: OrderItem) =>
      `- ${item.product_title} x ${item.quantity} = ${formatCurrency(item.total_price)}`
  )
  .join('\n')}

Subtotal: ${formatCurrency(order.subtotal)}
Shipping: ${order.shipping_cost > 0 ? formatCurrency(order.shipping_cost) : 'FREE'}
${order.tax_amount > 0 ? `Tax: ${formatCurrency(order.tax_amount)}` : ''}
${order.discount_amount > 0 ? `Discount: -${formatCurrency(order.discount_amount)}` : ''}
Total: ${formatCurrency(order.total_amount)}

Shipping Address:
${order.shipping_address.name}
${order.shipping_address.address_line1}
${order.shipping_address.address_line2 || ''}
${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.pincode}
${order.shipping_address.country}
Phone: ${order.shipping_address.phone}

Payment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}

Thank you for shopping with ${storeName}!
  `

  return { subject, html, text }
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

/**
 * Format shipping address for display
 */
function formatAddress(address: ShippingAddress): string {
  const lines = [
    `<strong>${address.name}</strong>`,
    address.address_line1,
    address.address_line2,
    `${address.city}, ${address.state} ${address.pincode}`,
    address.country,
    `Phone: ${address.phone}`,
  ].filter(Boolean)

  return lines.join('<br>')
}
