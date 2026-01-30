import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateOTP,
  hashOTP,
  getOTPExpiry,
  canSendOTP,
  getCooldownRemaining,
  OTP_CONFIG
} from '@/lib/auth/email-otp'
import { sendTwoFactorOTPEmail } from '@/lib/email/two-factor'

interface SendOTPRequest {
  action: 'login' | 'enable' | 'disable'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body: SendOTPRequest = await request.json()
    const { action } = body

    if (!action || !['login', 'enable', 'disable'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, two_factor_enabled, two_factor_last_otp_sent_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[2FA Send OTP] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
    }

    // Validate action based on current 2FA state
    if (action === 'enable' && profile.two_factor_enabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
    }

    if (action === 'disable' && !profile.two_factor_enabled) {
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

    // Store OTP hash and reset attempts
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
      console.error('[2FA Send OTP] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    // Send email
    const emailResult = await sendTwoFactorOTPEmail({
      email: profile.email || user.email!,
      userName: profile.full_name || 'User',
      otpCode: otp,
      action
    })

    if (!emailResult.success) {
      console.error('[2FA Send OTP] Email error:', emailResult.error)

      // Check for Resend testing mode limitation
      if (emailResult.error?.includes('testing emails') || emailResult.error?.includes('verify a domain')) {
        return NextResponse.json({
          error: 'Email service is in testing mode. Please verify a domain in Resend or use the account owner email for testing.',
          details: emailResult.error
        }, { status: 503 })
      }

      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      expiresInMinutes: OTP_CONFIG.expiryMinutes,
      cooldownSeconds: OTP_CONFIG.cooldownSeconds
    })

  } catch (error) {
    console.error('[2FA Send OTP] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
