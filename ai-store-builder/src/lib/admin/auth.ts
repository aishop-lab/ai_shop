/**
 * Admin Authentication Utilities
 */

import { verifyAuth } from '@/lib/auth/utils'
import { ADMIN_EMAIL } from './constants'

/**
 * Verify that the current user is the platform admin
 * Returns auth data if admin, null otherwise
 */
export async function verifyAdmin() {
  const auth = await verifyAuth()

  if (!auth) {
    return null
  }

  if (auth.user.email !== ADMIN_EMAIL) {
    return null
  }

  return auth
}

/**
 * Check if an email is the admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL
}
