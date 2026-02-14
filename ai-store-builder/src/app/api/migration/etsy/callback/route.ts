// GET /api/migration/etsy/callback - Handle Etsy OAuth callback

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeEtsyCode, fetchEtsyShopInfo } from '@/lib/migration/etsy/oauth'
import { encrypt } from '@/lib/encryption'
import { ETSY_STATE_COOKIE, getAppUrl } from '@/lib/migration/constants'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Extract query params
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      console.error('[Migration] Etsy OAuth error:', errorParam)
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=etsy_denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=missing_params`)
    }

    // Retrieve stored state from cookie
    const stateCookie = request.cookies.get(ETSY_STATE_COOKIE)?.value
    if (!stateCookie) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=expired_session`)
    }

    let cookieData: { state: string; verifier: string; store_id: string }
    try {
      cookieData = JSON.parse(stateCookie)
    } catch {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=invalid_session`)
    }

    // Validate state matches (CSRF protection)
    if (state !== cookieData.state) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=invalid_state`)
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(`${getAppUrl()}/sign-in`)
    }

    // Verify store ownership
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', cookieData.store_id)
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=store_not_found`)
    }

    // Exchange code for tokens (with PKCE verifier)
    const tokenData = await exchangeEtsyCode(code, cookieData.verifier)

    // Fetch shop info
    const shopInfo = await fetchEtsyShopInfo(tokenData.access_token)

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokenData.access_token)
    const encryptedRefreshToken = encrypt(tokenData.refresh_token)
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Create or update migration record
    const { data: existingMigration } = await supabase
      .from('store_migrations')
      .select('id')
      .eq('store_id', cookieData.store_id)
      .eq('platform', 'etsy')
      .single()

    if (existingMigration) {
      await supabase
        .from('store_migrations')
        .update({
          source_shop_id: shopInfo.shop_id.toString(),
          source_shop_name: shopInfo.shop_name,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          status: 'connected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMigration.id)
    } else {
      await supabase
        .from('store_migrations')
        .insert({
          store_id: cookieData.store_id,
          platform: 'etsy',
          source_shop_id: shopInfo.shop_id.toString(),
          source_shop_name: shopInfo.shop_name,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          status: 'connected',
        })
    }

    // Clear the state cookie
    const response = NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?connected=etsy`)
    response.cookies.delete(ETSY_STATE_COOKIE)

    return response
  } catch (error) {
    console.error('[Migration] Etsy callback error:', error)
    return NextResponse.redirect(`${getAppUrl()}/dashboard/migrate?error=callback_failed`)
  }
}
