import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

// Platform-level credentials (fallback)
const PLATFORM_RESEND_API_KEY = process.env.RESEND_API_KEY
const PLATFORM_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

// Platform Resend client
const platformResend = PLATFORM_RESEND_API_KEY
  ? new Resend(PLATFORM_RESEND_API_KEY)
  : null

// Cache for store credentials to avoid repeated DB lookups
const credentialsCache = new Map<string, {
  apiKey: string
  fromEmail: string
  fromName?: string
  client: Resend
  expiry: number
}>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface ResendCredentials {
  client: Resend
  fromEmail: string
  fromName?: string
  isStoreCredentials: boolean
}

/**
 * Get Resend credentials for a store (or fall back to platform credentials)
 */
export async function getResendCredentials(storeId?: string): Promise<ResendCredentials | null> {
  // If no storeId, use platform credentials
  if (!storeId) {
    if (platformResend) {
      return {
        client: platformResend,
        fromEmail: PLATFORM_FROM_EMAIL,
        isStoreCredentials: false,
      }
    }
    return null
  }

  // Check cache first
  const cached = credentialsCache.get(storeId)
  if (cached && cached.expiry > Date.now()) {
    return {
      client: cached.client,
      fromEmail: cached.fromEmail,
      fromName: cached.fromName,
      isStoreCredentials: true,
    }
  }

  try {
    const supabase = await createClient()
    const { data: store, error } = await supabase
      .from('stores')
      .select('resend_api_key_encrypted, resend_from_email, resend_from_name, resend_credentials_verified, email_notifications_enabled, name')
      .eq('id', storeId)
      .single()

    if (error || !store) {
      // Fall back to platform credentials
      if (platformResend) {
        return {
          client: platformResend,
          fromEmail: PLATFORM_FROM_EMAIL,
          isStoreCredentials: false,
        }
      }
      return null
    }

    // Check if email notifications are enabled
    if (!store.email_notifications_enabled) {
      return null // Notifications disabled for this store
    }

    // Use store credentials if verified
    if (store.resend_credentials_verified && store.resend_api_key_encrypted) {
      const apiKey = decrypt(store.resend_api_key_encrypted)
      const client = new Resend(apiKey)
      const fromEmail = store.resend_from_email || PLATFORM_FROM_EMAIL
      const fromName = store.resend_from_name || store.name

      // Cache the credentials
      credentialsCache.set(storeId, {
        apiKey,
        fromEmail,
        fromName,
        client,
        expiry: Date.now() + CACHE_TTL_MS,
      })

      return {
        client,
        fromEmail,
        fromName,
        isStoreCredentials: true,
      }
    }

    // Fall back to platform credentials
    if (platformResend) {
      return {
        client: platformResend,
        fromEmail: PLATFORM_FROM_EMAIL,
        fromName: store.name,
        isStoreCredentials: false,
      }
    }

    return null
  } catch (error) {
    console.error('Failed to get Resend credentials for store:', storeId, error)
    // Fall back to platform credentials on error
    if (platformResend) {
      return {
        client: platformResend,
        fromEmail: PLATFORM_FROM_EMAIL,
        isStoreCredentials: false,
      }
    }
    return null
  }
}

/**
 * Clear cached credentials for a store (call when credentials are updated)
 */
export function clearResendCredentialsCache(storeId: string): void {
  credentialsCache.delete(storeId)
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
  storeId?: string
  storeName?: string
}

/**
 * Generic email sending function with per-store support
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  const credentials = await getResendCredentials(options.storeId)

  if (!credentials) {
    console.warn('Email service not configured (missing credentials)')
    console.log('=== EMAIL (Not configured) ===')
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('Store ID:', options.storeId || 'N/A')
    console.log('==============================')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const fromName = options.storeName || credentials.fromName || 'StoreForge'
    const from = `${fromName} <${credentials.fromEmail}>`

    const { data, error } = await credentials.client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', {
      emailId: data?.id,
      to: options.to,
      isStoreCredentials: credentials.isStoreCredentials
    })
    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send email using React Email templates
 */
export async function sendEmailWithReact(options: {
  to: string
  subject: string
  react: React.ReactElement
  replyTo?: string
  storeId?: string
  storeName?: string
}): Promise<{ success: boolean; error?: string }> {
  const credentials = await getResendCredentials(options.storeId)

  if (!credentials) {
    console.warn('Email service not configured (missing credentials)')
    console.log('=== EMAIL (Not configured) ===')
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('Store ID:', options.storeId || 'N/A')
    console.log('==============================')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const fromName = options.storeName || credentials.fromName || 'StoreForge'
    const from = `${fromName} <${credentials.fromEmail}>`

    const { data, error } = await credentials.client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      react: options.react,
      replyTo: options.replyTo,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', {
      emailId: data?.id,
      to: options.to,
      isStoreCredentials: credentials.isStoreCredentials
    })
    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Re-export other email functions
export { sendOrderConfirmationEmail, sendRefundProcessedEmail } from './order-confirmation'
export { sendNewOrderMerchantEmail, sendShipmentFailedEmail, sendLowStockAlertEmail } from './merchant-notifications'
export { sendTwoFactorOTPEmail } from './two-factor'
