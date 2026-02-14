// Etsy Open API v3 client for fetching listings and sections

import { getEtsyClientId, ETSY_API_BASE, PRODUCTS_PER_PAGE } from '../constants'
import type { EtsyListing, EtsyImage, EtsySection } from '../types'

export class EtsyRateLimitError extends Error {
  retryAfter: number
  constructor(retryAfterHeader: string | null) {
    super('Etsy rate limit exceeded')
    this.name = 'EtsyRateLimitError'
    this.retryAfter = retryAfterHeader ? parseFloat(retryAfterHeader) : 2
  }
}

async function etsyFetch<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${ETSY_API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': getEtsyClientId(),
    },
  })

  if (response.status === 429) {
    throw new EtsyRateLimitError(response.headers.get('Retry-After'))
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Etsy API error: ${response.status} ${text}`)
  }

  return response.json()
}

export interface EtsyListingPage {
  listings: EtsyListing[]
  totalCount: number
  offset: number
  hasMore: boolean
}

/**
 * Get total active listing count for a shop
 */
export async function getEtsyListingCount(
  shopId: number,
  accessToken: string
): Promise<number> {
  const data = await etsyFetch<{ count: number; results: EtsyListing[] }>(
    `/application/shops/${shopId}/listings/active`,
    accessToken,
    { limit: '1' }
  )
  return data.count
}

/**
 * Fetch a page of active listings from an Etsy shop
 */
export async function fetchEtsyListings(
  shopId: number,
  accessToken: string,
  offset: number = 0
): Promise<EtsyListingPage> {
  const data = await etsyFetch<{ count: number; results: EtsyListing[] }>(
    `/application/shops/${shopId}/listings/active`,
    accessToken,
    {
      limit: PRODUCTS_PER_PAGE.toString(),
      offset: offset.toString(),
      includes: 'images',
    }
  )

  return {
    listings: data.results,
    totalCount: data.count,
    offset,
    hasMore: offset + data.results.length < data.count,
  }
}

/**
 * Fetch images for a specific listing
 */
export async function fetchEtsyListingImages(
  listingId: number,
  accessToken: string
): Promise<EtsyImage[]> {
  const data = await etsyFetch<{ count: number; results: EtsyImage[] }>(
    `/application/listings/${listingId}/images`,
    accessToken
  )
  return data.results
}

/**
 * Fetch all shop sections (Etsy's version of collections)
 */
export async function fetchEtsySections(
  shopId: number,
  accessToken: string
): Promise<EtsySection[]> {
  const data = await etsyFetch<{ count: number; results: EtsySection[] }>(
    `/application/shops/${shopId}/sections`,
    accessToken
  )
  return data.results
}

/**
 * Fetch listings belonging to a specific section
 */
export async function fetchEtsySectionListings(
  shopId: number,
  sectionId: number,
  accessToken: string
): Promise<number[]> {
  const data = await etsyFetch<{ count: number; results: Array<{ listing_id: number }> }>(
    `/application/shops/${shopId}/sections/${sectionId}/listings`,
    accessToken,
    { limit: '100' }
  )
  return data.results.map(l => l.listing_id)
}
