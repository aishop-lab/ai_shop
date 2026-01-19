// Product List API Route

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoreProducts, verifyStoreOwnership, getStoreCategories } from '@/lib/products/db-operations'
import { productListQuerySchema } from '@/lib/products/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      store_id: searchParams.get('store_id') || '',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '24',
      status: searchParams.get('status') || 'all',
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: searchParams.get('sort_order') || 'desc'
    }

    // Validate query parameters
    const validation = productListQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    const filters = validation.data

    // Verify store ownership
    const isOwner = await verifyStoreOwnership(user.id, filters.store_id)
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this store' },
        { status: 403 }
      )
    }

    // Get products
    const result = await getStoreProducts(filters.store_id, {
      status: filters.status as 'draft' | 'published' | 'archived' | 'all',
      category: filters.category,
      search: filters.search,
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sort_by as 'created_at' | 'price' | 'title' | 'quantity',
      sortOrder: filters.sort_order as 'asc' | 'desc'
    })

    // Get available categories for filtering
    const categories = await getStoreCategories(filters.store_id)

    return NextResponse.json({
      success: true,
      ...result,
      categories
    })

  } catch (error) {
    console.error('Product list error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
