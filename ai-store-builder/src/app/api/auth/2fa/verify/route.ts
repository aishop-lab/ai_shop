import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth/two-factor'

interface VerifyRequest {
  token: string
  action: 'enable' | 'login'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body: VerifyRequest = await request.json()
    const { token, action = 'enable' } = body

    if (!token || token.length !== 6) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile with 2FA secret
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('two_factor_enabled, two_factor_secret')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[2FA Verify] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
    }

    if (!profile.two_factor_secret) {
      return NextResponse.json({ error: '2FA not set up. Please start setup first.' }, { status: 400 })
    }

    // Verify the token
    const isValid = verifyToken(profile.two_factor_secret, token)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Handle different actions
    if (action === 'enable') {
      // Enable 2FA for the first time
      if (profile.two_factor_enabled) {
        return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          two_factor_enabled: true,
          two_factor_enabled_at: new Date().toISOString()
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

    // Login verification
    return NextResponse.json({
      success: true,
      message: '2FA verification successful'
    })

  } catch (error) {
    console.error('[2FA Verify] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '2FA verification failed' },
      { status: 500 }
    )
  }
}
