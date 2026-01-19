import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
const SEARCH_ENGINE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID

interface GoogleSearchItem {
  title: string
  link: string
  snippet: string
  pagemap?: {
    cse_image?: Array<{ src: string }>
    cse_thumbnail?: Array<{ src: string }>
    product?: Array<{
      name?: string
      price?: string
      currency?: string
    }>
  }
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[]
  searchInformation?: {
    totalResults?: string
    formattedTotalResults?: string
    searchTime?: number
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const storeSlug = searchParams.get('store')
  const page = parseInt(searchParams.get('page') || '1')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter required' },
      { status: 400 }
    )
  }

  if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
    return NextResponse.json(
      { error: 'Search service not configured' },
      { status: 503 }
    )
  }

  try {
    // Build site-specific search if store slug provided
    let searchQuery = query
    if (storeSlug) {
      // Restrict search to specific store's product pages
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000'
      searchQuery = `${query} site:${siteUrl}/${storeSlug}/products`
    }

    // Calculate start index (Google uses 1-based indexing)
    const startIndex = (page - 1) * 10 + 1

    // Build Google Custom Search API URL
    const apiUrl = new URL('https://www.googleapis.com/customsearch/v1')
    apiUrl.searchParams.append('key', GOOGLE_API_KEY)
    apiUrl.searchParams.append('cx', SEARCH_ENGINE_ID)
    apiUrl.searchParams.append('q', searchQuery)
    apiUrl.searchParams.append('start', String(startIndex))
    apiUrl.searchParams.append('num', '10')

    const response = await fetch(apiUrl.toString())

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Google Search API error:', errorData)
      return NextResponse.json(
        { error: 'Search request failed' },
        { status: response.status }
      )
    }

    const data: GoogleSearchResponse = await response.json()

    const items = data.items || []
    const totalResults = parseInt(data.searchInformation?.totalResults || '0')

    // Transform results
    const results = items.map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      image: item.pagemap?.cse_image?.[0]?.src,
      thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src,
      price: extractPrice(item.snippet),
      product_id: extractProductId(item.link),
    }))

    return NextResponse.json({
      query,
      results,
      totalResults,
      page,
      totalPages: Math.ceil(Math.min(totalResults, 100) / 10), // Google limits to 100 results
      searchTime: data.searchInformation?.searchTime,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

/**
 * Extract price from snippet text
 * Supports ₹ (INR), $ (USD), € (EUR) formats
 */
function extractPrice(snippet: string): number | null {
  // Match common price formats: ₹1,999 or $29.99 or €15,00
  const priceMatch = snippet.match(
    /[₹$€]\s*(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d{2})?)/
  )
  if (priceMatch) {
    // Normalize the number (remove separators except decimal)
    const normalized = priceMatch[1]
      .replace(/\s/g, '')
      .replace(/,(\d{2})$/, '.$1') // Handle European format
      .replace(/,/g, '')
    return parseFloat(normalized)
  }
  return null
}

/**
 * Extract product ID from URL
 * Expected format: /[storeSlug]/products/[productId]
 */
function extractProductId(url: string): string | null {
  const match = url.match(/\/products\/([a-f0-9-]+)/)
  return match ? match[1] : null
}
