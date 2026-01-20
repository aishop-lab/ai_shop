import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth/two-factor'

interface DisableRequest {
  token: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body: DisableRequest = await request.json()
    const { token } = body

    if (!token || token.length !== 6) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile with 2FA data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('two_factor_enabled, two_factor_secret')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[2FA Disable] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
    }

    if (!profile.two_factor_enabled || !profile.two_factor_secret) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    // Verify the token before disabling
    const isValid = verifyToken(profile.two_factor_secret, token)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Disable 2FA
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
        two_factor_enabled_at: null
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[2FA Disable] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully'
    })

  } catch (error) {
    console.error('[2FA Disable] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
}
