import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateCollectionInput } from '@/lib/types/collection'

// GET /api/dashboard/collections - List all collections for the user's store
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured')
    const visible = searchParams.get('visible')

    // Build query
    let query = supabase
      .from('collections')
      .select(`
        *,
        collection_products (
          product_id
        )
      `)
      .eq('store_id', store.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (featured === 'true') {
      query = query.eq('featured', true)
    }
    if (visible === 'true') {
      query = query.eq('visible', true)
    }

    const { data: collections, error } = await query

    if (error) {
      console.error('[Collections] List error:', error)
      return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
    }

    // Transform to include product count
    const collectionsWithCount = collections.map((c) => ({
      ...c,
      product_count: c.collection_products?.length || 0,
      collection_products: undefined
    }))

    return NextResponse.json({
      success: true,
      collections: collectionsWithCount
    })
  } catch (error) {
    console.error('[Collections] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

// POST /api/dashboard/collections - Create a new collection
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body: CreateCollectionInput = await request.json()

    if (!body.title || body.title.trim() === '') {
      return NextResponse.json({ error: 'Collection title is required' }, { status: 400 })
    }

    // Generate slug
    const baseSlug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check for unique slug
    let slug = baseSlug
    let counter = 0
    while (true) {
      const { data: existing } = await supabase
        .from('collections')
        .select('id')
        .eq('store_id', store.id)
        .eq('slug', slug)
        .single()

      if (!existing) break
      counter++
      slug = `${baseSlug}-${counter}`
    }

    // Get max position
    const { data: maxPos } = await supabase
      .from('collections')
      .select('position')
      .eq('store_id', store.id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = (maxPos?.position || 0) + 1

    // Create collection
    const { data: collection, error: createError } = await supabase
      .from('collections')
      .insert({
        store_id: store.id,
        title: body.title.trim(),
        slug,
        description: body.description || null,
        cover_image_url: body.cover_image_url || null,
        meta_title: body.meta_title || null,
        meta_description: body.meta_description || null,
        featured: body.featured || false,
        visible: body.visible !== false,
        position
      })
      .select()
      .single()

    if (createError) {
      console.error('[Collections] Create error:', createError)
      return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
    }

    // Add products if provided
    if (body.product_ids && body.product_ids.length > 0) {
      const productEntries = body.product_ids.map((productId, index) => ({
        collection_id: collection.id,
        product_id: productId,
        position: index
      }))

      const { error: productsError } = await supabase
        .from('collection_products')
        .insert(productEntries)

      if (productsError) {
        console.error('[Collections] Add products error:', productsError)
        // Collection created but products failed - return partial success
      }
    }

    console.log('[Collections] Created:', collection.id)

    return NextResponse.json({
      success: true,
      collection: {
        ...collection,
        product_count: body.product_ids?.length || 0
      }
    })
  } catch (error) {
    console.error('[Collections] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create collection' },
      { status: 500 }
    )
  }
}
