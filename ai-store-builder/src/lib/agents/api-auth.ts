// src/lib/agents/api-auth.ts
// Shared auth helper for agent API routes
// Supports both cookie-based auth (localhost) and Bearer token auth (production)

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export interface AuthResult {
  user: { id: string; email?: string }
  storeId: string
}

export interface AuthError {
  error: string
  status: number
}

export async function authenticateAgentRequest(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  // Method 1: Cookie-based auth (works on localhost)
  const supabase = await createClient()
  const { data: cookieAuth } = await supabase.auth.getUser()

  let user: { id: string; email?: string } | null = cookieAuth?.user ?? null

  // Method 2: Authorization header Bearer token fallback (for production cross-domain)
  if (!user) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseKey) {
        const tokenClient = createServiceClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
        const { data: tokenAuth } = await tokenClient.auth.getUser(token)
        if (tokenAuth?.user) {
          user = tokenAuth.user
        }
      }
    }
  }

  if (!user) {
    return { error: 'Unauthorized', status: 401 }
  }

  // Use admin client for store lookup when Bearer token was used,
  // since the cookie-based client has no session in cross-domain production
  const usedBearerToken = !cookieAuth?.user
  const storeClient = usedBearerToken ? getSupabaseAdmin() : supabase

  const { data: store, error: storeError } = await storeClient
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (storeError || !store) {
    return { error: 'No store found', status: 404 }
  }

  return { user, storeId: store.id }
}

export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'error' in result
}
