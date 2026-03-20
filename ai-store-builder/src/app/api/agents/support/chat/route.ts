// src/app/api/agents/support/chat/route.ts
// Public-facing customer chat endpoint — no auth required
// Rate-limited by IP to prevent abuse

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { routeIncomingMessage } from '@/lib/agents/support/channels'

const CHAT_RATE_LIMIT = {
  limit: 10,
  windowSeconds: 60,
  prefix: 'support-chat',
}

const MAX_MESSAGE_LENGTH = 2000

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit by IP — no user auth for this public endpoint
  const rateLimitResult = rateLimit(request, CHAT_RATE_LIMIT)
  if (rateLimitResult) return rateLimitResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { storeId, message, sessionId, conversationId } = body as {
    storeId?: string
    message?: string
    sessionId?: string
    conversationId?: string
  }

  // Validate required fields
  if (!storeId || typeof storeId !== 'string') {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
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

  // Verify the store exists
  const supabase = getSupabaseAdmin()
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  try {
    const result = await routeIncomingMessage({
      channel: 'website_chat',
      storeId,
      message: message.trim(),
      channelIdentifier: sessionId,
      conversationId: conversationId ?? undefined,
    })

    return NextResponse.json({
      conversationId: result.conversationId,
      response: result.response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[support/chat] Error routing message:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
