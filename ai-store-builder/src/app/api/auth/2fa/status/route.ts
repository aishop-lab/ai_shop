import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get 2FA status from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('two_factor_enabled, two_factor_enabled_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[2FA Status] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get 2FA status' }, { status: 500 })
    }

    return NextResponse.json({
      enabled: profile?.two_factor_enabled || false,
      enabledAt: profile?.two_factor_enabled_at || null
    })

  } catch (error) {
    console.error('[2FA Status] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get 2FA status' },
      { status: 500 }
    )
  }
}
