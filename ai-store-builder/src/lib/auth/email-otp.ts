import { createHash, randomInt } from 'crypto'

const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10
const OTP_COOLDOWN_SECONDS = 60
const MAX_OTP_ATTEMPTS = 5
const PENDING_TOKEN_EXPIRY_MINUTES = 10

/**
 * Generate a secure 6-digit OTP
 */
export function generateOTP(): string {
  const min = Math.pow(10, OTP_LENGTH - 1)
  const max = Math.pow(10, OTP_LENGTH) - 1
  return randomInt(min, max + 1).toString()
}

/**
 * Hash an OTP for secure storage using SHA-256
 * Note: For production, consider bcrypt, but SHA-256 is acceptable for short-lived OTPs
 */
export function hashOTP(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

/**
 * Verify an OTP against a stored hash
 */
export function verifyOTP(otp: string, storedHash: string): boolean {
  const inputHash = hashOTP(otp)
  // Constant-time comparison to prevent timing attacks
  if (inputHash.length !== storedHash.length) return false
  let result = 0
  for (let i = 0; i < inputHash.length; i++) {
    result |= inputHash.charCodeAt(i) ^ storedHash.charCodeAt(i)
  }
  return result === 0
}

/**
 * Check if an OTP has expired
 */
export function isOTPExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return true
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return new Date() > expiry
}

/**
 * Get the expiry timestamp for a new OTP
 */
export function getOTPExpiry(): Date {
  const expiry = new Date()
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES)
  return expiry
}

/**
 * Check if enough time has passed since last OTP was sent (cooldown)
 */
export function canSendOTP(lastSentAt: Date | string | null): boolean {
  if (!lastSentAt) return true
  const lastSent = typeof lastSentAt === 'string' ? new Date(lastSentAt) : lastSentAt
  const now = new Date()
  const diffSeconds = (now.getTime() - lastSent.getTime()) / 1000
  return diffSeconds >= OTP_COOLDOWN_SECONDS
}

/**
 * Get remaining cooldown time in seconds
 */
export function getCooldownRemaining(lastSentAt: Date | string | null): number {
  if (!lastSentAt) return 0
  const lastSent = typeof lastSentAt === 'string' ? new Date(lastSentAt) : lastSentAt
  const now = new Date()
  const diffSeconds = (now.getTime() - lastSent.getTime()) / 1000
  const remaining = OTP_COOLDOWN_SECONDS - diffSeconds
  return Math.max(0, Math.ceil(remaining))
}

/**
 * Check if max attempts have been exceeded
 */
export function hasExceededAttempts(attempts: number): boolean {
  return attempts >= MAX_OTP_ATTEMPTS
}

/**
 * Create a pending session token for 2FA verification
 * This is a simple signed token containing the user ID and expiry
 */
export function createPendingToken(userId: string): string {
  const expiry = new Date()
  expiry.setMinutes(expiry.getMinutes() + PENDING_TOKEN_EXPIRY_MINUTES)

  const payload = {
    userId,
    expiresAt: expiry.toISOString(),
    type: '2fa-pending'
  }

  const payloadStr = JSON.stringify(payload)
  const signature = createHash('sha256')
    .update(payloadStr + (process.env.SUPABASE_SERVICE_ROLE_KEY || 'secret'))
    .digest('hex')

  const token = Buffer.from(JSON.stringify({ payload: payloadStr, signature })).toString('base64')
  return token
}

/**
 * Verify and decode a pending session token
 */
export function verifyPendingToken(token: string): { valid: boolean; userId?: string; error?: string } {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'))
    const { payload: payloadStr, signature } = decoded

    // Verify signature
    const expectedSignature = createHash('sha256')
      .update(payloadStr + (process.env.SUPABASE_SERVICE_ROLE_KEY || 'secret'))
      .digest('hex')

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' }
    }

    const payload = JSON.parse(payloadStr)

    // Check type
    if (payload.type !== '2fa-pending') {
      return { valid: false, error: 'Invalid token type' }
    }

    // Check expiry
    if (new Date() > new Date(payload.expiresAt)) {
      return { valid: false, error: 'Token expired' }
    }

    return { valid: true, userId: payload.userId }
  } catch {
    return { valid: false, error: 'Invalid token format' }
  }
}

// Re-export constants for use in other modules
export const OTP_CONFIG = {
  length: OTP_LENGTH,
  expiryMinutes: OTP_EXPIRY_MINUTES,
  cooldownSeconds: OTP_COOLDOWN_SECONDS,
  maxAttempts: MAX_OTP_ATTEMPTS,
  pendingTokenExpiryMinutes: PENDING_TOKEN_EXPIRY_MINUTES
}
