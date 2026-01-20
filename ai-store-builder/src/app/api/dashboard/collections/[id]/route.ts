import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateCollectionInput } from '@/lib/types/collection'

// GET /api/dashboard/collections/[id] - Get a single collection with products
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get collection with products
    const { data: collection, error } = await supabase
      .from('collections')
      .select(`
        *,
        collection_products (
          id,
          position,
          product:products (
            id,
            title,
            slug,
            price,
            compare_at_price,
            status,
            product_images (
              url,
              alt,
              position
            )
          )
        )
      `)
      .eq('id', id)
      .eq('store_id', store.id)
      .single()

    if (error || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Transform response
    const products = collection.collection_products
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((cp: { product: { id: string; title: string; slug: string; price: number; compare_at_price: number | null; status: string; product_images: Array<{ url: string; alt?: string; position: number }> } }) => ({
        ...cp.product,
        images: cp.product.product_images
          ?.sort((a: { position: number }, b: { position: number }) => a.position - b.position)
          .map((img: { url: string; alt?: string }) => ({ url: img.url, alt: img.alt })) || []
      }))

    return NextResponse.json({
      success: true,
      collection: {
        ...collection,
        collection_products: undefined,
        products,
        product_count: products.length
      }
    })
  } catch (error) {
    console.error('[Collections] Get error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch collection' },
      { status: 500 }
    )
  }
}

// PATCH /api/dashboard/collections/[id] - Update a collection
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Verify collection belongs to store
    const { data: existing } = await supabase
      .from('collections')
      .select('id')
      .eq('id', id)
      .eq('store_id', store.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const body: UpdateCollectionInput = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description
    if (body.cover_image_url !== undefined) updateData.cover_image_url = body.cover_image_url
    if (body.meta_title !== undefined) updateData.meta_title = body.meta_title
    if (body.meta_description !== undefined) updateData.meta_description = body.meta_description
    if (body.featured !== undefined) updateData.featured = body.featured
    if (body.visible !== undefined) updateData.visible = body.visible
    if (body.position !== undefined) updateData.position = body.position

    // Handle slug update
    if (body.slug !== undefined) {
      const newSlug = body.slug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Check for uniqueness
      const { data: slugExists } = await supabase
        .from('collections')
        .select('id')
        .eq('store_id', store.id)
        .eq('slug', newSlug)
        .neq('id', id)
        .single()

      if (slugExists) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
      }

      updateData.slug = newSlug
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update collection
    const { data: collection, error: updateError } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Collections] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 })
    }

    console.log('[Collections] Updated:', id)

    return NextResponse.json({
      success: true,
      collection
    })
  } catch (error) {
    console.error('[Collections] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update collection' },
      { status: 500 }
    )
  }
}

// DELETE /api/dashboard/collections/[id] - Delete a collection
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Delete collection (cascade will remove collection_products)
    const { error: deleteError } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .eq('store_id', store.id)

    if (deleteError) {
      console.error('[Collections] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 })
    }

    console.log('[Collections] Deleted:', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Collections] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete collection' },
      { status: 500 }
    )
  }
}
