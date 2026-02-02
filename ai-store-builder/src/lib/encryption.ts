import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM recommended IV length
const AUTH_TAG_LENGTH = 16
const ENCODING = 'base64'

/**
 * Get the encryption key from environment variable.
 * Key must be 32 bytes (256 bits) encoded in base64.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY
  if (!key) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY environment variable is not set')
  }

  const keyBuffer = Buffer.from(key, 'base64')
  if (keyBuffer.length !== 32) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY must be 32 bytes (256 bits) encoded in base64')
  }

  return keyBuffer
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 encoded string containing: IV + ciphertext + auth tag
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string (base64 encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const authTag = cipher.getAuthTag()

  // Combine IV + ciphertext + auth tag
  const combined = Buffer.concat([iv, encrypted, authTag])

  return combined.toString(ENCODING)
}

/**
 * Decrypt a ciphertext string encrypted with AES-256-GCM.
 * Expects a base64 encoded string containing: IV + ciphertext + auth tag
 *
 * @param ciphertext - The encrypted string (base64 encoded)
 * @returns Decrypted plaintext string
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(ciphertext, ENCODING)

  // Extract IV, ciphertext, and auth tag
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Generate a new encryption key suitable for CREDENTIALS_ENCRYPTION_KEY.
 * Returns a 32-byte key encoded in base64.
 *
 * Usage: Run this once to generate a key for your .env file
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64')
}

/**
 * Mask a sensitive value, showing only the last 4 characters.
 * Used for displaying credentials in UI without exposing full values.
 *
 * @param value - The value to mask
 * @returns Masked string like "••••••••abcd"
 */
export function maskSecret(value: string): string {
  if (!value || value.length < 4) {
    return '••••••••'
  }
  const lastFour = value.slice(-4)
  return `••••••••${lastFour}`
}
