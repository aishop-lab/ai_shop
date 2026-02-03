/**
 * WhatsApp Business API integration via MSG91
 *
 * MSG91 is a popular Indian messaging service that provides
 * WhatsApp Business API access with pre-approved templates.
 *
 * Setup (Platform or Per-Store):
 * 1. Create account at msg91.com
 * 2. Apply for WhatsApp Business API
 * 3. Create message templates and get them approved
 * 4. Configure credentials in dashboard settings or env variables
 *
 * Features:
 * - Per-store credentials with platform fallback
 * - Automatic retry with exponential backoff (3 attempts)
 * - Phone number validation and formatting
 * - Structured logging for audit trail
 * - Graceful fallback when API unavailable
 */

import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

const MSG91_BASE_URL = 'https://api.msg91.com/api/v5/whatsapp'

// Platform-level credentials (fallback)
const PLATFORM_MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY
const PLATFORM_MSG91_INTEGRATED_NUMBER = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER

// Cache for store credentials to avoid repeated DB lookups
const credentialsCache = new Map<string, { authKey: string; integratedNumber: string; expiry: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface MSG91Credentials {
  authKey: string
  integratedNumber: string
  isStoreCredentials: boolean
}

/**
 * Get MSG91 credentials for a store (or fall back to platform credentials)
 */
async function getMSG91Credentials(storeId?: string): Promise<MSG91Credentials | null> {
  // If no storeId, use platform credentials
  if (!storeId) {
    if (PLATFORM_MSG91_AUTH_KEY && PLATFORM_MSG91_INTEGRATED_NUMBER) {
      return {
        authKey: PLATFORM_MSG91_AUTH_KEY,
        integratedNumber: PLATFORM_MSG91_INTEGRATED_NUMBER,
        isStoreCredentials: false,
      }
    }
    return null
  }

  // Check cache first
  const cached = credentialsCache.get(storeId)
  if (cached && cached.expiry > Date.now()) {
    return {
      authKey: cached.authKey,
      integratedNumber: cached.integratedNumber,
      isStoreCredentials: true,
    }
  }

  try {
    const supabase = await createClient()
    const { data: store, error } = await supabase
      .from('stores')
      .select('msg91_auth_key_encrypted, msg91_whatsapp_number, msg91_credentials_verified, whatsapp_notifications_enabled')
      .eq('id', storeId)
      .single()

    if (error || !store) {
      // Fall back to platform credentials
      if (PLATFORM_MSG91_AUTH_KEY && PLATFORM_MSG91_INTEGRATED_NUMBER) {
        return {
          authKey: PLATFORM_MSG91_AUTH_KEY,
          integratedNumber: PLATFORM_MSG91_INTEGRATED_NUMBER,
          isStoreCredentials: false,
        }
      }
      return null
    }

    // Check if WhatsApp notifications are enabled
    if (!store.whatsapp_notifications_enabled) {
      return null // Notifications disabled for this store
    }

    // Use store credentials if verified
    if (store.msg91_credentials_verified && store.msg91_auth_key_encrypted && store.msg91_whatsapp_number) {
      const authKey = decrypt(store.msg91_auth_key_encrypted)
      const credentials = {
        authKey,
        integratedNumber: store.msg91_whatsapp_number,
        isStoreCredentials: true,
      }

      // Cache the credentials
      credentialsCache.set(storeId, {
        authKey,
        integratedNumber: store.msg91_whatsapp_number,
        expiry: Date.now() + CACHE_TTL_MS,
      })

      return credentials
    }

    // Fall back to platform credentials
    if (PLATFORM_MSG91_AUTH_KEY && PLATFORM_MSG91_INTEGRATED_NUMBER) {
      return {
        authKey: PLATFORM_MSG91_AUTH_KEY,
        integratedNumber: PLATFORM_MSG91_INTEGRATED_NUMBER,
        isStoreCredentials: false,
      }
    }

    return null
  } catch (error) {
    console.error('Failed to get MSG91 credentials for store:', storeId, error)
    // Fall back to platform credentials on error
    if (PLATFORM_MSG91_AUTH_KEY && PLATFORM_MSG91_INTEGRATED_NUMBER) {
      return {
        authKey: PLATFORM_MSG91_AUTH_KEY,
        integratedNumber: PLATFORM_MSG91_INTEGRATED_NUMBER,
        isStoreCredentials: false,
      }
    }
    return null
  }
}

/**
 * Clear cached credentials for a store (call when credentials are updated)
 */
export function clearMSG91CredentialsCache(storeId: string): void {
  credentialsCache.delete(storeId)
}

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000 // 1 second
const MAX_RETRY_DELAY_MS = 10000 // 10 seconds

interface WhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
  attempts?: number
}

interface OrderItem {
  title: string
  quantity: number
  price: number
}

interface WhatsAppLogEntry {
  timestamp: string
  event: 'send_attempt' | 'send_success' | 'send_failure' | 'retry' | 'final_failure'
  phone: string
  template: string
  messageId?: string
  error?: string
  attempt?: number
  maxAttempts?: number
}

/**
 * Log WhatsApp message events for audit trail
 */
function logWhatsAppEvent(entry: WhatsAppLogEntry): void {
  const logData = {
    service: 'whatsapp',
    provider: 'msg91',
    ...entry,
  }

  if (entry.event === 'send_success') {
    console.log('[WhatsApp]', JSON.stringify(logData))
  } else if (entry.event === 'send_failure' || entry.event === 'final_failure') {
    console.error('[WhatsApp]', JSON.stringify(logData))
  } else {
    console.log('[WhatsApp]', JSON.stringify(logData))
  }
}

/**
 * Validate Indian phone number
 * Returns true if valid, false otherwise
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')

  // Check for valid Indian mobile number patterns:
  // - 10 digits starting with 6-9 (local format)
  // - 12 digits starting with 91 followed by 6-9 (with country code)
  // - 13 digits starting with +91 (after stripping +)
  if (cleaned.length === 10) {
    return /^[6-9]\d{9}$/.test(cleaned)
  } else if (cleaned.length === 12) {
    return /^91[6-9]\d{9}$/.test(cleaned)
  }

  return false
}

/**
 * Format phone number to international format (India)
 * Returns formatted number or throws if invalid
 */
export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // If starts with 0, remove it (local format: 09876543210)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // If 10 digits, add India country code
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned
  }

  // Validate the final number
  if (cleaned.length !== 12 || !cleaned.startsWith('91')) {
    throw new Error(`Invalid phone number format: ${phone}`)
  }

  // Validate the mobile number part (should start with 6-9)
  const mobileNumber = cleaned.substring(2)
  if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
    throw new Error(`Invalid Indian mobile number: ${phone}`)
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
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay for exponential backoff
 */
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
  // Add jitter (random 0-500ms) to prevent thundering herd
  const jitter = Math.random() * 500
  return Math.min(delay + jitter, MAX_RETRY_DELAY_MS)
}

/**
 * Check if error is retryable
 */
function isRetryableError(statusCode: number, error?: string): boolean {
  // Retry on server errors (5xx), rate limiting (429), or network issues
  if (statusCode >= 500 || statusCode === 429) {
    return true
  }

  // Don't retry on client errors (4xx) except 429
  if (statusCode >= 400 && statusCode < 500) {
    return false
  }

  // Retry on network-related errors
  const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']
  if (error && networkErrors.some((e) => error.includes(e))) {
    return true
  }

  return false
}

/**
 * Send WhatsApp message via MSG91 with retry logic
 * Supports per-store credentials with platform fallback
 */
async function sendWhatsAppMessage(params: {
  to: string
  templateName: string
  templateParams: Record<string, string>
  storeId?: string
}): Promise<WhatsAppResult> {
  // Get credentials (per-store or platform)
  const credentials = await getMSG91Credentials(params.storeId)

  // Development mode - log and return success
  if (!credentials) {
    logWhatsAppEvent({
      timestamp: new Date().toISOString(),
      event: 'send_success',
      phone: params.to,
      template: params.templateName,
      messageId: 'dev-mode',
    })
    console.log('=== WHATSAPP MESSAGE (MSG91 not configured) ===')
    console.log('To:', params.to)
    console.log('Template:', params.templateName)
    console.log('Params:', params.templateParams)
    console.log('Store ID:', params.storeId || 'N/A')
    console.log('==============================================')
    return { success: true, messageId: 'dev-mode', attempts: 1 }
  }

  const { authKey, integratedNumber, isStoreCredentials } = credentials

  // Validate and format phone number
  let formattedPhone: string
  try {
    formattedPhone = formatPhoneNumber(params.to)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid phone number'
    logWhatsAppEvent({
      timestamp: new Date().toISOString(),
      event: 'final_failure',
      phone: params.to,
      template: params.templateName,
      error: errorMessage,
    })
    return { success: false, error: errorMessage, attempts: 0 }
  }

  let lastError: string | undefined
  let lastStatusCode = 0

  // Retry loop with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    logWhatsAppEvent({
      timestamp: new Date().toISOString(),
      event: 'send_attempt',
      phone: formattedPhone,
      template: params.templateName,
      attempt,
      maxAttempts: MAX_RETRIES,
    })

    try {
      const response = await fetch(`${MSG91_BASE_URL}/whatsapp/outbound/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify({
          integrated_number: integratedNumber,
          content_type: 'template',
          payload: {
            to: formattedPhone,
            type: 'template',
            template: {
              name: params.templateName,
              language: {
                code: 'en',
                policy: 'deterministic',
              },
              components: [
                {
                  type: 'body',
                  parameters: Object.entries(params.templateParams).map(([, value]) => ({
                    type: 'text',
                    text: value,
                  })),
                },
              ],
            },
          },
        }),
      })

      lastStatusCode = response.status

      const data = await response.json()

      if (response.ok) {
        logWhatsAppEvent({
          timestamp: new Date().toISOString(),
          event: 'send_success',
          phone: formattedPhone,
          template: params.templateName,
          messageId: data.request_id,
          attempt,
        })
        return { success: true, messageId: data.request_id, attempts: attempt }
      }

      lastError = data.message || `HTTP ${response.status}: ${response.statusText}`

      // Check if we should retry
      if (!isRetryableError(response.status, lastError) || attempt === MAX_RETRIES) {
        break
      }

      // Log retry and wait
      const delay = getRetryDelay(attempt)
      logWhatsAppEvent({
        timestamp: new Date().toISOString(),
        event: 'retry',
        phone: formattedPhone,
        template: params.templateName,
        error: lastError,
        attempt,
        maxAttempts: MAX_RETRIES,
      })

      await sleep(delay)
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Network error'

      // Check if we should retry network errors
      if (attempt === MAX_RETRIES || !isRetryableError(0, lastError)) {
        break
      }

      // Log retry and wait
      const delay = getRetryDelay(attempt)
      logWhatsAppEvent({
        timestamp: new Date().toISOString(),
        event: 'retry',
        phone: formattedPhone,
        template: params.templateName,
        error: lastError,
        attempt,
        maxAttempts: MAX_RETRIES,
      })

      await sleep(delay)
    }
  }

  // All retries exhausted
  logWhatsAppEvent({
    timestamp: new Date().toISOString(),
    event: 'final_failure',
    phone: formattedPhone,
    template: params.templateName,
    error: lastError,
    attempt: MAX_RETRIES,
    maxAttempts: MAX_RETRIES,
  })

  return {
    success: false,
    error: lastError || 'Failed to send WhatsApp message after all retries',
    attempts: MAX_RETRIES,
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
  storeId?: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber, totalAmount, storeName, items, storeId } = params

  // Create items summary (first 3 items)
  const itemsSummary = items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.title}`)
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
      store_name: storeName,
    },
    storeId,
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
  storeId?: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber, courierName, trackingNumber, trackingUrl, estimatedDelivery, storeId } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'order_shipped',
    templateParams: {
      customer_name: customerName,
      order_number: orderNumber,
      courier_name: courierName,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl || `https://shiprocket.co/tracking/${trackingNumber}`,
      estimated_delivery: estimatedDelivery || 'within 3-5 business days',
    },
    storeId,
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
  storeId?: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber, storeName, reviewUrl, storeId } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'order_delivered',
    templateParams: {
      customer_name: customerName,
      order_number: orderNumber,
      store_name: storeName,
      review_url: reviewUrl || '#',
    },
    storeId,
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
  storeId?: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber, storeId } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'out_for_delivery',
    templateParams: {
      customer_name: customerName,
      order_number: orderNumber,
    },
    storeId,
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
  storeId?: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, itemsCount, cartUrl, storeName, storeId } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'abandoned_cart',
    templateParams: {
      customer_name: customerName,
      items_count: itemsCount.toString(),
      cart_url: cartUrl,
      store_name: storeName,
    },
    storeId,
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
  storeId?: string
}): Promise<WhatsAppResult> {
  const { phone, customerName, orderNumber, totalAmount, storeId } = params

  return sendWhatsAppMessage({
    to: phone,
    templateName: 'cod_reminder',
    templateParams: {
      customer_name: customerName,
      order_number: orderNumber,
      total_amount: formatCurrency(totalAmount),
    },
    storeId,
  })
}

// Export types
export type { WhatsAppResult, OrderItem }
