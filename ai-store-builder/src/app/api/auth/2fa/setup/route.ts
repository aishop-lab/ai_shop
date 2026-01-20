import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setupTwoFactor } from '@/lib/auth/two-factor'

export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if 2FA is already enabled
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('two_factor_enabled')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[2FA Setup] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to check profile' }, { status: 500 })
    }

    if (profile?.two_factor_enabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
    }

    // Generate 2FA setup data
    const setupData = await setupTwoFactor(user.email || user.id)

    // Store the secret temporarily (will be confirmed in verify step)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        two_factor_secret: setupData.secret,
        two_factor_backup_codes: setupData.backupCodes
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[2FA Setup] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to store 2FA data' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      qrCode: setupData.qrCodeUrl,
      backupCodes: setupData.backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a code'
    })

  } catch (error) {
    console.error('[2FA Setup] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '2FA setup failed' },
      { status: 500 }
    )
  }
}
