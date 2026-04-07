/**
 * Meta OAuth Flow Handler
 *
 * Manages connecting and disconnecting a merchant's Meta Business account.
 * Handles the OAuth authorization flow, token exchange, long-lived token
 * conversion, and secure credential storage.
 */

import { encrypt, decrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const META_OAUTH_BASE = 'https://www.facebook.com/v22.0/dialog/oauth'
const META_GRAPH_BASE = 'https://graph.facebook.com/v22.0'

const REQUIRED_SCOPES = [
  'ads_management',
  'ads_read',
  'pages_manage_posts',
  'pages_read_engagement',
  'business_management',
  'instagram_basic',
  'instagram_content_publish',
]

const log = logger.child({ traceId: `meta-oauth:${Date.now()}` })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAppCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error(
      'META_APP_ID and META_APP_SECRET environment variables must be configured.'
    )
  }

  return { appId, appSecret }
}

// ---------------------------------------------------------------------------
// OAuth URL Generation
// ---------------------------------------------------------------------------

/**
 * Generate the Meta OAuth authorization URL.
 *
 * The merchant is redirected here to authorize our app. The `state` parameter
 * carries the store ID so we can associate the callback with the right store.
 */
export function getMetaAuthUrl(storeId: string, redirectUri: string): string {
  const { appId } = getAppCredentials()

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: REQUIRED_SCOPES.join(','),
    response_type: 'code',
    state: storeId,
  })

  return `${META_OAUTH_BASE}?${params.toString()}`
}

// ---------------------------------------------------------------------------
// OAuth Callback
// ---------------------------------------------------------------------------

/**
 * Handle the OAuth callback after the merchant authorizes our app.
 *
 * 1. Exchange the authorization code for a short-lived token
 * 2. Exchange the short-lived token for a long-lived (60-day) token
 * 3. Fetch the user's ad account info
 * 4. Store everything encrypted in `connected_accounts`
 */
export async function handleMetaCallback(params: {
  storeId: string
  code: string
  redirectUri: string
}): Promise<{ success: boolean; accountName?: string; error?: string }> {
  const { storeId, code, redirectUri } = params

  try {
    const { appId, appSecret } = getAppCredentials()

    // Step 1: Exchange code for short-lived token
    const tokenUrl = new URL(`${META_GRAPH_BASE}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      log.error('Meta token exchange failed', undefined, {
        storeId,
        error: tokenData.error.message,
      })
      return { success: false, error: tokenData.error.message }
    }

    const shortLivedToken = tokenData.access_token as string

    // Step 2: Exchange for long-lived token
    let longLivedToken: string
    try {
      longLivedToken = await exchangeForLongLivedToken(shortLivedToken)
    } catch (err) {
      log.error(
        'Failed to exchange for long-lived token',
        err instanceof Error ? err : new Error(String(err)),
        { storeId }
      )
      // Fall back to short-lived token
      longLivedToken = shortLivedToken
    }

    // Step 3: Fetch user info and ad accounts
    const meRes = await fetch(
      `${META_GRAPH_BASE}/me?fields=id,name&access_token=${longLivedToken}`
    )
    const meData = await meRes.json()

    if (meData.error) {
      return { success: false, error: meData.error.message }
    }

    const userId = meData.id as string
    const userName = meData.name as string

    // Fetch the first ad account
    const adAccountsRes = await fetch(
      `${META_GRAPH_BASE}/me/adaccounts?fields=id,name,account_id&access_token=${longLivedToken}`
    )
    const adAccountsData = await adAccountsRes.json()
    const adAccount = adAccountsData.data?.[0]
    const adAccountId = adAccount?.account_id || userId

    // Fetch pages for organic posting
    const pagesRes = await fetch(
      `${META_GRAPH_BASE}/me/accounts?fields=id,name,instagram_business_account&access_token=${longLivedToken}`
    )
    const pagesData = await pagesRes.json()
    const firstPage = pagesData.data?.[0]

    // Extract Instagram Business Account ID from the page (if connected)
    const instagramBusinessId = firstPage?.instagram_business_account?.id || null

    // Step 4: Store encrypted credentials
    const supabase = getSupabaseAdmin()

    // Token expires in ~60 days for long-lived tokens
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 58) // Slight buffer

    // Upsert: update if a meta connection already exists for this store
    const { error: dbError } = await supabase
      .from('connected_accounts')
      .upsert(
        {
          store_id: storeId,
          provider: 'meta',
          provider_account_id: adAccountId,
          provider_account_name: userName,
          scopes: REQUIRED_SCOPES,
          status: 'active',
          token_encrypted: encrypt(longLivedToken),
          token_expires_at: tokenExpiresAt.toISOString(),
          last_used_at: new Date().toISOString(),
          last_error: null,
          metadata: {
            user_id: userId,
            ad_account_id: adAccountId,
            ad_account_name: adAccount?.name || null,
            page_id: firstPage?.id || null,
            page_name: firstPage?.name || null,
            instagram_business_id: instagramBusinessId,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id,provider' }
      )

    if (dbError) {
      log.error('Failed to store Meta credentials', undefined, {
        storeId,
        dbError: dbError.message,
      })
      return { success: false, error: 'Failed to save connection. Please try again.' }
    }

    log.info('Meta account connected successfully', {
      storeId,
      accountName: userName,
      adAccountId,
    })

    return { success: true, accountName: userName }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(
      'Meta OAuth callback failed',
      err instanceof Error ? err : new Error(message),
      { storeId }
    )
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

/**
 * Exchange a short-lived token (~1 hour) for a long-lived token (~60 days).
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<string> {
  const { appId, appSecret } = getAppCredentials()

  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('fb_exchange_token', shortLivedToken)

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.error) {
    throw new Error(`Failed to exchange token: ${data.error.message}`)
  }

  return data.access_token as string
}

/**
 * Refresh a Meta token that is approaching expiration.
 *
 * Long-lived user tokens can be refreshed by exchanging them again before
 * they expire. The token must still be valid (not yet expired) to be refreshed.
 */
export async function refreshMetaToken(storeId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { data: account, error } = await supabase
    .from('connected_accounts')
    .select('token_encrypted, token_expires_at')
    .eq('store_id', storeId)
    .eq('provider', 'meta')
    .eq('status', 'active')
    .single()

  if (error || !account) {
    log.warn('No active Meta connection found for refresh', { storeId })
    return false
  }

  try {
    const currentToken = decrypt(account.token_encrypted)

    // Exchange the current long-lived token for a new one
    const newToken = await exchangeForLongLivedToken(currentToken)

    const tokenExpiresAt = new Date()
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 58)

    const { error: updateError } = await supabase
      .from('connected_accounts')
      .update({
        token_encrypted: encrypt(newToken),
        token_expires_at: tokenExpiresAt.toISOString(),
        last_used_at: new Date().toISOString(),
        last_error: null,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('store_id', storeId)
      .eq('provider', 'meta')

    if (updateError) {
      log.error('Failed to update refreshed Meta token', undefined, {
        storeId,
        dbError: updateError.message,
      })
      return false
    }

    log.info('Meta token refreshed successfully', { storeId })
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    // Mark connection as expired if refresh fails
    await supabase
      .from('connected_accounts')
      .update({
        status: 'expired',
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq('store_id', storeId)
      .eq('provider', 'meta')

    log.error(
      'Meta token refresh failed',
      err instanceof Error ? err : new Error(message),
      { storeId }
    )
    return false
  }
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

/**
 * Disconnect the Meta account for a store.
 *
 * Revokes the token with Meta and removes the connection record.
 */
export async function disconnectMeta(storeId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  // Retrieve the token to revoke it
  const { data: account } = await supabase
    .from('connected_accounts')
    .select('token_encrypted, provider_account_id')
    .eq('store_id', storeId)
    .eq('provider', 'meta')
    .single()

  if (account?.token_encrypted) {
    try {
      const token = decrypt(account.token_encrypted)

      // Revoke the token with Meta (best-effort)
      await fetch(
        `${META_GRAPH_BASE}/me/permissions?access_token=${token}`,
        { method: 'DELETE' }
      ).catch(() => {
        // Silently ignore revocation failures — we still remove locally
      })
    } catch {
      // Token may already be invalid; proceed with local cleanup
    }
  }

  // Delete the connection record
  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('store_id', storeId)
    .eq('provider', 'meta')

  if (error) {
    log.error('Failed to delete Meta connection record', undefined, {
      storeId,
      dbError: error.message,
    })
    return false
  }

  log.info('Meta account disconnected', { storeId })
  return true
}
