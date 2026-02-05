import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// GET /api/store/[slug]/collections/[collectionSlug] - Get a single collection with products
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; collectionSlug: string }> }
) {
  try {
    const { slug: storeSlug, collectionSlug } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '24')
    const sort = searchParams.get('sort') || 'position'

    // Get store by slug
    const { data: store, error: storeError } = await getSupabaseAdmin()
      .from('stores')
      .select('id')
      .eq('slug', storeSlug)
      .eq('status', 'active')
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Get collection
    const { data: collection, error: collectionError } = await getSupabaseAdmin()
      .from('collections')
      .select(`
        id,
        title,
        slug,
        description,
        cover_image_url,
        meta_title,
        meta_description,
        featured
      `)
      .eq('store_id', store.id)
      .eq('slug', collectionSlug)
      .eq('visible', true)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Get total product count from manual assignments
    const { count: manualCount } = await getSupabaseAdmin()
      .from('collection_products')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collection.id)

    // Build products query
    const offset = (page - 1) * limit
    let products: Array<{
      id: string
      title: string
      slug: string
      description: string
      price: number
      compare_at_price: number | null
      images: Array<{ url: string; alt?: string }>
    }> = []
    let totalCount = manualCount || 0

    // First try: Get manually assigned products
    if (manualCount && manualCount > 0) {
      let productsQuery = getSupabaseAdmin()
        .from('collection_products')
        .select(`
          position,
          product:products!inner (
            id,
            title,
            slug,
            description,
            price,
            compare_at_price,
            status,
            product_images (
              url,
              alt,
              position
            )
          )
        `)
        .eq('collection_id', collection.id)
        .eq('product.status', 'published')

      // Apply sorting
      if (sort === 'price_asc') {
        productsQuery = productsQuery.order('product(price)', { ascending: true })
      } else if (sort === 'price_desc') {
        productsQuery = productsQuery.order('product(price)', { ascending: false })
      } else if (sort === 'newest') {
        productsQuery = productsQuery.order('product(created_at)', { ascending: false })
      } else {
        productsQuery = productsQuery.order('position', { ascending: true })
      }

      productsQuery = productsQuery.range(offset, offset + limit - 1)

      const { data: collectionProducts, error: productsError } = await productsQuery

      if (productsError) {
        console.error('[Store Collection] Products error:', productsError)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
      }

      // Transform products
      products = collectionProducts.map((cp) => {
        const product = cp.product as unknown as {
          id: string
          title: string
          slug: string
          description: string
          price: number
          compare_at_price: number | null
          status: string
          product_images: Array<{ url: string; alt?: string; position: number }>
        }
        return {
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          price: product.price,
          compare_at_price: product.compare_at_price,
          images: product.product_images
            ?.sort((a, b) => a.position - b.position)
            .map((img) => ({ url: img.url, alt: img.alt })) || []
        }
      })
    } else {
      // Fallback: Try to find products by matching tags/categories with collection title
      // This allows collections to auto-populate based on product tags
      const collectionTitle = collection.title.toLowerCase()

      // Query products that have matching tags or categories
      const { data: taggedProducts, error: tagError, count: tagCount } = await getSupabaseAdmin()
        .from('products')
        .select(`
          id,
          title,
          slug,
          description,
          price,
          compare_at_price,
          tags,
          categories,
          product_images (
            url,
            alt,
            position
          )
        `, { count: 'exact' })
        .eq('store_id', store.id)
        .eq('status', 'published')
        .or(`tags.cs.["${collectionTitle}"],categories.cs.["${collectionTitle}"]`)
        .range(offset, offset + limit - 1)

      if (!tagError && taggedProducts && taggedProducts.length > 0) {
        totalCount = tagCount || 0
        products = taggedProducts.map((product) => ({
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description || '',
          price: product.price,
          compare_at_price: product.compare_at_price,
          images: (product.product_images as Array<{ url: string; alt?: string; position: number }> || [])
            .sort((a, b) => a.position - b.position)
            .map((img) => ({ url: img.url, alt: img.alt }))
        }))
      }
    }

    return NextResponse.json({
      success: true,
      collection: {
        ...collection,
        product_count: totalCount || 0
      },
      products,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / limit)
      }
    })
  } catch (error) {
    console.error('[Store Collection] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch collection' },
      { status: 500 }
    )
  }
}
