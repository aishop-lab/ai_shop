/**
 * WhatsApp Business API integration via MSG91
 *
 * MSG91 is a popular Indian messaging service that provides
 * WhatsApp Business API access with pre-approved templates.
 *
 * Setup:
 * 1. Create account at msg91.com
 * 2. Apply for WhatsApp Business API
 * 3. Create message templates and get them approved
 * 4. Set MSG91_AUTH_KEY and MSG91_WHATSAPP_INTEGRATED_NUMBER in env
 */

const MSG91_BASE_URL = 'https://api.msg91.com/api/v5/whatsapp'
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY
const MSG91_INTEGRATED_NUMBER = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER

interface WhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
}

interface OrderItem {
  title: string
  quantity: number
  price: number
}

/**
 * Format phone number to international format (India)
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // If starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // If 10 digits, add India country code
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned
  }

  return cleaned
}

/**
 * Format currency in INR
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Send WhatsApp message via MSG91
 */
async function sendWhatsAppMessage(params: {
  to: string
  templateName: string
  templateParams: Record<string, string>
}): Promise<WhatsAppResult> {
  if (!MSG91_AUTH_KEY || !MSG91_INTEGRATED_NUMBER) {
    // Log for development when WhatsApp not configured
    console.log('=== WHATSAPP MESSAGE (MSG91 not configured) ===')
    console.log('To:', params.to)
    console.log('Template:', params.templateName)
    console.log('Params:', params.templateParams)
    console.log('==============================================')
    return { success: true, messageId: 'dev-mode' }
  }

  try {
    const response = await fetch(`${MSG91_BASE_URL}/whatsapp/outbound/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': MSG91_AUTH_KEY
      },
      body: JSON.stringify({
        integrated_number: MSG91_INTEGRATED_NUMBER,
        content_type: 'template',
        payload: {
          to: formatPhoneNumber(params.to),
          type: 'template',
          template: {
            name: params.templateName,
            language: {
              code: 'en',
              policy: 'deterministic'
            },
            components: [
              {
                type: 'body',
                parameters: Object.entries(params.templateParams).map(([, value]) => ({
                  type: 'text',
                  text: value
                }))
              }
            ]
          }
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[WhatsApp] MSG91 error:', data)
      return { success: false, error: data.message || 'Failed to send message' }
    }

    console.log('[WhatsApp] Message sent:', data.request_id)
    return { success: true, messageId: data.request_id }
  } catch (error) {
    console.error('[WhatsApp] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp message'
    }
  }
}

/**
 * Send order confirmation via WhatsApp
 *
 * Template name: order_confirmation
 * Required params: customer_name, order_number, total_amount, store_name
 */
export async function sendOrderConfirmationWhatsApp(params: {
  phone: string
  customerName: string
  orderNumber: string
  totalAmount: number
  storeName: string
  items: OrderItem[]
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber, totalAmount, storeName, items } = params

  // Create items summary (first 3 items)
  const itemsSummary = items
    .slice(0, 3)
    .map(item => `${item.quantity}x ${item.title}`)
    .join(', ')
  const moreItems = items.length > 3 ? ` +${items.length - 3} more` : ''

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'order_confirmation',
    templateParams: {
      customer_name: customerName,
      order_number: orderNumber,
      items_summary: itemsSummary + moreItems,
      total_amount: formatCurrency(totalAmount),
      store_name: storeName
    }
  })
}

/**
 * Send order shipped notification via WhatsApp
 *
 * Template name: order_shipped
 * Required params: customer_name, order_number, courier_name, tracking_number, tracking_url
 */
export async function sendOrderShippedWhatsApp(params: {
  phone: string
  customerName: string
  orderNumber: string
  courierName: string
  trackingNumber: string
  trackingUrl?: string
  estimatedDelivery?: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber, courierName, trackingNumber, trackingUrl, estimatedDelivery } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'order_shipped',
    templateParams: {
      customer_name: customerName,
      order_number: orderNumber,
      courier_name: courierName,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl || `https://shiprocket.co/tracking/${trackingNumber}`,
      estimated_delivery: estimatedDelivery || 'within 3-5 business days'
    }
  })
}

/**
 * Send order delivered notification via WhatsApp
 *
 * Template name: order_delivered
 * Required params: customer_name, order_number, store_name
 */
export async function sendOrderDeliveredWhatsApp(params: {
  phone: string
  customerName: string
  orderNumber: string
  storeName: string
  reviewUrl?: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber, storeName, reviewUrl } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'order_delivered',
    templateParams: {
      customer_name: customerName,
      order_number: orderNumber,
      store_name: storeName,
      review_url: reviewUrl || '#'
    }
  })
}

/**
 * Send order out for delivery notification via WhatsApp
 *
 * Template name: out_for_delivery
 * Required params: customer_name, order_number
 */
export async function sendOutForDeliveryWhatsApp(params: {
  phone: string
  customerName: string
  orderNumber: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'out_for_delivery',
    templateParams: {
      customer_name: customerName,
      order_number: orderNumber
    }
  })
}

/**
 * Send abandoned cart reminder via WhatsApp
 *
 * Template name: abandoned_cart
 * Required params: customer_name, items_count, cart_url
 */
export async function sendAbandonedCartWhatsApp(params: {
  phone: string
  customerName: string
  itemsCount: number
  cartUrl: string
  storeName: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, itemsCount, cartUrl, storeName } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'abandoned_cart',
    templateParams: {
      customer_name: customerName,
      items_count: itemsCount.toString(),
      cart_url: cartUrl,
      store_name: storeName
    }
  })
}

/**
 * Send payment reminder for COD orders
 *
 * Template name: cod_reminder
 * Required params: customer_name, order_number, total_amount
 */
export async function sendCODReminderWhatsApp(params: {
  phone: string
  customerName: string
  orderNumber: string
  totalAmount: number
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber, totalAmount } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'cod_reminder',
    templateParams: {
      customer_name: customerName,
      order_number: orderNumber,
      total_amount: formatCurrency(totalAmount)
    }
  })
}

// Export types
export type { WhatsAppResult, OrderItem }
