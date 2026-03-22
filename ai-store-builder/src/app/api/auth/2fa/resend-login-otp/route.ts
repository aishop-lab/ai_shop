import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import {
  generateOTP,
  hashOTP,
  getOTPExpiry,
  canSendOTP,
  getCooldownRemaining,
  verifyPendingToken,
  OTP_CONFIG
} from '@/lib/auth/email-otp'
import { sendTwoFactorOTPEmail } from '@/lib/email/two-factor'

export const dynamic = 'force-dynamic'

const RESEND_OTP_RATE_LIMIT = {
  limit: 3,
  windowSeconds: 60,
  prefix: 'auth-2fa-resend'
}

interface ResendOTPRequest {
  pendingToken: string
}

export async function POST(request: NextRequest) {
  // Rate limit: 3 requests per minute per IP
  const rateLimitResult = rateLimit(request, RESEND_OTP_RATE_LIMIT)
  if (rateLimitResult) return rateLimitResult

  try {
    const body: ResendOTPRequest = await request.json()
    const { pendingToken } = body

    if (!pendingToken) {
      return NextResponse.json({ error: 'Missing pending token' }, { status: 400 })
    }

    // Verify the pending token to get the user ID
    const pendingResult = verifyPendingToken(pendingToken)
    if (!pendingResult.valid || !pendingResult.userId) {
      return NextResponse.json(
        { error: 'Invalid or expired session. Please sign in again.' },
        { status: 401 }
      )
    }

    const adminClient = await createAdminClient()

    // Get profile to check 2FA status and cooldown
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('full_name, email, two_factor_enabled, two_factor_last_otp_sent_at')
      .eq('id', pendingResult.userId)
      .single()

    if (profileError || !profile) {
      console.error('[2FA Resend OTP] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
    }

    if (!profile.two_factor_enabled) {
      return NextResponse.json({ error: '2FA is not enabled for this account' }, { status: 400 })
    }

    // Check cooldown (60 second cooldown between OTPs)
    if (!canSendOTP(profile.two_factor_last_otp_sent_at)) {
      const remaining = getCooldownRemaining(profile.two_factor_last_otp_sent_at)
      return NextResponse.json({
        error: `Please wait ${remaining} seconds before requesting another code`,
        cooldownRemaining: remaining
      }, { status: 429 })
    }

    // Generate new OTP
    const otp = generateOTP()
    const otpHash = hashOTP(otp)
    const expiresAt = getOTPExpiry()

    // Store new OTP hash and reset attempts
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        two_factor_secret: otpHash,
        two_factor_otp_expires_at: expiresAt.toISOString(),
        two_factor_otp_attempts: 0,
        two_factor_last_otp_sent_at: new Date().toISOString()
      })
      .eq('id', pendingResult.userId)

    if (updateError) {
      console.error('[2FA Resend OTP] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to generate new OTP' }, { status: 500 })
    }

    // Get user email for sending
    const { data: userData } = await adminClient.auth.admin.getUserById(pendingResult.userId)
    const email = profile.email || userData?.user?.email

    if (!email) {
      return NextResponse.json({ error: 'No email found for this account' }, { status: 500 })
    }

    // Send OTP email
    const emailResult = await sendTwoFactorOTPEmail({
      email,
      userName: profile.full_name || 'User',
      otpCode: otp,
      action: 'login'
    })

    if (!emailResult.success) {
      console.error('[2FA Resend OTP] Email error:', emailResult.error)

      if (emailResult.error?.includes('testing emails') || emailResult.error?.includes('verify a domain')) {
        return NextResponse.json({
          error: 'Email service is in testing mode. Please contact support.',
          details: emailResult.error
        }, { status: 503 })
      }

      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'New verification code sent to your email',
      expiresInMinutes: OTP_CONFIG.expiryMinutes,
      cooldownSeconds: OTP_CONFIG.cooldownSeconds
    })
  } catch (error) {
    console.error('[2FA Resend OTP] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend OTP' },
      { status: 500 }
    )
  }
}
