// src/app/api/agents/support/webhook/route.ts
// Inbound webhook for email (Resend) and WhatsApp (MSG91) messages
//
// TODO: Parse actual Resend inbound email payload shape
// TODO: Parse actual MSG91 WhatsApp inbound message payload shape

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { routeIncomingMessage } from '@/lib/agents/support/channels'

// ── Webhook signature verification ──────────────────────────────────────────

/**
 * Verify HMAC signature from MSG91
 * See: https://docs.msg91.com/reference/whatsapp-webhook
 */
function verifyMsg91Signature(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.MSG91_WEBHOOK_SECRET
  if (!secret) {
    // In development without secret configured, allow through with warning
    console.warn('[webhook] MSG91_WEBHOOK_SECRET not configured — skipping verification')
    return true
  }

  const signature = request.headers.get('x-msg91-signature') ||
                    request.headers.get('x-hub-signature-256')
  if (!signature) {
    console.warn('[webhook] No MSG91 signature header found')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

/**
 * Verify Resend inbound email webhook signature (svix)
 * See: https://resend.com/docs/dashboard/webhooks/introduction
 */
function verifyResendSignature(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[webhook] RESEND_WEBHOOK_SECRET not configured — skipping verification')
    return true
  }

  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn('[webhook] Missing Resend/svix headers')
    return false
  }

  // Replay protection: reject if timestamp is more than 5 minutes old
  const timestamp = parseInt(svixTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > 300) {
    console.warn('[webhook] Resend timestamp too old — possible replay attack')
    return false
  }

  // Compute expected signature
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`
  const secretBytes = Buffer.from(secret.split('_')[1] || secret, 'base64')
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64')

  // svix-signature may contain multiple signatures (space-separated)
  const signatures = svixSignature.split(' ')
  return signatures.some(sig => {
    const sigValue = sig.startsWith('v1,') ? sig.slice(3) : sig
    try {
      return crypto.timingSafeEqual(
        Buffer.from(sigValue),
        Buffer.from(expectedSignature)
      )
    } catch {
      return false
    }
  })
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

  let rawBody: string
  let body: Record<string, unknown>
  try {
    rawBody = await request.text()
    body = JSON.parse(rawBody)
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
    if (!verifyMsg91Signature(request, rawBody)) {
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
    if (!verifyResendSignature(request, rawBody)) {
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
