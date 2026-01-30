import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { signInSchema } from '@/lib/validations/auth'
import { handleAuthError } from '@/lib/utils/errors'
import { getUserProfile } from '@/lib/auth/utils'
import {
  generateOTP,
  hashOTP,
  getOTPExpiry,
  createPendingToken
} from '@/lib/auth/email-otp'
import { sendTwoFactorOTPEmail } from '@/lib/email/two-factor'
import type { AuthResponse } from '@/lib/types/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = signInSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json<AuthResponse>(
        { success: false, error: errors },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Check if user exists by looking for their profile (using admin client to bypass RLS)
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, full_name, two_factor_enabled')
      .eq('email', email)
      .maybeSingle()

    if (!existingProfile) {
      // No account with this email - return specific error code
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          error: 'No account found with this email',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      const errorResponse = handleAuthError(error)
      return NextResponse.json<AuthResponse>(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      )
    }

    if (!data.user) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if 2FA is enabled
    if (existingProfile.two_factor_enabled) {
      // Generate OTP and send email
      const otp = generateOTP()
      const otpHash = hashOTP(otp)
      const expiresAt = getOTPExpiry()

      // Store OTP hash in profile
      await adminClient
        .from('profiles')
        .update({
          two_factor_secret: otpHash,
          two_factor_otp_expires_at: expiresAt.toISOString(),
          two_factor_otp_attempts: 0,
          two_factor_last_otp_sent_at: new Date().toISOString()
        })
        .eq('id', data.user.id)

      // Send OTP email
      const emailResult = await sendTwoFactorOTPEmail({
        email,
        userName: existingProfile.full_name || 'User',
        otpCode: otp,
        action: 'login'
      })

      if (!emailResult.success) {
        console.error('[Sign-in 2FA] Email error:', emailResult.error)
        // Sign out since we couldn't send the OTP
        await supabase.auth.signOut()

        // Check for Resend testing mode limitation
        if (emailResult.error?.includes('testing emails') || emailResult.error?.includes('verify a domain')) {
          return NextResponse.json<AuthResponse>(
            {
              success: false,
              error: 'Email service is in testing mode. Please contact support or verify your domain in Resend.'
            },
            { status: 503 }
          )
        }

        return NextResponse.json<AuthResponse>(
          { success: false, error: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        )
      }

      // Create pending token
      const pendingToken = createPendingToken(data.user.id)

      // Sign out the temporary session (user needs to complete 2FA first)
      await supabase.auth.signOut()

      return NextResponse.json<AuthResponse>(
        {
          success: true,
          message: 'Verification code sent to your email',
          requires2FA: true,
          pendingToken
        },
        { status: 200 }
      )
    }

    // Update login tracking (last_login_at and increment login_count)
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('login_count')
      .eq('id', data.user.id)
      .single()

    await supabase
      .from('profiles')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: (currentProfile?.login_count || 0) + 1
      })
      .eq('id', data.user.id)

    // Fetch user profile
    const profile = await getUserProfile(data.user.id)

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        message: 'Signed in successfully',
        user: {
          id: data.user.id,
          email: data.user.email!
        },
        profile
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Sign in error:', error)
    const errorResponse = handleAuthError(error)
    return NextResponse.json<AuthResponse>(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    )
  }
}
