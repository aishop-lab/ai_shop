/**
 * Supabase Admin Client
 *
 * Provides a lazy-initialized Supabase client with service role access.
 * Use this instead of creating clients at module level to avoid build-time errors.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseAdmin: SupabaseClient | null = null

/**
 * Get the Supabase admin client (service role)
 * Lazily initialized to avoid build-time errors when env vars aren't available
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('Supabase credentials not configured')
    }

    supabaseAdmin = createClient(url, key)
  }
  return supabaseAdmin
}
