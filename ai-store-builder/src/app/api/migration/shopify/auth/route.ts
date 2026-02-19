// GET /api/migration/shopify/auth - Initiate Shopify OAuth redirect

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateShopDomain, buildShopifyAuthUrl } from '@/lib/migration/shopify/oauth'
import { SHOPIFY_STATE_COOKIE } from '@/lib/migration/constants'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API)
  if (rateLimitResult) return rateLimitResult

  try {
    // --- Authentication ---
    // Try cookie-based auth first, fall back to Authorization header
    let userId: string | null = null

    // Method 1: Cookie-based auth
    const supabase = await createClient()
    const { data: cookieAuth } = await supabase.auth.getUser()
    if (cookieAuth?.user) {
      userId = cookieAuth.user.id
    }

    // Method 2: Authorization header (fallback for production)
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (supabaseUrl && supabaseKey) {
          const tokenClient = createServiceClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          })
          const { data: tokenAuth } = await tokenClient.auth.getUser(token)
          if (tokenAuth?.user) {
            userId = tokenAuth.user.id
          }
        }
      }
    }

    if (!userId) {
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

    // Verify store ownership using admin client (bypasses RLS)
    const { data: userStores } = await getSupabaseAdmin()
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', userId)
      .limit(1)

    if (!userStores || userStores.length === 0) {
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

    // Check if this is a fetch request (wants JSON) or browser navigation (wants redirect)
    const acceptHeader = request.headers.get('accept') || ''
    const wantsJson = acceptHeader.includes('application/json')

    if (wantsJson) {
      // Return auth URL as JSON — frontend will redirect
      const response = NextResponse.json({ authUrl })
      response.cookies.set(SHOPIFY_STATE_COOKIE, JSON.stringify({ state, store_id: storeId, shop: validatedShop }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      })
      return response
    }

    // Browser redirect flow (original behavior)
    const cookieValue = JSON.stringify({ state, store_id: storeId, shop: validatedShop })
    const response = NextResponse.redirect(authUrl)
    response.cookies.set(SHOPIFY_STATE_COOKIE, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
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
