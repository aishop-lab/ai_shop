import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// GET /api/store/[slug]/collections - Get all visible collections for a store
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: storeSlug } = await params
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured')

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

    // Build query for collections
    let query = getSupabaseAdmin()
      .from('collections')
      .select(`
        id,
        title,
        slug,
        description,
        cover_image_url,
        featured,
        position,
        collection_products (
          product_id
        )
      `)
      .eq('store_id', store.id)
      .eq('visible', true)
      .order('position', { ascending: true })

    if (featured === 'true') {
      query = query.eq('featured', true)
    }

    const { data: collections, error } = await query

    if (error) {
      console.error('[Store Collections] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
    }

    // Transform to include product count
    const collectionsWithCount = collections.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      cover_image_url: c.cover_image_url,
      featured: c.featured,
      product_count: c.collection_products?.length || 0
    }))

    return NextResponse.json({
      success: true,
      collections: collectionsWithCount
    })
  } catch (error) {
    console.error('[Store Collections] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}
