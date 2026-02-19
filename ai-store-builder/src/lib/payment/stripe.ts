import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StripeCredentials } from '@/lib/types/store'
import { decrypt } from '@/lib/encryption'

// Lazy initialization of platform Stripe instance
let platformStripeInstance: Stripe | null = null

// Cache for store-specific Stripe instances (storeId -> instance)
const storeStripeInstances: Map<string, { instance: Stripe; timestamp: number }> = new Map()
const INSTANCE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get the platform's default Stripe instance
 */
function getPlatformStripeInstance(): Stripe {
  if (!platformStripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Platform Stripe API key not configured')
    }
    platformStripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    })
  }
  return platformStripeInstance
}

/**
 * Create a Stripe instance with custom credentials
 */
function createStripeInstance(credentials: StripeCredentials): Stripe {
  return new Stripe(credentials.secret_key, {
    apiVersion: '2026-01-28.clover',
  })
}

/**
 * Get a Stripe instance - either store-specific or platform default
 */
function getStripeInstance(credentials?: StripeCredentials): Stripe {
  if (credentials) {
    return createStripeInstance(credentials)
  }
  return getPlatformStripeInstance()
}

/**
 * Get cached Stripe instance for a store, or create new one
 */
function getCachedStoreInstance(storeId: string, credentials: StripeCredentials): Stripe {
  const cached = storeStripeInstances.get(storeId)
  const now = Date.now()

  if (cached && now - cached.timestamp < INSTANCE_CACHE_TTL) {
    return cached.instance
  }

  // Create new instance and cache it
  const instance = createStripeInstance(credentials)
  storeStripeInstances.set(storeId, { instance, timestamp: now })

  // Clean up old entries
  for (const [key, value] of storeStripeInstances.entries()) {
    if (now - value.timestamp > INSTANCE_CACHE_TTL) {
      storeStripeInstances.delete(key)
    }
  }

  return instance
}

/**
 * Fetch and decrypt store-specific Stripe credentials
 * Returns null if store doesn't have custom credentials configured
 */
export async function getStoreStripeCredentials(
  storeId: string,
  supabase: SupabaseClient
): Promise<StripeCredentials | null> {
  const { data: store, error } = await supabase
    .from('stores')
    .select('stripe_publishable_key, stripe_secret_key_encrypted, stripe_webhook_secret_encrypted, stripe_credentials_verified')
    .eq('id', storeId)
    .single()

  if (error || !store) {
    console.error('Failed to fetch store Stripe credentials:', error)
    return null
  }

  // Check if store has custom credentials configured and verified
  if (!store.stripe_publishable_key || !store.stripe_secret_key_encrypted || !store.stripe_credentials_verified) {
    return null
  }

  try {
    const credentials: StripeCredentials = {
      publishable_key: store.stripe_publishable_key,
      secret_key: decrypt(store.stripe_secret_key_encrypted),
    }

    if (store.stripe_webhook_secret_encrypted) {
      credentials.webhook_secret = decrypt(store.stripe_webhook_secret_encrypted)
    }

    return credentials
  } catch (decryptError) {
    console.error('Failed to decrypt store Stripe credentials:', decryptError)
    return null
  }
}

/**
 * Get the Stripe publishable key to use for a store (for frontend)
 * Returns store's key if configured, otherwise platform key
 */
export async function getStoreStripePublishableKey(
  storeId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data: store } = await supabase
    .from('stores')
    .select('stripe_publishable_key, stripe_credentials_verified')
    .eq('id', storeId)
    .single()

  if (store?.stripe_publishable_key && store.stripe_credentials_verified) {
    return store.stripe_publishable_key
  }

  return process.env.STRIPE_PUBLISHABLE_KEY || ''
}

/**
 * Verify Stripe credentials by making a test API call
 */
export async function verifyStripeCredentials(
  credentials: StripeCredentials
): Promise<{ valid: boolean; error?: string }> {
  try {
    const stripe = createStripeInstance(credentials)
    // Try to retrieve account info to verify credentials
    await stripe.balance.retrieve()
    return { valid: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid credentials'
    console.error('Stripe credentials verification failed:', errorMessage)
    return {
      valid: false,
      error: errorMessage.includes('Invalid API Key')
        ? 'Invalid Secret Key'
        : errorMessage,
    }
  }
}

/**
 * Create a Stripe Checkout Session
 * @param amount - Amount in the base currency unit (e.g., dollars, not cents)
 * @param currency - Currency code (e.g., 'usd', 'eur')
 * @param orderNumber - Order number for display
 * @param orderId - Internal order ID
 * @param storeId - Store ID for webhook identification
 * @param storeName - Store name for display on checkout page
 * @param customerEmail - Customer email for pre-fill
 * @param successUrl - URL to redirect after successful payment
 * @param cancelUrl - URL to redirect if payment is cancelled
 * @param credentials - Optional store-specific credentials
 */
export async function createStripeCheckoutSession(
  amount: number,
  currency: string,
  orderNumber: string,
  orderId: string,
  storeId: string,
  storeName: string,
  customerEmail: string,
  successUrl: string,
  cancelUrl: string,
  credentials?: StripeCredentials
): Promise<{ sessionId: string; url: string }> {
  try {
    const stripe = getStripeInstance(credentials)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Order #${orderNumber}`,
              description: `Order from ${storeName}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to smallest currency unit (cents/paise)
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: orderId,
        store_id: storeId,
        order_number: orderNumber,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes from now
    })

    if (!session.url) {
      throw new Error('Failed to create checkout session URL')
    }

    return {
      sessionId: session.id,
      url: session.url,
    }
  } catch (error) {
    console.error('Stripe checkout session creation failed:', error)
    throw new Error('Failed to create payment session')
  }
}

/**
 * Verify Stripe webhook signature and construct event
 */
export function verifyStripeWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = getPlatformStripeInstance()
  return stripe.webhooks.constructEvent(payload, signature, secret)
}

/**
 * Refund a Stripe payment
 */
export async function refundStripePayment(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
  credentials?: StripeCredentials
): Promise<Stripe.Refund> {
  try {
    const stripe = getStripeInstance(credentials)
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    }

    if (amount) {
      refundData.amount = Math.round(amount * 100) // Convert to cents
    }

    if (reason) {
      refundData.reason = reason
    }

    return await stripe.refunds.create(refundData)
  } catch (error) {
    console.error('Stripe refund failed:', error)
    throw error
  }
}

/**
 * Retrieve a Stripe Checkout Session
 */
export async function getStripeSession(
  sessionId: string,
  credentials?: StripeCredentials
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeInstance(credentials)
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })
}
