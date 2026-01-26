import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { loginCustomer } from '@/lib/customer/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const loginSchema = z.object({
  storeId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await checkRateLimit(`customer_login:${ip}`, RATE_LIMITS.AUTH)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    // Get device info
    const userAgent = request.headers.get('user-agent') || ''
    const deviceInfo = { userAgent }
    const ipAddress = ip

    const result = await loginCustomer({
      ...validation.data,
      deviceInfo,
      ipAddress
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
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
    console.error('Customer login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
