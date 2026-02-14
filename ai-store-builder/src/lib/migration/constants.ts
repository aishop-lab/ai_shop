// Migration feature constants and environment variable accessors

export function getShopifyClientId(): string {
  const id = process.env.SHOPIFY_CLIENT_ID
  if (!id) throw new Error('SHOPIFY_CLIENT_ID environment variable is not set')
  return id
}

export function getShopifyClientSecret(): string {
  const secret = process.env.SHOPIFY_CLIENT_SECRET
  if (!secret) throw new Error('SHOPIFY_CLIENT_SECRET environment variable is not set')
  return secret
}

export function getEtsyClientId(): string {
  const id = process.env.ETSY_CLIENT_ID
  if (!id) throw new Error('ETSY_CLIENT_ID environment variable is not set')
  return id
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// OAuth scopes
export const SHOPIFY_SCOPES = 'read_products'
export const ETSY_SCOPES = 'listings_r shops_r'

// API URLs
export const SHOPIFY_API_VERSION = '2024-10'
export const ETSY_API_BASE = 'https://openapi.etsy.com/v3'

// Migration limits
export const PRODUCTS_PER_PAGE = 50
export const IMAGE_BATCH_SIZE = 3
export const MAX_MIGRATION_DURATION_MS = 270_000 // 270 seconds (leave 30s buffer from 300s limit)
export const RATE_LIMIT_BACKOFF_BASE_MS = 1000
export const RATE_LIMIT_BACKOFF_MAX_MS = 30_000

// Cookie names
export const SHOPIFY_STATE_COOKIE = 'sf_shopify_state'
export const ETSY_STATE_COOKIE = 'sf_etsy_state'
