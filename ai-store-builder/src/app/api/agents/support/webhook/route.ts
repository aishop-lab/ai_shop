// src/app/api/agents/support/webhook/route.ts
// Inbound webhook for email (Resend) and WhatsApp (MSG91) messages
//
// TODO: Implement real webhook signature verification for each provider
// TODO: Parse actual Resend inbound email payload shape
// TODO: Parse actual MSG91 WhatsApp inbound message payload shape

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { routeIncomingMessage } from '@/lib/agents/support/channels'

// ── Placeholder signature verification ─────────────────────────────────────

/**
 * TODO: Verify HMAC signature from MSG91
 * See: https://docs.msg91.com/reference/whatsapp-webhook
 */
function verifyMsg91Signature(_request: NextRequest): boolean {
  // const signature = request.headers.get('x-hub-signature-256')
  // const secret = process.env.MSG91_WEBHOOK_SECRET
  // ... verify HMAC-SHA256 ...
  return true // placeholder — allow all for now
}

/**
 * TODO: Verify Resend inbound email webhook signature
 * See: https://resend.com/docs/dashboard/webhooks/introduction
 */
function verifyResendSignature(_request: NextRequest): boolean {
  // const signature = request.headers.get('svix-signature')
  // ... verify using svix library ...
  return true // placeholder — allow all for now
}

// ── Payload types ───────────────────────────────────────────────────────────

interface Msg91WhatsAppPayload {
  data?: {
    from?: string
    text?: string
    type?: string
    wabaNumber?: string
  }
  storeId?: string
}

interface ResendEmailPayload {
  type?: string
  data?: {
    from?: string
    subject?: string
    text?: string
    html?: string
  }
  storeId?: string
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Webhook endpoints get higher rate limits (external services)
  const rateLimitResult = rateLimit(request, RATE_LIMITS.WEBHOOK)
  if (rateLimitResult) return rateLimitResult

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Determine source: check for MSG91 vs Resend headers
  const userAgent = request.headers.get('user-agent') ?? ''
  const isMsg91 = userAgent.toLowerCase().includes('msg91') ||
    request.headers.has('x-msg91-signature')
  const isResend = request.headers.has('svix-id') ||
    request.headers.has('svix-signature')

  if (isMsg91) {
    if (!verifyMsg91Signature(request)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = body as Msg91WhatsAppPayload
    const from = payload.data?.from
    const text = payload.data?.text
    const storeId = payload.storeId

    if (!from || !text || !storeId) {
      // Missing fields — still return 200 to prevent retries from MSG91
      console.warn('[webhook] MSG91 payload missing required fields', { from, storeId })
      return NextResponse.json({ ok: true })
    }

    try {
      await routeIncomingMessage({
        channel: 'whatsapp',
        storeId,
        message: text,
        channelIdentifier: from,
      })
    } catch (error) {
      console.error('[webhook] MSG91 routing error:', error)
      // Return 200 to prevent MSG91 from re-sending; log the failure
    }

    return NextResponse.json({ ok: true })
  }

  if (isResend) {
    if (!verifyResendSignature(request)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = body as ResendEmailPayload

    // Only process inbound email events
    if (payload.type !== 'email.received') {
      return NextResponse.json({ ok: true })
    }

    const from = payload.data?.from
    const text = payload.data?.text ?? payload.data?.html ?? ''
    const storeId = payload.storeId

    if (!from || !text || !storeId) {
      console.warn('[webhook] Resend payload missing required fields', { from, storeId })
      return NextResponse.json({ ok: true })
    }

    try {
      await routeIncomingMessage({
        channel: 'email',
        storeId,
        message: text,
        channelIdentifier: from,
      })
    } catch (error) {
      console.error('[webhook] Resend routing error:', error)
    }

    return NextResponse.json({ ok: true })
  }

  // Unknown source — accept and log
  console.warn('[webhook] Unknown webhook source, headers:', Object.fromEntries(request.headers))
  return NextResponse.json({ ok: true })
}
