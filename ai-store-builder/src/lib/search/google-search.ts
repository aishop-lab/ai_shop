export interface SearchResult {
  title: string
  link: string
  snippet: string
  image?: string
  thumbnail?: string
  price?: number
  product_id?: string
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  totalResults: number
  page: number
  totalPages: number
  searchTime?: number
}

/**
 * In-memory cache for search results
 * Use Redis in production for shared cache across instances
 */
const searchCache = new Map<string, { data: SearchResponse; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now()
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key)
    }
  }
}

// Clear expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(clearExpiredCache, 5 * 60 * 1000)
}

/**
 * Generate cache key from search parameters
 */
function getCacheKey(
  query: string,
  storeSlug?: string,
  page?: number
): string {
  return `${query.toLowerCase().trim()}-${storeSlug || 'all'}-${page || 1}`
}

/**
 * Search products using Google Custom Search API with caching
 */
export async function searchProducts(
  query: string,
  options: {
    storeSlug?: string
    page?: number
  } = {}
): Promise<SearchResponse> {
  const cacheKey = getCacheKey(query, options.storeSlug, options.page)

  // Check cache
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // Build API URL
  const params = new URLSearchParams({
    q: query,
    page: String(options.page || 1),
  })

  if (options.storeSlug) {
    params.append('store', options.storeSlug)
  }

  const response = await fetch(`/api/search?${params}`)

  if (!response.ok) {
    throw new Error('Search request failed')
  }

  const data: SearchResponse = await response.json()

  // Cache result
  searchCache.set(cacheKey, { data, timestamp: Date.now() })

  return data
}

/**
 * Get search suggestions for autocomplete
 */
export async function getSearchSuggestions(
  query: string,
  storeSlug?: string
): Promise<string[]> {
  if (query.length < 2) {
    return []
  }

  const params = new URLSearchParams({ q: query })
  if (storeSlug) {
    params.append('store', storeSlug)
  }

  try {
    const response = await fetch(`/api/search/suggestions?${params}`)
    const data = await response.json()
    return data.suggestions || []
  } catch (error) {
    console.error('Failed to fetch suggestions:', error)
    return []
  }
}

/**
 * Clear all search cache (useful after product updates)
 */
export function clearSearchCache(): void {
  searchCache.clear()
}

/**
 * Clear cache for a specific store
 */
export function clearStoreCacheCache(storeSlug: string): void {
  for (const key of searchCache.keys()) {
    if (key.includes(`-${storeSlug}-`)) {
      searchCache.delete(key)
    }
  }
}
