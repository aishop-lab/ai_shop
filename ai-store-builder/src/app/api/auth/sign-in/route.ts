import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { signInSchema } from '@/lib/validations/auth'
import { handleAuthError } from '@/lib/utils/errors'
import { getUserProfile } from '@/lib/auth/utils'
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
      .select('id')
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
