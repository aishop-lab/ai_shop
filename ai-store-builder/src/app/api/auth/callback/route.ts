import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  // Validate redirect to prevent open redirect attacks (e.g. //evil.com or javascript:)
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://')
    ? rawNext : '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth callback error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (code) {
    const supabase = await createClient()

    // Exchange authorization code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      return NextResponse.redirect(
        `${origin}/sign-in?error=${encodeURIComponent('Failed to authenticate. Please try again.')}`
      )
    }

    if (data.user) {
      // Check if user needs onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single()

      // Update login tracking
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

      // Redirect to onboarding if not completed, otherwise to dashboard
      const redirectTo = profile?.onboarding_completed ? next : '/onboarding'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // No code provided, redirect to sign-in
  return NextResponse.redirect(`${origin}/sign-in`)
}
