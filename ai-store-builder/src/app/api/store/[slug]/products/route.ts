// GET /api/store/[slug]/products - Get paginated products for store

import { NextResponse } from 'next/server'
import { validateStoreAccess, getStoreProductsPaginated } from '@/lib/store/get-store-data'
import { getCacheHeaders, CACHE_CONFIG } from '@/lib/store/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5 minutes - must be static

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/store/[slug]/products
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 24, max: 100)
 * - category: string (optional filter)
 * - sort: 'created_at' | 'price' | 'title' (default: 'created_at')
 * - order: 'asc' | 'desc' (default: 'desc')
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    
    // Validate slug
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid store slug' },
        { status: 400 }
      )
    }
    
    const normalizedSlug = slug.toLowerCase().trim()
    
    // Validate store access
    const isValid = await validateStoreAccess(normalizedSlug)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)))
    const category = searchParams.get('category') || undefined
    const sortBy = validateSortBy(searchParams.get('sort'))
    const sortOrder = validateSortOrder(searchParams.get('order'))
    
    // Get paginated products
    const result = await getStoreProductsPaginated(normalizedSlug, {
      page,
      limit,
      category,
      sortBy,
      sortOrder
    })
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to load products' },
        { status: 500 }
      )
    }
    
    // Return products with pagination info
    return NextResponse.json(
      {
        success: true,
        products: result.products,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages
        }
      },
      {
        headers: getCacheHeaders('products')
      }
    )
  } catch (error) {
    console.error('Products API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Validate and return sort field
 */
function validateSortBy(value: string | null): 'created_at' | 'price' | 'title' {
  const validValues = ['created_at', 'price', 'title']
  if (value && validValues.includes(value)) {
    return value as 'created_at' | 'price' | 'title'
  }
  return 'created_at'
}

/**
 * Validate and return sort order
 */
function validateSortOrder(value: string | null): 'asc' | 'desc' {
  if (value === 'asc' || value === 'desc') {
    return value
  }
  return 'desc'
}
