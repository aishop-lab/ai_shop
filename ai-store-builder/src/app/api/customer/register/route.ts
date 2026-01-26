import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { registerCustomer } from '@/lib/customer/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const registerSchema = z.object({
  storeId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  marketingConsent: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await checkRateLimit(`customer_register:${ip}`, RATE_LIMITS.AUTH)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const result = await registerCustomer(validation.data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      customer: result.customer
    })

    response.cookies.set('customer_session', result.session!.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Customer registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
