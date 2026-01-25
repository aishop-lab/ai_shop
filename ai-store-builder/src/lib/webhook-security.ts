/**
 * Webhook Security Utility
 *
 * Provides signature verification for payment webhooks (Razorpay)
 * and IP allowlisting for shipping webhooks (Shiprocket).
 */

import crypto from 'crypto'
import { NextRequest } from 'next/server'

// Razorpay webhook signature verification
// Documentation: https://razorpay.com/docs/webhooks/validate-test/

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || ''

/**
 * Verify Razorpay webhook signature
 * The signature is sent in the X-Razorpay-Signature header
 */
export function verifyRazorpayWebhook(
  body: string,
  signature: string
): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.warn('[Webhook] Razorpay webhook secret not configured')
    return false
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('[Webhook] Razorpay signature verification error:', error)
    return false
  }
}

/**
 * Verify Razorpay payment signature (for order verification)
 * Used after payment completion to verify the payment
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || ''

  if (!razorpayKeySecret) {
    console.warn('[Webhook] Razorpay key secret not configured')
    return false
  }

  try {
    const body = `${params.orderId}|${params.paymentId}`
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(body)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(params.signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('[Webhook] Payment signature verification error:', error)
    return false
  }
}

// Shiprocket IP Allowlist
// Shiprocket sends webhooks from specific IP addresses
// Documentation: https://apidocs.shiprocket.in/webhooks

const SHIPROCKET_ALLOWED_IPS = [
  // Shiprocket production IPs (update these based on Shiprocket documentation)
  '43.252.197.60',
  '43.252.197.61',
  '43.252.197.62',
  '43.252.197.63',
  '43.252.197.64',
  '13.126.77.203',
  '13.127.164.117',
  '13.232.212.70',
  '13.232.114.80',
  '15.206.85.133',
  '15.207.98.159',
  // Add localhost for development
  '127.0.0.1',
  '::1'
]

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for real IP (behind proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')

  // Cloudflare sends the real IP in CF-Connecting-IP
  if (cfIp) return cfIp

  // x-real-ip is often set by reverse proxies
  if (realIp) return realIp

  // x-forwarded-for can contain multiple IPs, the first is the original client
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim())
    return ips[0]
  }

  return 'unknown'
}

/**
 * Verify Shiprocket webhook by IP allowlist
 */
export function verifyShiprocketWebhook(request: NextRequest): boolean {
  // In development, allow all IPs
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  const clientIP = getClientIP(request)

  if (SHIPROCKET_ALLOWED_IPS.includes(clientIP)) {
    return true
  }

  console.warn(`[Webhook] Rejected Shiprocket webhook from IP: ${clientIP}`)
  return false
}

// Idempotency handling to prevent duplicate webhook processing

const processedWebhooks = new Map<string, number>()

// Clean up old entries every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    for (const [key, timestamp] of processedWebhooks.entries()) {
      if (timestamp < oneHourAgo) {
        processedWebhooks.delete(key)
      }
    }
  }, 60 * 60 * 1000)
}

/**
 * Check if a webhook has already been processed (idempotency)
 * Returns true if the webhook is new and should be processed
 * Returns false if the webhook has already been processed
 */
export function checkWebhookIdempotency(
  webhookId: string,
  maxAge: number = 24 * 60 * 60 * 1000 // 24 hours default
): boolean {
  const now = Date.now()
  const existingTimestamp = processedWebhooks.get(webhookId)

  if (existingTimestamp) {
    // Check if the entry is still within the max age
    if (now - existingTimestamp < maxAge) {
      console.log(`[Webhook] Duplicate webhook detected: ${webhookId}`)
      return false
    }
  }

  // Mark as processed
  processedWebhooks.set(webhookId, now)
  return true
}

/**
 * Generate a unique webhook ID for idempotency
 */
export function generateWebhookId(
  source: 'razorpay' | 'shiprocket',
  eventType: string,
  resourceId: string
): string {
  return `${source}:${eventType}:${resourceId}`
}

// Webhook event logging

interface WebhookLog {
  id: string
  source: string
  eventType: string
  resourceId: string
  status: 'success' | 'failed' | 'duplicate'
  error?: string
  timestamp: string
  processingTime?: number
}

const webhookLogs: WebhookLog[] = []
const MAX_LOGS = 1000

/**
 * Log webhook event
 */
export function logWebhookEvent(log: Omit<WebhookLog, 'timestamp'>): void {
  const entry: WebhookLog = {
    ...log,
    timestamp: new Date().toISOString()
  }

  webhookLogs.unshift(entry)

  // Keep only recent logs
  if (webhookLogs.length > MAX_LOGS) {
    webhookLogs.pop()
  }

  // Also log to console
  console.log(`[Webhook] ${log.source}/${log.eventType}: ${log.status}`, {
    resourceId: log.resourceId,
    error: log.error,
    processingTime: log.processingTime
  })
}

/**
 * Get recent webhook logs (for admin/debugging)
 */
export function getWebhookLogs(limit: number = 100): WebhookLog[] {
  return webhookLogs.slice(0, limit)
}

// Webhook validation wrapper

interface WebhookValidationResult {
  valid: boolean
  error?: string
  webhookId?: string
}

/**
 * Validate Razorpay webhook request
 */
export function validateRazorpayWebhook(
  request: NextRequest,
  rawBody: string
): WebhookValidationResult {
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature) {
    return { valid: false, error: 'Missing signature header' }
  }

  if (!verifyRazorpayWebhook(rawBody, signature)) {
    return { valid: false, error: 'Invalid signature' }
  }

  return { valid: true }
}

/**
 * Validate Shiprocket webhook request
 */
export function validateShiprocketWebhook(
  request: NextRequest
): WebhookValidationResult {
  if (!verifyShiprocketWebhook(request)) {
    const clientIP = getClientIP(request)
    return { valid: false, error: `IP not allowed: ${clientIP}` }
  }

  return { valid: true }
}

// Export types
export type { WebhookLog, WebhookValidationResult }
