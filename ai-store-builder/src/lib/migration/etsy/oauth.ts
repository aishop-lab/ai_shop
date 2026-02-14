// Etsy OAuth with PKCE: auth URL builder, code exchange, token refresh

import crypto from 'crypto'
import { getEtsyClientId, getAppUrl, ETSY_SCOPES } from '../constants'

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePkcePair(): { verifier: string; challenge: string } {
  // Generate a random 43-128 character string
  const verifier = crypto.randomBytes(32).toString('base64url')

  // SHA256 hash of verifier, base64url encoded
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')

  return { verifier, challenge }
}

/**
 * Build Etsy OAuth authorization URL with PKCE
 */
export function buildEtsyAuthUrl(
  state: string,
  codeChallenge: string
): string {
  const clientId = getEtsyClientId()
  const redirectUri = `${getAppUrl()}/api/migration/etsy/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: ETSY_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `https://www.etsy.com/oauth/connect?${params.toString()}`
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeEtsyCode(
  code: string,
  codeVerifier: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const redirectUri = `${getAppUrl()}/api/migration/etsy/callback`

  const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: getEtsyClientId(),
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Etsy token exchange failed: ${response.status} ${text}`)
  }

  return response.json()
}

/**
 * Refresh an expired Etsy access token
 */
export async function refreshEtsyToken(
  refreshToken: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: getEtsyClientId(),
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Etsy token refresh failed: ${response.status} ${text}`)
  }

  return response.json()
}

/**
 * Fetch Etsy shop info for the authenticated user
 */
export async function fetchEtsyShopInfo(
  accessToken: string
): Promise<{ shop_id: number; shop_name: string }> {
  // First get user ID
  const meResponse = await fetch('https://openapi.etsy.com/v3/application/users/me', {
    headers: { Authorization: `Bearer ${accessToken}`, 'x-api-key': getEtsyClientId() },
  })

  if (!meResponse.ok) {
    throw new Error(`Failed to fetch Etsy user info: ${meResponse.status}`)
  }

  const meData = await meResponse.json()
  const userId = meData.user_id

  // Then get their shop
  const shopResponse = await fetch(
    `https://openapi.etsy.com/v3/application/users/${userId}/shops`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, 'x-api-key': getEtsyClientId() },
    }
  )

  if (!shopResponse.ok) {
    throw new Error(`Failed to fetch Etsy shop info: ${shopResponse.status}`)
  }

  const shopData = await shopResponse.json()
  if (!shopData.results?.length) {
    throw new Error('No Etsy shop found for this account')
  }

  const shop = shopData.results[0]
  return { shop_id: shop.shop_id, shop_name: shop.shop_name }
}
