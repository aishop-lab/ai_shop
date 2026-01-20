import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

const APP_NAME = 'AI Store Builder'

export interface TwoFactorSecret {
  base32: string
  otpauth_url: string
}

export interface TwoFactorSetupData {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

/**
 * Generate a new TOTP secret for 2FA setup
 */
export function generateSecret(userEmail: string): TwoFactorSecret {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${userEmail})`,
    length: 32
  })

  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url || ''
  }
}

/**
 * Generate QR code data URL from secret
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.error('QR Code generation failed:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Verify a TOTP token against a secret
 */
export function verifyToken(secret: string, token: string): boolean {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Allow 1 step variance (30 seconds before/after)
    })
  } catch (error) {
    console.error('Token verification failed:', error)
    return false
  }
}

/**
 * Generate backup codes for 2FA recovery
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars (0/O, 1/I)

  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 8; j++) {
      if (j === 4) code += '-' // Add hyphen in middle for readability
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    codes.push(code)
  }

  return codes
}

/**
 * Hash backup codes for storage (simple hash for demo - use bcrypt in production)
 */
export function hashBackupCodes(codes: string[]): string[] {
  // In production, use bcrypt or argon2 to hash these
  // For now, we store them as-is in the database (encrypted at rest by Supabase)
  return codes
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(code: string, storedCodes: string[]): { valid: boolean; usedIndex: number } {
  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')

  for (let i = 0; i < storedCodes.length; i++) {
    const storedCode = storedCodes[i]
    if (!storedCode) continue // Already used

    const normalizedStored = storedCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (normalizedCode === normalizedStored) {
      return { valid: true, usedIndex: i }
    }
  }

  return { valid: false, usedIndex: -1 }
}

/**
 * Complete 2FA setup - returns all data needed for setup
 */
export async function setupTwoFactor(userEmail: string): Promise<TwoFactorSetupData> {
  const secret = generateSecret(userEmail)
  const qrCodeUrl = await generateQRCode(secret.otpauth_url)
  const backupCodes = generateBackupCodes()

  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes
  }
}
