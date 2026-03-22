// GET /api/store/[slug]/search - Search products within a store

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/store/[slug]/search?q=search+query
 * Searches published products by title, description, and tags.
 * Returns up to 20 matching products with images.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Rate limit: 30 per minute per IP
    const rateLimitResult = rateLimit(request, RATE_LIMITS.SEARCH)
    if (rateLimitResult) return rateLimitResult

    const { slug } = await params

    // Validate slug
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid store slug' },
        { status: 400 }
      )
    }

    // Get search query
    const query = request.nextUrl.searchParams.get('q')
    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    const sanitizedQuery = sanitizeSearchQuery(query.trim())
    if (!sanitizedQuery) {
      return NextResponse.json({
        results: [],
        query: query.trim(),
        totalResults: 0,
      })
    }

    const normalizedSlug = slug.toLowerCase().trim()

    // Look up the store by slug using service role client
    const supabase = await createAdminClient()
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', normalizedSlug)
      .eq('is_active', true)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Search products by title, description, and tags
    const { data: products, error: searchError } = await supabase
      .from('products')
      .select('id, title, price, compare_at_price, slug, images:product_images(thumbnail_url, alt_text)')
      .eq('store_id', store.id)
      .eq('status', 'published')
      .or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%,tags.cs.{${sanitizedQuery}}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (searchError) {
      console.error('Product search error:', searchError)
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
    }

    // Transform results - pick the first image for each product
    const results = (products || []).map((product) => ({
      id: product.id,
      title: product.title,
      price: product.price,
      compare_at_price: product.compare_at_price,
      slug: product.slug,
      image: product.images?.[0]?.thumbnail_url || null,
      image_alt: product.images?.[0]?.alt_text || product.title,
    }))

    return NextResponse.json({
      results,
      query: query.trim(),
      totalResults: results.length,
    })
  } catch (error) {
    console.error('Store search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
