import { sendEmailWithReact, sendEmail, getResendCredentials } from './index'
import NewOrderMerchantEmail from '@/../emails/new-order-merchant'
import LowStockAlertEmail from '@/../emails/low-stock-alert'
import WelcomeMerchantEmail from '@/../emails/welcome-merchant'

const dashboardUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// Production domain configuration for store URLs
const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'storeforge.site'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function getStoreUrl(storeSlug: string): string {
  if (IS_PRODUCTION) {
    return `https://${storeSlug}.${PRODUCTION_DOMAIN}`
  }
  return `${dashboardUrl}/${storeSlug}`
}

interface OrderItem {
  product_title: string
  quantity: number
  unit_price: number
  total_price: number
  sku?: string
}

interface ShippingAddress {
  name: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  pincode: string
  country: string
  phone: string
}

/**
 * Send new order notification to merchant
 * Note: Merchant notifications use platform credentials since they're internal
 */
export async function sendNewOrderMerchantEmail(params: {
  merchantEmail: string
  storeName: string
  storeId?: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  totalAmount: number
  shippingAddress: ShippingAddress
  paymentMethod: string
  paymentStatus: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      merchantEmail,
      storeName,
      storeId,
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      items,
      subtotal,
      shippingCost,
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus
    } = params

    // Check if we have credentials
    const credentials = await getResendCredentials(storeId)
    if (!credentials) {
      console.log('=== NEW ORDER MERCHANT EMAIL (Resend not configured) ===')
      console.log('To:', merchantEmail)
      console.log('Order:', orderNumber)
      console.log('Customer:', customerName)
      console.log('Total:', totalAmount)
      console.log('=========================================================')
      return { success: true }
    }

    return sendEmailWithReact({
      to: merchantEmail,
      subject: `New Order #${orderNumber} - ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalAmount)}`,
      react: NewOrderMerchantEmail({
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        items,
        subtotal,
        shippingCost,
        totalAmount,
        shippingAddress,
        paymentMethod,
        paymentStatus,
        storeName,
        dashboardUrl
      }),
      storeId,
      storeName: 'StoreForge', // Merchant emails always from StoreForge
    })
  } catch (error) {
    console.error('Failed to send new order merchant email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

interface LowStockProduct {
  id: string
  title: string
  sku?: string
  current_stock: number
  threshold: number
}

/**
 * Send low stock alert to merchant
 */
export async function sendLowStockAlertEmail(params: {
  merchantEmail: string
  storeName: string
  storeId?: string
  products: LowStockProduct[]
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { merchantEmail, storeName, storeId, products } = params

    // Check if we have credentials
    const credentials = await getResendCredentials(storeId)
    if (!credentials) {
      console.log('=== LOW STOCK ALERT EMAIL (Resend not configured) ===')
      console.log('To:', merchantEmail)
      console.log('Products:', products.map(p => `${p.title}: ${p.current_stock}`).join(', '))
      console.log('=====================================================')
      return { success: true }
    }

    const outOfStockCount = products.filter(p => p.current_stock === 0).length
    const subject = outOfStockCount > 0
      ? `${outOfStockCount} Product(s) Out of Stock on ${storeName}`
      : `Low Stock Alert: ${products.length} Product(s) Need Restocking`

    return sendEmailWithReact({
      to: merchantEmail,
      subject,
      react: LowStockAlertEmail({
        storeName,
        products,
        dashboardUrl
      }),
      storeId,
      storeName: 'StoreForge',
    })
  } catch (error) {
    console.error('Failed to send low stock alert email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

/**
 * Send welcome email to new merchant
 */
export async function sendWelcomeMerchantEmail(params: {
  merchantEmail: string
  merchantName: string
  storeName: string
  storeSlug: string
  storeId?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { merchantEmail, merchantName, storeName, storeSlug, storeId } = params

    const storeUrl = getStoreUrl(storeSlug)

    // Check if we have credentials
    const credentials = await getResendCredentials(storeId)
    if (!credentials) {
      console.log('=== WELCOME MERCHANT EMAIL (Resend not configured) ===')
      console.log('To:', merchantEmail)
      console.log('Store:', storeName)
      console.log('URL:', storeUrl)
      console.log('=====================================================')
      return { success: true }
    }

    return sendEmailWithReact({
      to: merchantEmail,
      subject: `Welcome to StoreForge! Your store ${storeName} is ready`,
      react: WelcomeMerchantEmail({
        merchantName,
        storeName,
        storeUrl,
        dashboardUrl
      }),
      storeId,
      storeName: 'StoreForge',
    })
  } catch (error) {
    console.error('Failed to send welcome merchant email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

/**
 * Send shipment creation failed notification to merchant
 */
export async function sendShipmentFailedEmail(params: {
  merchantEmail: string
  storeName: string
  storeId?: string
  orderNumber: string
  customerName: string
  error: string
  attempts: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { merchantEmail, storeName, storeId, orderNumber, customerName, error, attempts } = params

    // Check if we have credentials
    const credentials = await getResendCredentials(storeId)
    if (!credentials) {
      console.log('=== SHIPMENT FAILED EMAIL (Resend not configured) ===')
      console.log('To:', merchantEmail)
      console.log('Order:', orderNumber)
      console.log('Error:', error)
      console.log('Attempts:', attempts)
      console.log('=====================================================')
      return { success: true }
    }

    return sendEmail({
      to: merchantEmail,
      subject: `Action Required: Shipment Failed for Order #${orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Automatic Shipment Creation Failed</h2>

          <p>Hello,</p>

          <p>We were unable to automatically create a shipment for the following order on <strong>${storeName}</strong>:</p>

          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
            <p style="margin: 4px 0;"><strong>Customer:</strong> ${customerName}</p>
            <p style="margin: 4px 0;"><strong>Attempts Made:</strong> ${attempts}</p>
            <p style="margin: 4px 0;"><strong>Error:</strong> ${error}</p>
          </div>

          <p><strong>Action Required:</strong> Please create the shipment manually from your dashboard.</p>

          <a href="${dashboardUrl}/dashboard/orders"
             style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Go to Orders Dashboard
          </a>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message from StoreForge. If the issue persists,
            please check your shipping provider settings or contact support.
          </p>
        </div>
      `,
      storeId,
      storeName: 'StoreForge',
    })
  } catch (error) {
    console.error('Failed to send shipment failed email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
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
