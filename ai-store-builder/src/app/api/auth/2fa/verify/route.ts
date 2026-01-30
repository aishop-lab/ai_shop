import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  verifyOTP,
  isOTPExpired,
  hasExceededAttempts,
  verifyPendingToken,
  OTP_CONFIG
} from '@/lib/auth/email-otp'
import type { AuthResponse, Profile } from '@/lib/types/auth'

interface VerifyRequest {
  token: string
  action: 'enable' | 'login' | 'disable'
  pendingToken?: string
}

export async function POST(request: Request) {
  try {
    const body: VerifyRequest = await request.json()
    const { token, action = 'enable', pendingToken } = body

    if (!token || token.length !== 6) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    // For login action, we need to verify the pending token
    if (action === 'login') {
      if (!pendingToken) {
        return NextResponse.json({ error: 'Missing pending token' }, { status: 400 })
      }

      const pendingResult = verifyPendingToken(pendingToken)
      if (!pendingResult.valid) {
        return NextResponse.json({ error: pendingResult.error || 'Invalid session' }, { status: 401 })
      }

      const adminClient = await createAdminClient()

      // Get profile with OTP data
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('two_factor_enabled, two_factor_secret, two_factor_otp_expires_at, two_factor_otp_attempts')
        .eq('id', pendingResult.userId)
        .single()

      if (profileError || !profile) {
        console.error('[2FA Verify] Profile error:', profileError)
        return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
      }

      if (!profile.two_factor_enabled) {
        return NextResponse.json({ error: '2FA is not enabled for this account' }, { status: 400 })
      }

      if (!profile.two_factor_secret) {
        return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 })
      }

      // Check if OTP expired
      if (isOTPExpired(profile.two_factor_otp_expires_at)) {
        return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 })
      }

      // Check attempts
      if (hasExceededAttempts(profile.two_factor_otp_attempts || 0)) {
        return NextResponse.json({
          error: `Too many failed attempts. Please request a new code.`,
          maxAttempts: OTP_CONFIG.maxAttempts
        }, { status: 429 })
      }

      // Verify OTP
      const isValid = verifyOTP(token, profile.two_factor_secret)

      if (!isValid) {
        // Increment attempts
        await adminClient
          .from('profiles')
          .update({ two_factor_otp_attempts: (profile.two_factor_otp_attempts || 0) + 1 })
          .eq('id', pendingResult.userId)

        const attemptsRemaining = OTP_CONFIG.maxAttempts - (profile.two_factor_otp_attempts || 0) - 1
        return NextResponse.json({
          error: 'Invalid verification code',
          attemptsRemaining: Math.max(0, attemptsRemaining)
        }, { status: 400 })
      }

      // Clear OTP data
      await adminClient
        .from('profiles')
        .update({
          two_factor_secret: null,
          two_factor_otp_expires_at: null,
          two_factor_otp_attempts: 0
        })
        .eq('id', pendingResult.userId)

      // Update login tracking
      const { data: currentProfile } = await adminClient
        .from('profiles')
        .select('login_count')
        .eq('id', pendingResult.userId)
        .single()

      await adminClient
        .from('profiles')
        .update({
          last_login_at: new Date().toISOString(),
          login_count: (currentProfile?.login_count || 0) + 1
        })
        .eq('id', pendingResult.userId)

      // Get full profile for response
      const { data: fullProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', pendingResult.userId)
        .single()

      // Get user email
      const { data: userData } = await adminClient.auth.admin.getUserById(pendingResult.userId!)

      return NextResponse.json<AuthResponse>({
        success: true,
        message: '2FA verification successful',
        user: {
          id: pendingResult.userId!,
          email: userData?.user?.email || ''
        },
        profile: fullProfile as Profile
      })
    }

    // For enable/disable actions, user must be authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile with 2FA data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('two_factor_enabled, two_factor_secret, two_factor_otp_expires_at, two_factor_otp_attempts')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[2FA Verify] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
    }

    if (!profile.two_factor_secret) {
      return NextResponse.json({ error: 'No verification code found. Please start setup first.' }, { status: 400 })
    }

    // Check if OTP expired
    if (isOTPExpired(profile.two_factor_otp_expires_at)) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 })
    }

    // Check attempts
    if (hasExceededAttempts(profile.two_factor_otp_attempts || 0)) {
      return NextResponse.json({
        error: `Too many failed attempts. Please request a new code.`,
        maxAttempts: OTP_CONFIG.maxAttempts
      }, { status: 429 })
    }

    // Verify the OTP
    const isValid = verifyOTP(token, profile.two_factor_secret)

    if (!isValid) {
      // Increment attempts
      await supabase
        .from('profiles')
        .update({ two_factor_otp_attempts: (profile.two_factor_otp_attempts || 0) + 1 })
        .eq('id', user.id)

      const attemptsRemaining = OTP_CONFIG.maxAttempts - (profile.two_factor_otp_attempts || 0) - 1
      return NextResponse.json({
        error: 'Invalid verification code',
        attemptsRemaining: Math.max(0, attemptsRemaining)
      }, { status: 400 })
    }

    // Handle enable action
    if (action === 'enable') {
      if (profile.two_factor_enabled) {
        return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          two_factor_enabled: true,
          two_factor_enabled_at: new Date().toISOString(),
          two_factor_secret: null,
          two_factor_otp_expires_at: null,
          two_factor_otp_attempts: 0
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('[2FA Verify] Enable error:', updateError)
        return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: '2FA has been enabled successfully'
      })
    }

    // Handle disable action
    if (action === 'disable') {
      if (!profile.two_factor_enabled) {
        return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          two_factor_otp_expires_at: null,
          two_factor_otp_attempts: 0,
          two_factor_enabled_at: null,
          two_factor_backup_codes: null
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('[2FA Verify] Disable error:', updateError)
        return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: '2FA has been disabled successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('[2FA Verify] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '2FA verification failed' },
      { status: 500 }
    )
  }
}
