// Shopify OAuth: auth URL builder, code exchange, HMAC validation

import crypto from 'crypto'
import { getShopifyClientId, getShopifyClientSecret, getAppUrl, SHOPIFY_SCOPES } from '../constants'

/**
 * Validate that a Shopify store URL is properly formatted
 */
export function validateShopDomain(shop: string): string | null {
  // Accept formats: myshop.myshopify.com, myshop
  const cleaned = shop.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

  if (cleaned.includes('.myshopify.com')) {
    // Validate full domain format
    const match = cleaned.match(/^([a-z0-9][a-z0-9-]*[a-z0-9]?)\.myshopify\.com$/)
    return match ? cleaned : null
  }

  // Just the shop name — append domain
  const match = cleaned.match(/^[a-z0-9][a-z0-9-]*[a-z0-9]?$/)
  return match ? `${cleaned}.myshopify.com` : null
}

/**
 * Build Shopify OAuth authorization URL
 */
export function buildShopifyAuthUrl(shop: string, state: string): string {
  const clientId = getShopifyClientId()
  const redirectUri = `${getAppUrl()}/api/migration/shopify/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    'grant_options[]': 'offline',
  })

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

/**
 * Validate Shopify HMAC signature on callback
 */
export function validateShopifyHmac(query: Record<string, string>): boolean {
  const secret = getShopifyClientSecret()
  const hmac = query.hmac

  if (!hmac) return false

  // Build the message from all query params except hmac
  const entries = Object.entries(query)
    .filter(([key]) => key !== 'hmac')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  const computed = crypto
    .createHmac('sha256', secret)
    .update(entries)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(computed))
}

/**
 * Exchange authorization code for offline access token
 */
export async function exchangeShopifyCode(
  shop: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: getShopifyClientId(),
      client_secret: getShopifyClientSecret(),
      code,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify token exchange failed: ${response.status} ${text}`)
  }

  return response.json()
}

/**
 * Fetch basic shop info using the access token
 */
export async function fetchShopifyShopInfo(
  shop: string,
  accessToken: string
): Promise<{ id: number; name: string }> {
  const response = await fetch(`https://${shop}/admin/api/2024-10/shop.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Shopify shop info: ${response.status}`)
  }

  const data = await response.json()
  return { id: data.shop.id, name: data.shop.name }
}
