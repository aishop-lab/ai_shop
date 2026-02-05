/**
 * Customer Authentication Service
 *
 * Store-specific customer authentication (separate from merchant auth).
 * Uses secure password hashing and JWT-like tokens stored in database.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// Session duration: 30 days
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Hash password using scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(salt + ':' + derivedKey.toString('hex'))
    })
  })
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(key === derivedKey.toString('hex'))
    })
  })
}

/**
 * Generate secure session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash session token for storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export interface Customer {
  id: string
  store_id: string
  email: string
  phone?: string
  full_name?: string
  email_verified: boolean
  phone_verified: boolean
  avatar_url?: string
  google_id?: string
  preferences: Record<string, unknown>
  marketing_consent: boolean
  total_orders: number
  total_spent: number
  last_order_at?: string
  created_at: string
  updated_at: string
}

export interface CustomerSession {
  token: string
  customer: Customer
  expiresAt: Date
}

export interface AuthResult {
  success: boolean
  customer?: Customer
  session?: CustomerSession
  error?: string
}

/**
 * Register a new customer
 */
export async function registerCustomer(params: {
  storeId: string
  email: string
  password: string
  fullName?: string
  phone?: string
  marketingConsent?: boolean
}): Promise<AuthResult> {
  try {
    const { storeId, email, password, fullName, phone, marketingConsent } = params

    // Check if customer already exists
    const { data: existing } = await getSupabase()
      .from('customers')
      .select('id')
      .eq('store_id', storeId)
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return { success: false, error: 'An account with this email already exists' }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create customer
    const { data: customer, error: createError } = await getSupabase()
      .from('customers')
      .insert({
        store_id: storeId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        phone,
        marketing_consent: marketingConsent || false
      })
      .select()
      .single()

    if (createError || !customer) {
      console.error('Failed to create customer:', createError)
      return { success: false, error: 'Failed to create account' }
    }

    // Create session
    const session = await createSession(customer.id)
    if (!session) {
      return { success: false, error: 'Failed to create session' }
    }

    return {
      success: true,
      customer: sanitizeCustomer(customer),
      session
    }
  } catch (error) {
    console.error('Customer registration error:', error)
    return { success: false, error: 'Registration failed' }
  }
}

/**
 * Login customer
 */
export async function loginCustomer(params: {
  storeId: string
  email: string
  password: string
  deviceInfo?: Record<string, unknown>
  ipAddress?: string
}): Promise<AuthResult> {
  try {
    const { storeId, email, password, deviceInfo, ipAddress } = params

    // Find customer
    const { data: customer, error: findError } = await getSupabase()
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .eq('email', email.toLowerCase())
      .single()

    if (findError || !customer) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Verify password
    if (!customer.password_hash) {
      return { success: false, error: 'Please reset your password' }
    }

    const isValid = await verifyPassword(password, customer.password_hash)
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Create session
    const session = await createSession(customer.id, deviceInfo, ipAddress)
    if (!session) {
      return { success: false, error: 'Failed to create session' }
    }

    return {
      success: true,
      customer: sanitizeCustomer(customer),
      session
    }
  } catch (error) {
    console.error('Customer login error:', error)
    return { success: false, error: 'Login failed' }
  }
}

/**
 * Validate session token and return customer
 */
export async function validateSession(token: string): Promise<AuthResult> {
  try {
    const tokenHash = hashToken(token)

    // Find session
    const { data: session, error: sessionError } = await getSupabase()
      .from('customer_sessions')
      .select('*, customer:customers(*)')
      .eq('token_hash', tokenHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session || !session.customer) {
      return { success: false, error: 'Invalid or expired session' }
    }

    return {
      success: true,
      customer: sanitizeCustomer(session.customer),
      session: {
        token,
        customer: sanitizeCustomer(session.customer),
        expiresAt: new Date(session.expires_at)
      }
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return { success: false, error: 'Session validation failed' }
  }
}

/**
 * Logout customer (invalidate session)
 */
export async function logoutCustomer(token: string): Promise<{ success: boolean }> {
  try {
    const tokenHash = hashToken(token)

    await getSupabase()
      .from('customer_sessions')
      .delete()
      .eq('token_hash', tokenHash)

    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: false }
  }
}

/**
 * Logout all sessions for customer
 */
export async function logoutAllSessions(customerId: string): Promise<{ success: boolean }> {
  try {
    await getSupabase()
      .from('customer_sessions')
      .delete()
      .eq('customer_id', customerId)

    return { success: true }
  } catch (error) {
    console.error('Logout all error:', error)
    return { success: false }
  }
}

/**
 * Update customer profile
 */
export async function updateCustomerProfile(
  customerId: string,
  updates: {
    fullName?: string
    phone?: string
    marketingConsent?: boolean
  }
): Promise<AuthResult> {
  try {
    const { data: customer, error } = await getSupabase()
      .from('customers')
      .update({
        full_name: updates.fullName,
        phone: updates.phone,
        marketing_consent: updates.marketingConsent,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single()

    if (error || !customer) {
      return { success: false, error: 'Failed to update profile' }
    }

    return { success: true, customer: sanitizeCustomer(customer) }
  } catch (error) {
    console.error('Profile update error:', error)
    return { success: false, error: 'Update failed' }
  }
}

/**
 * Change customer password
 */
export async function changePassword(
  customerId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current password hash
    const { data: customer } = await getSupabase()
      .from('customers')
      .select('password_hash')
      .eq('id', customerId)
      .single()

    if (!customer?.password_hash) {
      return { success: false, error: 'Account error' }
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, customer.password_hash)
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' }
    }

    // Hash and update new password
    const newHash = await hashPassword(newPassword)
    await getSupabase()
      .from('customers')
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)

    // Invalidate all other sessions
    await logoutAllSessions(customerId)

    return { success: true }
  } catch (error) {
    console.error('Password change error:', error)
    return { success: false, error: 'Failed to change password' }
  }
}

/**
 * Login or register customer via Google OAuth
 */
export async function loginWithGoogle(params: {
  storeId: string
  email: string
  fullName?: string
  avatarUrl?: string
  googleId: string
  deviceInfo?: Record<string, unknown>
  ipAddress?: string
}): Promise<AuthResult> {
  try {
    const { storeId, email, fullName, avatarUrl, googleId, deviceInfo, ipAddress } = params

    // Try to find existing customer by email
    const { data: existing } = await getSupabase()
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .eq('email', email.toLowerCase())
      .single()

    let customer = existing

    if (existing) {
      // Update Google ID and avatar if not set
      if (!existing.google_id || !existing.avatar_url) {
        const { data: updated } = await getSupabase()
          .from('customers')
          .update({
            google_id: existing.google_id || googleId,
            avatar_url: existing.avatar_url || avatarUrl,
            email_verified: true, // Google emails are verified
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updated) customer = updated
      }
    } else {
      // Create new customer
      const { data: newCustomer, error: createError } = await getSupabase()
        .from('customers')
        .insert({
          store_id: storeId,
          email: email.toLowerCase(),
          full_name: fullName,
          avatar_url: avatarUrl,
          google_id: googleId,
          email_verified: true, // Google emails are verified
          marketing_consent: false
        })
        .select()
        .single()

      if (createError || !newCustomer) {
        console.error('Failed to create Google customer:', createError)
        return { success: false, error: 'Failed to create account' }
      }

      customer = newCustomer
    }

    if (!customer) {
      return { success: false, error: 'Failed to find or create customer' }
    }

    // Create session
    const session = await createSession(customer.id, deviceInfo, ipAddress)
    if (!session) {
      return { success: false, error: 'Failed to create session' }
    }

    return {
      success: true,
      customer: sanitizeCustomer(customer),
      session
    }
  } catch (error) {
    console.error('Google login error:', error)
    return { success: false, error: 'Google login failed' }
  }
}

/**
 * Find or create customer from guest order
 */
export async function findOrCreateCustomerFromOrder(params: {
  storeId: string
  email: string
  fullName?: string
  phone?: string
}): Promise<Customer | null> {
  try {
    const { storeId, email, fullName, phone } = params

    // Try to find existing customer
    const { data: existing } = await getSupabase()
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return sanitizeCustomer(existing)
    }

    // Create new customer without password (guest conversion)
    const { data: customer, error } = await getSupabase()
      .from('customers')
      .insert({
        store_id: storeId,
        email: email.toLowerCase(),
        full_name: fullName,
        phone
      })
      .select()
      .single()

    if (error || !customer) {
      console.error('Failed to create customer from order:', error)
      return null
    }

    return sanitizeCustomer(customer)
  } catch (error) {
    console.error('Find or create customer error:', error)
    return null
  }
}

// Helper functions

async function createSession(
  customerId: string,
  deviceInfo?: Record<string, unknown>,
  ipAddress?: string
): Promise<CustomerSession | null> {
  try {
    const token = generateSessionToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

    const { error } = await getSupabase()
      .from('customer_sessions')
      .insert({
        customer_id: customerId,
        token_hash: tokenHash,
        device_info: deviceInfo,
        ip_address: ipAddress,
        expires_at: expiresAt.toISOString()
      })

    if (error) {
      console.error('Failed to create session:', error)
      return null
    }

    // Get customer
    const { data: customer } = await getSupabase()
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (!customer) return null

    return {
      token,
      customer: sanitizeCustomer(customer),
      expiresAt
    }
  } catch (error) {
    console.error('Create session error:', error)
    return null
  }
}

function sanitizeCustomer(customer: Record<string, unknown>): Customer {
  // Remove sensitive fields
  const { password_hash, ...safe } = customer
  return safe as unknown as Customer
}
