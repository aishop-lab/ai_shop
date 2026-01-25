import { Resend } from 'resend'
import NewOrderMerchantEmail from '@/../emails/new-order-merchant'
import LowStockAlertEmail from '@/../emails/low-stock-alert'
import WelcomeMerchantEmail from '@/../emails/welcome-merchant'

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@storeforge.site'
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
 */
export async function sendNewOrderMerchantEmail(params: {
  merchantEmail: string
  storeName: string
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

    // If Resend is not configured, log and return
    if (!resend) {
      console.log('=== NEW ORDER MERCHANT EMAIL (Resend not configured) ===')
      console.log('To:', merchantEmail)
      console.log('Order:', orderNumber)
      console.log('Customer:', customerName)
      console.log('Total:', totalAmount)
      console.log('=========================================================')
      return { success: true }
    }

    const { data, error } = await resend.emails.send({
      from: `StoreForge <${fromEmail}>`,
      to: merchantEmail,
      subject: `🛒 New Order #${orderNumber} - ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalAmount)}`,
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
      })
    })

    if (error) {
      console.error('Failed to send new order merchant email:', error)
      return { success: false, error: error.message }
    }

    console.log('New order merchant email sent:', data?.id)
    return { success: true }
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
  products: LowStockProduct[]
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { merchantEmail, storeName, products } = params

    // If Resend is not configured, log and return
    if (!resend) {
      console.log('=== LOW STOCK ALERT EMAIL (Resend not configured) ===')
      console.log('To:', merchantEmail)
      console.log('Products:', products.map(p => `${p.title}: ${p.current_stock}`).join(', '))
      console.log('=====================================================')
      return { success: true }
    }

    const outOfStockCount = products.filter(p => p.current_stock === 0).length
    const subject = outOfStockCount > 0
      ? `🚨 ${outOfStockCount} Product(s) Out of Stock on ${storeName}`
      : `⚠️ Low Stock Alert: ${products.length} Product(s) Need Restocking`

    const { data, error } = await resend.emails.send({
      from: `StoreForge <${fromEmail}>`,
      to: merchantEmail,
      subject,
      react: LowStockAlertEmail({
        storeName,
        products,
        dashboardUrl
      })
    })

    if (error) {
      console.error('Failed to send low stock alert email:', error)
      return { success: false, error: error.message }
    }

    console.log('Low stock alert email sent:', data?.id)
    return { success: true }
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
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { merchantEmail, merchantName, storeName, storeSlug } = params

    const storeUrl = getStoreUrl(storeSlug)

    // If Resend is not configured, log and return
    if (!resend) {
      console.log('=== WELCOME MERCHANT EMAIL (Resend not configured) ===')
      console.log('To:', merchantEmail)
      console.log('Store:', storeName)
      console.log('URL:', storeUrl)
      console.log('=====================================================')
      return { success: true }
    }

    const { data, error } = await resend.emails.send({
      from: `StoreForge <${fromEmail}>`,
      to: merchantEmail,
      subject: `🎉 Welcome to StoreForge! Your store ${storeName} is ready`,
      react: WelcomeMerchantEmail({
        merchantName,
        storeName,
        storeUrl,
        dashboardUrl
      })
    })

    if (error) {
      console.error('Failed to send welcome merchant email:', error)
      return { success: false, error: error.message }
    }

    console.log('Welcome merchant email sent:', data?.id)
    return { success: true }
  } catch (error) {
    console.error('Failed to send welcome merchant email:', error)
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
