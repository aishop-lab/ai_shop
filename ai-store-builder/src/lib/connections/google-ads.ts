/**
 * Google Ads OAuth Flow Handler
 *
 * Manages the OAuth 2.0 consent flow for connecting a merchant's Google Ads
 * account. Tokens are encrypted at rest using AES-256-GCM.
 */

import { encrypt, decrypt } from '@/lib/encryption'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ADS_API_BASE = 'https://googleads.googleapis.com/v19'
const REQUIRED_SCOPES = ['https://www.googleapis.com/auth/adwords']
const PROVIDER = 'google_ads'

const log = logger.child({ traceId: `google-ads-oauth:${Date.now()}` })

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getClientId(): string {
  const id = process.env.GOOGLE_ADS_CLIENT_ID
  if (!id) {
    throw new Error('GOOGLE_ADS_CLIENT_ID environment variable is not set')
  }
  return id
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_ADS_CLIENT_SECRET
  if (!secret) {
    throw new Error('GOOGLE_ADS_CLIENT_SECRET environment variable is not set')
  }
  return secret
}

function getDeveloperToken(): string {
  const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!token) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not set')
  }
  return token
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Generate the Google OAuth consent URL for Google Ads access.
 *
 * @param storeId - Used as the OAuth `state` parameter for CSRF protection
 * @param redirectUri - The callback URL registered in the Google Cloud console
 * @returns The full authorization URL to redirect the merchant to
 */
export function getGoogleAdsAuthUrl(
  storeId: string,
  redirectUri: string
): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: REQUIRED_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // force consent to always get a refresh token
    state: storeId,
  })

  return `${OAUTH_AUTH_URL}?${params.toString()}`
}

/**
 * Handle the OAuth callback: exchange the authorization code for tokens,
 * fetch the accessible customer ID, and store everything encrypted.
 */
export async function handleGoogleAdsCallback(params: {
  storeId: string
  code: string
  redirectUri: string
}): Promise<{ success: boolean; customerId?: string; error?: string }> {
  const { storeId, code, redirectUri } = params

  try {
    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      const errorMsg =
        tokenData.error_description ?? tokenData.error ?? 'Token exchange failed'
      log.error('Google Ads token exchange failed', new Error(errorMsg), {
        storeId,
      })
      return { success: false, error: errorMsg }
    }

    const accessToken: string = tokenData.access_token
    const refreshToken: string | undefined = tokenData.refresh_token
    const expiresIn: number = tokenData.expires_in ?? 3600

    if (!refreshToken) {
      log.error(
        'No refresh token returned from Google OAuth',
        new Error('Missing refresh_token'),
        { storeId }
      )
      return {
        success: false,
        error:
          'No refresh token received. Please revoke access at myaccount.google.com and try again.',
      }
    }

    // 2. List accessible customers to find the Google Ads customer ID
    const customers = await listAccessibleCustomers(accessToken)

    if (customers.length === 0) {
      return {
        success: false,
        error: 'No Google Ads accounts found for this Google account.',
      }
    }

    // Use the first customer by default. In a multi-account flow the
    // merchant would pick one, but for now we auto-select.
    const selectedCustomer = customers[0]

    // 3. Encrypt and store credentials
    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Upsert: if a record already exists for this store + provider, update it
    const { error: dbError } = await supabase
      .from('connected_accounts')
      .upsert(
        {
          store_id: storeId,
          provider: PROVIDER,
          provider_account_id: selectedCustomer.id,
          provider_account_name: selectedCustomer.name,
          scopes: REQUIRED_SCOPES,
          status: 'active',
          token_encrypted: encrypt(accessToken),
          refresh_token_encrypted: encrypt(refreshToken),
          token_expires_at: expiresAt,
          last_used_at: now,
          last_error: null,
          updated_at: now,
        },
        { onConflict: 'store_id,provider' }
      )

    if (dbError) {
      log.error('Failed to store Google Ads credentials', new Error(dbError.message), {
        storeId,
      })
      return { success: false, error: 'Failed to save account credentials.' }
    }

    log.info('Google Ads account connected', {
      storeId,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
    })

    return { success: true, customerId: selectedCustomer.id }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Google Ads OAuth callback failed', error, { storeId })
    return { success: false, error: error.message }
  }
}

/**
 * Refresh an expired access token for a store's Google Ads connection.
 * Returns true if the refresh succeeded.
 */
export async function refreshGoogleAdsToken(
  storeId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  // Fetch the current refresh token
  const { data, error: fetchError } = await supabase
    .from('connected_accounts')
    .select('refresh_token_encrypted')
    .eq('store_id', storeId)
    .eq('provider', PROVIDER)
    .eq('status', 'active')
    .single()

  if (fetchError || !data) {
    log.warn('No active Google Ads connection found for refresh', { storeId })
    return false
  }

  let refreshToken: string
  try {
    refreshToken = decrypt(data.refresh_token_encrypted)
  } catch (err) {
    log.error(
      'Failed to decrypt refresh token',
      err instanceof Error ? err : new Error(String(err)),
      { storeId }
    )
    return false
  }

  try {
    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const tokenData = await response.json()

    if (!response.ok || !tokenData.access_token) {
      const errorMsg =
        tokenData.error_description ?? tokenData.error ?? 'Token refresh failed'

      // If refresh token is revoked, mark connection as error
      if (
        tokenData.error === 'invalid_grant' ||
        tokenData.error === 'unauthorized_client'
      ) {
        await supabase
          .from('connected_accounts')
          .update({
            status: 'error',
            last_error: errorMsg,
            updated_at: new Date().toISOString(),
          })
          .eq('store_id', storeId)
          .eq('provider', PROVIDER)
      }

      log.error('Google Ads token refresh failed', new Error(errorMsg), {
        storeId,
      })
      return false
    }

    const newAccessToken: string = tokenData.access_token
    const expiresIn: number = tokenData.expires_in ?? 3600
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    await supabase
      .from('connected_accounts')
      .update({
        token_encrypted: encrypt(newAccessToken),
        token_expires_at: expiresAt,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('store_id', storeId)
      .eq('provider', PROVIDER)

    log.info('Google Ads token refreshed', { storeId })
    return true
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Google Ads token refresh error', error, { storeId })
    return false
  }
}

/**
 * Disconnect a Google Ads account from a store.
 * Removes the stored credentials (hard delete).
 */
export async function disconnectGoogleAds(
  storeId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  // Optionally revoke the token at Google before deleting locally
  const { data } = await supabase
    .from('connected_accounts')
    .select('token_encrypted')
    .eq('store_id', storeId)
    .eq('provider', PROVIDER)
    .single()

  if (data?.token_encrypted) {
    try {
      const accessToken = decrypt(data.token_encrypted)
      // Best-effort token revocation
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
    } catch {
      // Revocation failure is non-critical; continue with deletion
      log.warn('Token revocation failed (non-critical)', { storeId })
    }
  }

  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('store_id', storeId)
    .eq('provider', PROVIDER)

  if (error) {
    log.error('Failed to disconnect Google Ads account', new Error(error.message), {
      storeId,
    })
    return false
  }

  log.info('Google Ads account disconnected', { storeId })
  return true
}

/**
 * List Google Ads customer accounts accessible via the given access token.
 * Useful for account selection after OAuth consent.
 */
export async function listAccessibleCustomers(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  const developerToken = getDeveloperToken()

  // 1. Get accessible customer resource names
  const listUrl = `${ADS_API_BASE}/customers:listAccessibleCustomers`
  const listResponse = await fetch(listUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
    },
  })

  const listData = await listResponse.json()

  if (!listResponse.ok || !listData.resourceNames) {
    log.warn('Failed to list accessible Google Ads customers', {
      status: listResponse.status,
      error: listData.error?.message,
    })
    return []
  }

  const resourceNames: string[] = listData.resourceNames

  // 2. Fetch display name for each customer
  const customers: Array<{ id: string; name: string }> = []

  for (const resourceName of resourceNames) {
    const customerId = resourceName.replace('customers/', '')

    try {
      const detailUrl = `${ADS_API_BASE}/${resourceName}`
      const detailResponse = await fetch(detailUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
        },
      })

      if (detailResponse.ok) {
        const detail = await detailResponse.json()
        customers.push({
          id: customerId,
          name: detail.descriptiveName ?? `Account ${customerId}`,
        })
      } else {
        // Customer may be a manager account without direct access
        customers.push({
          id: customerId,
          name: `Account ${customerId}`,
        })
      }
    } catch {
      customers.push({
        id: customerId,
        name: `Account ${customerId}`,
      })
    }
  }

  return customers
}
