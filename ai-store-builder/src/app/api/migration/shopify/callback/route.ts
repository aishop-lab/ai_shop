// GET /api/migration/shopify/callback - Handle Shopify OAuth callback

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateShopifyHmac, exchangeShopifyCode, fetchShopifyShopInfo } from '@/lib/migration/shopify/oauth'
import { encrypt } from '@/lib/encryption'
import { SHOPIFY_STATE_COOKIE } from '@/lib/migration/constants'
import { getAppUrl } from '@/lib/migration/constants'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Extract query params
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const shop = searchParams.get('shop')
    const hmac = searchParams.get('hmac')

    if (!code || !state || !shop) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=missing_params`)
    }

    // Retrieve stored state from cookie
    const stateCookie = request.cookies.get(SHOPIFY_STATE_COOKIE)?.value
    if (!stateCookie) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=expired_session`)
    }

    let cookieData: { state: string; store_id: string; shop: string }
    try {
      cookieData = JSON.parse(stateCookie)
    } catch {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=invalid_session`)
    }

    // Validate state matches (CSRF protection)
    if (state !== cookieData.state) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=invalid_state`)
    }

    // Validate HMAC signature
    if (hmac) {
      const queryObj: Record<string, string> = {}
      searchParams.forEach((value, key) => { queryObj[key] = value })
      if (!validateShopifyHmac(queryObj)) {
        return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=invalid_hmac`)
      }
    }

    // Authenticate user via cookies (this is a browser redirect, cookies should be present)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[Migration] Shopify callback auth failed:', authError?.message)
      return NextResponse.redirect(`${getAppUrl()}/sign-in`)
    }

    // Verify store ownership using admin client (bypasses RLS)
    const { data: userStores } = await getSupabaseAdmin()
      .from('stores')
      .select('id')
      .eq('id', cookieData.store_id)
      .eq('owner_id', user.id)
      .limit(1)

    if (!userStores || userStores.length === 0) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=store_not_found`)
    }

    // Exchange code for access token
    const tokenData = await exchangeShopifyCode(shop, code)

    // Fetch shop info
    const shopInfo = await fetchShopifyShopInfo(shop, tokenData.access_token)

    // Encrypt access token
    const encryptedToken = encrypt(tokenData.access_token)

    // Create or update migration record using admin client
    const admin = getSupabaseAdmin()
    const { data: existingMigration } = await admin
      .from('store_migrations')
      .select('id')
      .eq('store_id', cookieData.store_id)
      .eq('platform', 'shopify')
      .single()

    if (existingMigration) {
      // Update existing
      await admin
        .from('store_migrations')
        .update({
          source_shop_id: shop,
          source_shop_name: shopInfo.name,
          access_token_encrypted: encryptedToken,
          status: 'connected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMigration.id)
    } else {
      // Create new
      await admin
        .from('store_migrations')
        .insert({
          store_id: cookieData.store_id,
          platform: 'shopify',
          source_shop_id: shop,
          source_shop_name: shopInfo.name,
          access_token_encrypted: encryptedToken,
          status: 'connected',
        })
    }

    // Clear the state cookie
    const response = NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?connected=shopify`)
    response.cookies.delete(SHOPIFY_STATE_COOKIE)

    return response
  } catch (error) {
    console.error('[Migration] Shopify callback error:', error)
    return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=callback_failed`)
  }
}
