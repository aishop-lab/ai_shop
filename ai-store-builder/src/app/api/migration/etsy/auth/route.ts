// GET /api/migration/etsy/auth - Initiate Etsy OAuth with PKCE

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { generatePkcePair, buildEtsyAuthUrl } from '@/lib/migration/etsy/oauth'
import { ETSY_STATE_COOKIE } from '@/lib/migration/constants'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API)
  if (rateLimitResult) return rateLimitResult

  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get store_id from query params
    const storeId = request.nextUrl.searchParams.get('store_id')
    if (!storeId) {
      return NextResponse.json(
        { error: 'store_id parameter is required' },
        { status: 400 }
      )
    }

    // Verify store ownership
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Generate PKCE pair
    const { verifier, challenge } = generatePkcePair()

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex')

    // Build auth URL
    const authUrl = buildEtsyAuthUrl(state, challenge)

    // Store state, verifier, and store_id in HTTP-only cookie
    const cookieValue = JSON.stringify({
      state,
      verifier,
      store_id: storeId,
    })

    const response = NextResponse.redirect(authUrl)
    response.cookies.set(ETSY_STATE_COOKIE, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Migration] Etsy auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Etsy authentication' },
      { status: 500 }
    )
  }
}
