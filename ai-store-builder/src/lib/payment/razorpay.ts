import Razorpay from 'razorpay'
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RazorpayOrder, RazorpayPayment, RazorpayRefund } from '@/lib/types/order'
import type { RazorpayCredentials } from '@/lib/types/store'
import { decrypt } from '@/lib/encryption'

// Lazy initialization of platform Razorpay instance
let platformRazorpayInstance: Razorpay | null = null

// Cache for store-specific Razorpay instances (storeId -> instance)
const storeRazorpayInstances: Map<string, { instance: Razorpay; timestamp: number }> = new Map()
const INSTANCE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get the platform's default Razorpay instance
 */
function getPlatformRazorpayInstance(): Razorpay {
  if (!platformRazorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Platform Razorpay API keys not configured')
    }
    platformRazorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return platformRazorpayInstance
}

/**
 * Create a Razorpay instance with custom credentials
 */
function createRazorpayInstance(credentials: RazorpayCredentials): Razorpay {
  return new Razorpay({
    key_id: credentials.key_id,
    key_secret: credentials.key_secret,
  })
}

/**
 * Get a Razorpay instance - either store-specific or platform default
 * @param credentials - Optional store-specific credentials
 */
function getRazorpayInstance(credentials?: RazorpayCredentials): Razorpay {
  if (credentials) {
    return createRazorpayInstance(credentials)
  }
  return getPlatformRazorpayInstance()
}

/**
 * Get cached Razorpay instance for a store, or create new one
 */
function getCachedStoreInstance(storeId: string, credentials: RazorpayCredentials): Razorpay {
  const cached = storeRazorpayInstances.get(storeId)
  const now = Date.now()

  if (cached && now - cached.timestamp < INSTANCE_CACHE_TTL) {
    return cached.instance
  }

  // Create new instance and cache it
  const instance = createRazorpayInstance(credentials)
  storeRazorpayInstances.set(storeId, { instance, timestamp: now })

  // Clean up old entries
  for (const [key, value] of storeRazorpayInstances.entries()) {
    if (now - value.timestamp > INSTANCE_CACHE_TTL) {
      storeRazorpayInstances.delete(key)
    }
  }

  return instance
}

/**
 * Fetch and decrypt store-specific Razorpay credentials
 * Returns null if store doesn't have custom credentials configured
 */
export async function getStoreRazorpayCredentials(
  storeId: string,
  supabase: SupabaseClient
): Promise<RazorpayCredentials | null> {
  const { data: store, error } = await supabase
    .from('stores')
    .select('razorpay_key_id, razorpay_key_secret_encrypted, razorpay_webhook_secret_encrypted, razorpay_credentials_verified')
    .eq('id', storeId)
    .single()

  if (error || !store) {
    console.error('Failed to fetch store Razorpay credentials:', error)
    return null
  }

  // Check if store has custom credentials configured and verified
  if (!store.razorpay_key_id || !store.razorpay_key_secret_encrypted || !store.razorpay_credentials_verified) {
    return null
  }

  try {
    const credentials: RazorpayCredentials = {
      key_id: store.razorpay_key_id,
      key_secret: decrypt(store.razorpay_key_secret_encrypted),
    }

    if (store.razorpay_webhook_secret_encrypted) {
      credentials.webhook_secret = decrypt(store.razorpay_webhook_secret_encrypted)
    }

    return credentials
  } catch (decryptError) {
    console.error('Failed to decrypt store Razorpay credentials:', decryptError)
    return null
  }
}

/**
 * Get the Razorpay key ID to use for a store (for frontend checkout)
 * Returns store's key ID if configured, otherwise platform key ID
 */
export async function getStoreRazorpayKeyId(
  storeId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data: store } = await supabase
    .from('stores')
    .select('razorpay_key_id, razorpay_credentials_verified')
    .eq('id', storeId)
    .single()

  if (store?.razorpay_key_id && store.razorpay_credentials_verified) {
    return store.razorpay_key_id
  }

  return process.env.RAZORPAY_KEY_ID || ''
}

/**
 * Verify Razorpay credentials by making a test API call
 */
export async function verifyRazorpayCredentials(
  credentials: RazorpayCredentials
): Promise<{ valid: boolean; error?: string }> {
  try {
    const razorpay = createRazorpayInstance(credentials)
    // Try to fetch orders to verify credentials - this is a read-only operation
    await razorpay.orders.all({ count: 1 })
    return { valid: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid credentials'
    console.error('Razorpay credentials verification failed:', errorMessage)
    return {
      valid: false,
      error: errorMessage.includes('authentication')
        ? 'Invalid API Key ID or Key Secret'
        : errorMessage,
    }
  }
}

/**
 * Create Razorpay order
 * @param amount - Amount in INR (not paise)
 * @param currency - Currency code (default: INR)
 * @param receipt - Unique receipt ID (order number)
 * @param notes - Optional metadata
 * @param credentials - Optional store-specific credentials
 */
export async function createRazorpayOrder(
  amount: number,
  currency: string = 'INR',
  receipt: string,
  notes?: Record<string, string>,
  credentials?: RazorpayCredentials
): Promise<RazorpayOrder> {
  try {
    const razorpay = getRazorpayInstance(credentials)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt,
      notes,
      payment_capture: true, // Auto-capture payment
    })

    return order as RazorpayOrder
  } catch (error) {
    console.error('Razorpay order creation failed:', error)
    throw new Error('Failed to create payment order')
  }
}

/**
 * Verify Razorpay payment signature
 * Used after successful payment on frontend
 * @param keySecret - Optional store-specific key secret
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret?: string
): boolean {
  const secret = keySecret || process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    throw new Error('Razorpay key secret not configured')
  }

  const body = orderId + '|' + paymentId
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

/**
 * Verify webhook signature
 * Used to validate incoming webhook requests from Razorpay
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

/**
 * Get payment details from Razorpay
 * @param credentials - Optional store-specific credentials
 */
export async function getPaymentDetails(
  paymentId: string,
  credentials?: RazorpayCredentials
): Promise<RazorpayPayment> {
  try {
    const razorpay = getRazorpayInstance(credentials)
    const payment = await razorpay.payments.fetch(paymentId)
    return payment as RazorpayPayment
  } catch (error) {
    console.error('Failed to fetch payment:', error)
    throw error
  }
}

/**
 * Refund payment
 * @param paymentId - Razorpay payment ID
 * @param amount - Optional amount for partial refund (in INR)
 * @param notes - Optional notes
 * @param credentials - Optional store-specific credentials
 */
export async function refundPayment(
  paymentId: string,
  amount?: number,
  notes?: Record<string, string>,
  credentials?: RazorpayCredentials
): Promise<RazorpayRefund> {
  try {
    const razorpay = getRazorpayInstance(credentials)
    const refundData: { amount?: number; notes?: Record<string, string> } = {}

    if (amount) {
      refundData.amount = Math.round(amount * 100) // Convert to paise
    }

    if (notes) {
      refundData.notes = notes
    }

    const refund = await razorpay.payments.refund(paymentId, refundData)
    return refund as RazorpayRefund
  } catch (error) {
    console.error('Refund failed:', error)
    throw error
  }
}

/**
 * Get order details from Razorpay
 * @param credentials - Optional store-specific credentials
 */
export async function getRazorpayOrderDetails(
  orderId: string,
  credentials?: RazorpayCredentials
): Promise<RazorpayOrder> {
  try {
    const razorpay = getRazorpayInstance(credentials)
    const order = await razorpay.orders.fetch(orderId)
    return order as RazorpayOrder
  } catch (error) {
    console.error('Failed to fetch order:', error)
    throw error
  }
}

/**
 * Get all payments for an order
 * @param credentials - Optional store-specific credentials
 */
export async function getOrderPayments(
  orderId: string,
  credentials?: RazorpayCredentials
): Promise<RazorpayPayment[]> {
  try {
    const razorpay = getRazorpayInstance(credentials)
    const payments = await razorpay.orders.fetchPayments(orderId)
    return (payments as { items: RazorpayPayment[] }).items || []
  } catch (error) {
    console.error('Failed to fetch order payments:', error)
    throw error
  }
}

/**
 * Capture authorized payment (if not auto-captured)
 * @param credentials - Optional store-specific credentials
 */
export async function capturePayment(
  paymentId: string,
  amount: number,
  currency: string = 'INR',
  credentials?: RazorpayCredentials
): Promise<RazorpayPayment> {
  try {
    const razorpay = getRazorpayInstance(credentials)
    const payment = await razorpay.payments.capture(
      paymentId,
      Math.round(amount * 100),
      currency
    )
    return payment as RazorpayPayment
  } catch (error) {
    console.error('Payment capture failed:', error)
    throw error
  }
}

/**
 * Get refund details
 * @param credentials - Optional store-specific credentials
 */
export async function getRefundDetails(
  paymentId: string,
  refundId: string,
  credentials?: RazorpayCredentials
): Promise<RazorpayRefund> {
  try {
    const razorpay = getRazorpayInstance(credentials)
    const refund = await razorpay.payments.fetchRefund(paymentId, refundId)
    return refund as RazorpayRefund
  } catch (error) {
    console.error('Failed to fetch refund:', error)
    throw error
  }
}

/**
 * Format amount from paise to INR
 */
export function formatAmountFromPaise(amountInPaise: number): number {
  return amountInPaise / 100
}

/**
 * Format amount from INR to paise
 */
export function formatAmountToPaise(amountInINR: number): number {
  return Math.round(amountInINR * 100)
}
