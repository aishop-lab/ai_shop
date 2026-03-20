// src/lib/agents/auth.ts
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export interface AuthenticatedUser {
  id: string
  email?: string
}

export interface AuthResult {
  user: AuthenticatedUser | null
  error: string | null
  status: number
}

/**
 * Authenticate a request using cookie-based auth (localhost) or
 * Authorization Bearer token (production cross-domain).
 * Same pattern as app/api/ai/bot/route.ts but extracted for reuse.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  // Method 1: Cookie-based auth (works on localhost)
  let user: AuthenticatedUser | null = null

  const supabase = await createClient()
  const { data: cookieAuth } = await supabase.auth.getUser()
  if (cookieAuth?.user) {
    user = { id: cookieAuth.user.id, email: cookieAuth.user.email }
  }

  // Method 2: Authorization header (fallback for production)
  if (!user) {
    const authHeader = req.headers.get('authorization')
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
          user = { id: tokenAuth.user.id, email: tokenAuth.user.email }
        }
      }
    }
  }

  if (!user) {
    return { user: null, error: 'Unauthorized', status: 401 }
  }

  return { user, error: null, status: 200 }
}

/**
 * Authenticate and verify the user owns the store that owns the agent.
 * Looks up the agent_states row by agentId, gets the store_id, then
 * verifies the user owns that store.
 *
 * Returns the authenticated user and store_id, or an error Response.
 */
export async function authenticateAgentRequest(
  req: Request,
  agentId: string
): Promise<{ user: AuthenticatedUser; storeId: string } | Response> {
  const auth = await authenticateRequest(req)
  if (!auth.user) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Look up agent to get store_id
  const admin = getSupabaseAdmin()
  const { data: agent, error: agentError } = await admin
    .from('agent_states')
    .select('store_id')
    .eq('id', agentId)
    .single()

  if (agentError || !agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify user owns the store
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id')
    .eq('id', agent.store_id)
    .eq('owner_id', auth.user.id)
    .single()

  if (storeError || !store) {
    return new Response(JSON.stringify({ error: 'Store not found or unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { user: auth.user, storeId: agent.store_id }
}

/**
 * Authenticate and verify the user owns a specific store.
 * Used by routes that receive storeId as a query param instead of agentId.
 */
export async function authenticateStoreRequest(
  req: Request,
  storeId: string
): Promise<{ user: AuthenticatedUser; storeId: string } | Response> {
  const auth = await authenticateRequest(req)
  if (!auth.user) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const admin = getSupabaseAdmin()
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', auth.user.id)
    .single()

  if (storeError || !store) {
    return new Response(JSON.stringify({ error: 'Store not found or unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { user: auth.user, storeId }
}

/**
 * Helper to build a JSON error response.
 */
export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Helper to build a JSON success response.
 */
export function jsonSuccess(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
