import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ProductsListResponse } from '@/lib/types/dashboard'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest): Promise<NextResponse<ProductsListResponse | { error: string }>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('store_id')
    const status = searchParams.get('status') // all, draft, published, archived
    const category = searchParams.get('category')
    const featured = searchParams.get('featured') // true, false
    const lowStock = searchParams.get('low_stock') // true - show only low stock items
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '24')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('products')
      .select('*, product_images(*)', { count: 'exact' })
      .eq('store_id', storeId)

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    } else {
      // By default, exclude archived products
      query = query.neq('status', 'archived')
    }

    // Filter by category
    if (category) {
      query = query.eq('category', category)
    }

    // Filter by featured
    if (featured === 'true') {
      query = query.eq('featured', true)
    } else if (featured === 'false') {
      query = query.eq('featured', false)
    }

    // Filter low stock (quantity <= 5 and track_quantity is true)
    if (lowStock === 'true') {
      query = query.eq('track_quantity', true).lte('quantity', 5)
    }

    // Search by title or SKU
    if (search) {
      query = query.or(`title.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Sorting
    const ascending = sortOrder === 'asc'

    const { data: products, count, error } = await query
      .range(from, to)
      .order(sortBy, { ascending })

    if (error) throw error

    // Transform products to include primary image URL
    const transformedProducts = (products || []).map(product => ({
      ...product,
      images: product.product_images || [],
      primary_image: product.product_images?.find((img: { is_primary: boolean }) => img.is_primary)?.url 
        || product.product_images?.[0]?.url
    }))

    return NextResponse.json({
      products: transformedProducts,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// Get product categories for a store
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { store_id, action } = body

    if (!store_id) {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      )
    }

    if (action === 'get_categories') {
      // Get unique categories for the store
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('store_id', store_id)
        .neq('status', 'archived')

      if (error) throw error

      // Extract unique categories
      const categories = [...new Set(
        (data || [])
          .map(p => p.category)
          .filter(Boolean)
      )].sort()

      return NextResponse.json({ categories })
    }

    if (action === 'get_stats') {
      // Get product statistics
      const { count: total } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store_id)
        .neq('status', 'archived')

      const { count: published } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store_id)
        .eq('status', 'published')

      const { count: draft } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store_id)
        .eq('status', 'draft')

      const { count: lowStock } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store_id)
        .eq('track_quantity', true)
        .lte('quantity', 5)
        .neq('status', 'archived')

      const { count: outOfStock } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store_id)
        .eq('track_quantity', true)
        .eq('quantity', 0)
        .neq('status', 'archived')

      return NextResponse.json({
        stats: {
          total: total || 0,
          published: published || 0,
          draft: draft || 0,
          lowStock: lowStock || 0,
          outOfStock: outOfStock || 0
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Products action error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
