import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signUpSchema } from '@/lib/validations/auth'
import { handleAuthError } from '@/lib/utils/errors'
import type { AuthResponse } from '@/lib/types/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = signUpSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json<AuthResponse>(
        { success: false, error: errors },
        { status: 400 }
      )
    }

    const { email, password, full_name, phone } = validationResult.data

    const supabase = await createClient()

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone: phone || null
        },
        emailRedirectTo: `${new URL(request.url).origin}/auth/confirm`
      }
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
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // Profile is auto-created by database trigger
    return NextResponse.json<AuthResponse>(
      {
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: data.user.id,
          email: data.user.email!
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Sign up error:', error)
    const errorResponse = handleAuthError(error)
    return NextResponse.json<AuthResponse>(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    )
  }
}
