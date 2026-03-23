// src/app/api/storefront/support/chat/route.ts
// Public-facing storefront chat endpoint — scoped by storeSlug
// No auth required (public customer endpoint). Rate-limited by IP.

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getAgentState } from '@/lib/agents/db'
import { routeIncomingMessage } from '@/lib/agents/support/channels'

const CHAT_RATE_LIMIT = {
  limit: 10,
  windowSeconds: 60,
  prefix: 'storefront-support-chat',
}

const MAX_MESSAGE_LENGTH = 2000

/**
 * POST /api/storefront/support/chat
 * Body: { storeSlug: string, message: string, sessionId: string, conversationId?: string, customerEmail?: string }
 * Returns: { conversationId, response, timestamp, language }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit by IP
  const rateLimitResult = rateLimit(request, CHAT_RATE_LIMIT)
  if (rateLimitResult) return rateLimitResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { storeSlug, message, sessionId, conversationId, customerEmail } = body as {
    storeSlug?: string
    message?: string
    sessionId?: string
    conversationId?: string
    customerEmail?: string
  }

  // Validate required fields
  if (!storeSlug || typeof storeSlug !== 'string') {
    return NextResponse.json({ error: 'storeSlug is required' }, { status: 400 })
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `message must be under ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 }
    )
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  // Resolve storeSlug to storeId
  const supabase = getSupabaseAdmin()
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('slug', storeSlug)
    .single()

  if (storeError || !store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  // Check if the support agent is enabled for this store
  const supportState = await getAgentState(store.id, 'support')
  if (!supportState?.is_enabled) {
    return NextResponse.json(
      { error: 'support_not_enabled', message: 'Support chat is not currently available for this store.' },
      { status: 403 }
    )
  }

  try {
    const result = await routeIncomingMessage({
      channel: 'website_chat',
      storeId: store.id,
      message: message.trim(),
      channelIdentifier: sessionId,
      conversationId: conversationId ?? undefined,
    })

    return NextResponse.json({
      conversationId: result.conversationId,
      response: result.response,
      language: result.language,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[storefront/support/chat] Error routing message:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

/**
 * GET /api/storefront/support/chat?storeSlug=...
 * Check availability of support chat for a given store slug.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const storeSlug = request.nextUrl.searchParams.get('storeSlug')
  if (!storeSlug) {
    return NextResponse.json({ available: false })
  }

  const supabase = getSupabaseAdmin()
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', storeSlug)
    .single()

  if (!store) {
    return NextResponse.json({ available: false })
  }

  const supportState = await getAgentState(store.id, 'support')
  return NextResponse.json({ available: supportState?.is_enabled === true })
}
