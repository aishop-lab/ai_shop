import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AuthResponse } from '@/lib/types/auth'

export async function POST() {
  try {
    const supabase = await createClient()

    // Sign out from Supabase (clears session and cookies)
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Failed to sign out' },
        { status: 500 }
      )
    }

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        message: 'Signed out successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
