// GET /api/store/[slug]/data - Fetch complete store data for rendering

import { NextResponse } from 'next/server'
import { getStoreData, validateStoreAccess } from '@/lib/store/get-store-data'
import { getCacheHeaders, CACHE_CONFIG } from '@/lib/store/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // 1 minute - must be static

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/store/[slug]/data
 * Returns complete store data including:
 * - Store info (name, logo, colors, typography)
 * - Featured products
 * - All products (first page)
 * - Categories
 * - Settings
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { slug } = await params
    
    // Validate slug
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid store slug' },
        { status: 400 }
      )
    }
    
    const normalizedSlug = slug.toLowerCase().trim()
    
    // Validate store access (check if exists and active)
    const isValid = await validateStoreAccess(normalizedSlug)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    // Get complete store data
    const storeData = await getStoreData(normalizedSlug)
    
    if (!storeData) {
      return NextResponse.json(
        { error: 'Failed to load store data' },
        { status: 500 }
      )
    }
    
    // Return store data with cache headers
    return NextResponse.json(
      {
        success: true,
        store: storeData.store,
        products: storeData.products,
        featured_products: storeData.featured_products,
        categories: storeData.categories,
        settings: storeData.settings
      },
      {
        headers: getCacheHeaders('store')
      }
    )
  } catch (error) {
    console.error('Store data API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
