import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const RESET_PASSWORD_RATE_LIMIT = {
  limit: 3,
  windowSeconds: 60,
  prefix: 'auth-reset'
}

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
})

export async function POST(request: NextRequest) {
  // Rate limit: 3 requests per minute per IP
  const rateLimitResult = rateLimit(request, RESET_PASSWORD_RATE_LIMIT)
  if (rateLimitResult) return rateLimitResult

  try {
    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { email } = validation.data
    const supabase = await createClient()

    // Send password reset email via Supabase Auth
    // Always return success to prevent email enumeration
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`
    })

    if (error) {
      console.error('[Reset Password] Supabase error:', error.message)
      // Still return success to prevent email enumeration
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    })
  } catch (error) {
    console.error('[Reset Password] Error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
