// GET /api/store/[slug]/products/[productId] - Get single product with store context

import { NextResponse } from 'next/server'
import { getProductData } from '@/lib/store/get-store-data'
import { getCacheHeaders, CACHE_CONFIG } from '@/lib/store/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour - must be static

interface RouteParams {
  params: Promise<{ slug: string; productId: string }>
}

/**
 * GET /api/store/[slug]/products/[productId]
 * Returns single product with store context for product detail page
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { slug, productId } = await params
    
    // Validate parameters
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid store slug' },
        { status: 400 }
      )
    }
    
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }
    
    const normalizedSlug = slug.toLowerCase().trim()
    
    // Validate UUID format for productId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }
    
    // Get product with store context
    const data = await getProductData(normalizedSlug, productId)
    
    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Return product with store info
    return NextResponse.json(
      {
        success: true,
        store: {
          id: data.store.id,
          name: data.store.name,
          slug: data.store.slug,
          logo_url: data.store.logo_url,
          brand_colors: data.store.brand_colors,
          typography: data.store.typography,
          contact_phone: data.store.contact_phone,
          whatsapp_number: data.store.whatsapp_number,
          settings: data.store.settings
        },
        product: data.product
      },
      {
        headers: getCacheHeaders('product')
      }
    )
  } catch (error) {
    console.error('Product API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
