// GET /api/migration/shopify/auth - Initiate Shopify OAuth redirect

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { validateShopDomain, buildShopifyAuthUrl } from '@/lib/migration/shopify/oauth'
import { SHOPIFY_STATE_COOKIE } from '@/lib/migration/constants'
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

    // Get store_id and shop domain from query params
    const storeId = request.nextUrl.searchParams.get('store_id')
    const shopDomain = request.nextUrl.searchParams.get('shop')

    if (!storeId || !shopDomain) {
      return NextResponse.json(
        { error: 'store_id and shop parameters are required' },
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

    // Validate shop domain
    const validatedShop = validateShopDomain(shopDomain)
    if (!validatedShop) {
      return NextResponse.json(
        { error: 'Invalid Shopify store URL. Use format: myshop.myshopify.com' },
        { status: 400 }
      )
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex')

    // Build auth URL
    const authUrl = buildShopifyAuthUrl(validatedShop, state)

    // Store state + store_id + shop in HTTP-only cookie
    const cookieValue = JSON.stringify({ state, store_id: storeId, shop: validatedShop })
    const response = NextResponse.redirect(authUrl)
    response.cookies.set(SHOPIFY_STATE_COOKIE, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Migration] Shopify auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Shopify authentication' },
      { status: 500 }
    )
  }
}
