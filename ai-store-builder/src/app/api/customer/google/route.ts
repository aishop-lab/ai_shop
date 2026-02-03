/**
 * Google OAuth Login for Customers
 *
 * Verifies Google ID token and creates/logs in customer
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { loginWithGoogle } from '@/lib/customer/auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

interface GoogleTokenPayload {
  iss: string
  azp: string
  aud: string
  sub: string // Google user ID
  email: string
  email_verified: boolean
  name?: string
  picture?: string
  given_name?: string
  family_name?: string
  exp: number
  iat: number
}

/**
 * Verify Google ID token using Google's tokeninfo endpoint
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    // Use Google's tokeninfo endpoint to verify the token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    )

    if (!response.ok) {
      console.error('Google token verification failed:', response.status)
      return null
    }

    const payload = await response.json() as GoogleTokenPayload

    // Verify the token is for our app
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (payload.aud !== clientId) {
      console.error('Google token audience mismatch')
      return null
    }

    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      console.error('Google token expired')
      return null
    }

    return payload
  } catch (error) {
    console.error('Error verifying Google token:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResult = rateLimit(request, RATE_LIMITS.AUTH)
    if (rateLimitResult) {
      return rateLimitResult
    }

    const body = await request.json()
    const { id_token, store_id } = body

    if (!id_token || !store_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the Google ID token
    const payload = await verifyGoogleToken(id_token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      )
    }

    if (!payload.email_verified) {
      return NextResponse.json(
        { error: 'Email not verified with Google' },
        { status: 400 }
      )
    }

    // Get device info and IP
    const userAgent = request.headers.get('user-agent') || undefined
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined

    // Login or create customer
    const result = await loginWithGoogle({
      storeId: store_id,
      email: payload.email,
      fullName: payload.name,
      avatarUrl: payload.picture,
      googleId: payload.sub,
      deviceInfo: userAgent ? { userAgent } : undefined,
      ipAddress: ip
    })

    if (!result.success || !result.session) {
      return NextResponse.json(
        { error: result.error || 'Login failed' },
        { status: 400 }
      )
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('customer_session', result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.session.expiresAt,
      path: '/'
    })

    return NextResponse.json({
      success: true,
      customer: result.customer
    })
  } catch (error) {
    console.error('Google login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
