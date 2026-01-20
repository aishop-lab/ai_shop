import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ProductActionRequest {
  product_id?: string
  product_ids?: string[]
  action: 'add' | 'remove' | 'set' | 'reorder'
  positions?: { product_id: string; position: number }[]
}

// POST /api/dashboard/collections/[id]/products - Manage products in collection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
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
    const { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .eq('store_id', store.id)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const body: ProductActionRequest = await request.json()

    if (!body.action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    switch (body.action) {
      case 'add': {
        // Add product(s) to collection
        const productIds = body.product_ids || (body.product_id ? [body.product_id] : [])

        if (productIds.length === 0) {
          return NextResponse.json({ error: 'product_id or product_ids is required' }, { status: 400 })
        }

        // Verify products belong to the same store
        const { data: validProducts } = await supabase
          .from('products')
          .select('id')
          .eq('store_id', store.id)
          .in('id', productIds)

        if (!validProducts || validProducts.length !== productIds.length) {
          return NextResponse.json({ error: 'Some products not found or do not belong to this store' }, { status: 400 })
        }

        // Get max position
        const { data: maxPos } = await supabase
          .from('collection_products')
          .select('position')
          .eq('collection_id', collectionId)
          .order('position', { ascending: false })
          .limit(1)
          .single()

        let currentPosition = (maxPos?.position || 0) + 1

        // Insert products (ignore duplicates)
        const entries = productIds.map((productId) => ({
          collection_id: collectionId,
          product_id: productId,
          position: currentPosition++
        }))

        const { error: insertError } = await supabase
          .from('collection_products')
          .upsert(entries, { onConflict: 'collection_id,product_id', ignoreDuplicates: true })

        if (insertError) {
          console.error('[Collections] Add products error:', insertError)
          return NextResponse.json({ error: 'Failed to add products' }, { status: 500 })
        }

        console.log('[Collections] Added products to:', collectionId, productIds)
        break
      }

      case 'remove': {
        // Remove product(s) from collection
        const productIds = body.product_ids || (body.product_id ? [body.product_id] : [])

        if (productIds.length === 0) {
          return NextResponse.json({ error: 'product_id or product_ids is required' }, { status: 400 })
        }

        const { error: deleteError } = await supabase
          .from('collection_products')
          .delete()
          .eq('collection_id', collectionId)
          .in('product_id', productIds)

        if (deleteError) {
          console.error('[Collections] Remove products error:', deleteError)
          return NextResponse.json({ error: 'Failed to remove products' }, { status: 500 })
        }

        console.log('[Collections] Removed products from:', collectionId, productIds)
        break
      }

      case 'set': {
        // Replace all products in collection
        const productIds = body.product_ids || []

        // Verify products belong to the same store
        if (productIds.length > 0) {
          const { data: validProducts } = await supabase
            .from('products')
            .select('id')
            .eq('store_id', store.id)
            .in('id', productIds)

          if (!validProducts || validProducts.length !== productIds.length) {
            return NextResponse.json({ error: 'Some products not found or do not belong to this store' }, { status: 400 })
          }
        }

        // Delete existing products
        await supabase
          .from('collection_products')
          .delete()
          .eq('collection_id', collectionId)

        // Insert new products
        if (productIds.length > 0) {
          const entries = productIds.map((productId, index) => ({
            collection_id: collectionId,
            product_id: productId,
            position: index
          }))

          const { error: insertError } = await supabase
            .from('collection_products')
            .insert(entries)

          if (insertError) {
            console.error('[Collections] Set products error:', insertError)
            return NextResponse.json({ error: 'Failed to set products' }, { status: 500 })
          }
        }

        console.log('[Collections] Set products for:', collectionId, productIds.length)
        break
      }

      case 'reorder': {
        // Reorder products in collection
        if (!body.positions || body.positions.length === 0) {
          return NextResponse.json({ error: 'positions is required for reorder' }, { status: 400 })
        }

        // Update positions
        for (const { product_id, position } of body.positions) {
          await supabase
            .from('collection_products')
            .update({ position })
            .eq('collection_id', collectionId)
            .eq('product_id', product_id)
        }

        console.log('[Collections] Reordered products for:', collectionId)
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get updated product count
    const { count } = await supabase
      .from('collection_products')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId)

    return NextResponse.json({
      success: true,
      product_count: count || 0
    })
  } catch (error) {
    console.error('[Collections] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage products' },
      { status: 500 }
    )
  }
}

// GET /api/dashboard/collections/[id]/products - Get products in collection
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
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
    const { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .eq('store_id', store.id)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Get products
    const { data: collectionProducts, error } = await supabase
      .from('collection_products')
      .select(`
        id,
        position,
        product:products (
          id,
          title,
          slug,
          price,
          compare_at_price,
          status,
          inventory_count,
          product_images (
            url,
            alt,
            position
          )
        )
      `)
      .eq('collection_id', collectionId)
      .order('position', { ascending: true })

    if (error) {
      console.error('[Collections] Get products error:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    const products = collectionProducts.map((cp) => ({
      ...cp.product,
      collection_product_id: cp.id,
      position: cp.position,
      images: (cp.product as { product_images?: Array<{ url: string; alt?: string; position: number }> }).product_images
        ?.sort((a: { position: number }, b: { position: number }) => a.position - b.position)
        .map((img: { url: string; alt?: string }) => ({ url: img.url, alt: img.alt })) || []
    }))

    return NextResponse.json({
      success: true,
      products
    })
  } catch (error) {
    console.error('[Collections] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
