import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import {
  generateOTP,
  hashOTP,
  getOTPExpiry,
  canSendOTP,
  getCooldownRemaining,
  OTP_CONFIG
} from '@/lib/auth/email-otp'
import { sendTwoFactorOTPEmail } from '@/lib/email/two-factor'

const DISABLE_2FA_RATE_LIMIT = {
  limit: 5,
  windowSeconds: 60,
  prefix: 'auth-2fa-disable'
}

/**
 * POST /api/auth/2fa/disable
 *
 * Send an OTP to start the disable flow.
 * The actual disabling happens in /api/auth/2fa/verify with action='disable'
 */
export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per minute per IP
  const rateLimitResult = rateLimit(request, DISABLE_2FA_RATE_LIMIT)
  if (rateLimitResult) return rateLimitResult

  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile with 2FA data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, two_factor_enabled, two_factor_last_otp_sent_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[2FA Disable] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
    }

    if (!profile.two_factor_enabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    // Check rate limiting (60 second cooldown)
    if (!canSendOTP(profile.two_factor_last_otp_sent_at)) {
      const remaining = getCooldownRemaining(profile.two_factor_last_otp_sent_at)
      return NextResponse.json({
        error: `Please wait ${remaining} seconds before requesting another code`,
        cooldownRemaining: remaining
      }, { status: 429 })
    }

    // Generate OTP
    const otp = generateOTP()
    const otpHash = hashOTP(otp)
    const expiresAt = getOTPExpiry()

    // Store OTP hash
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        two_factor_secret: otpHash,
        two_factor_otp_expires_at: expiresAt.toISOString(),
        two_factor_otp_attempts: 0,
        two_factor_last_otp_sent_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[2FA Disable] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    // Send OTP email
    const emailResult = await sendTwoFactorOTPEmail({
      email: profile.email || user.email!,
      userName: profile.full_name || 'User',
      otpCode: otp,
      action: 'disable'
    })

    if (!emailResult.success) {
      console.error('[2FA Disable] Email error:', emailResult.error)
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email. Enter the code to disable 2FA.',
      expiresInMinutes: OTP_CONFIG.expiryMinutes,
      cooldownSeconds: OTP_CONFIG.cooldownSeconds
    })

  } catch (error) {
    console.error('[2FA Disable] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate 2FA disable' },
      { status: 500 }
    )
  }
}
