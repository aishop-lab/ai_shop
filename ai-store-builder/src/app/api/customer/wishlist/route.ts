import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { validateSession } from '@/lib/customer/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get wishlist
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const { data: wishlist, error } = await supabase
      .from('wishlists')
      .select(`
        id,
        created_at,
        product:products (
          id,
          title,
          slug,
          price,
          compare_at_price,
          status,
          quantity,
          product_images (
            url,
            alt_text
          )
        )
      `)
      .eq('customer_id', sessionResult.customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch wishlist:', error)
      return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 })
    }

    // Filter out products that are no longer available
    const activeWishlist = wishlist?.filter(
      item => item.product && (item.product as unknown as { status: string }).status === 'published'
    ) || []

    return NextResponse.json({ success: true, wishlist: activeWishlist })
  } catch (error) {
    console.error('Get wishlist error:', error)
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 })
  }
}

// Add to wishlist
const addSchema = z.object({
  productId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const body = await request.json()
    const validation = addSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Verify product exists and belongs to the same store
    const { data: product } = await supabase
      .from('products')
      .select('id, store_id')
      .eq('id', validation.data.productId)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.store_id !== sessionResult.customer.store_id) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Add to wishlist (upsert to handle duplicates gracefully)
    const { data: wishlistItem, error } = await supabase
      .from('wishlists')
      .upsert(
        {
          customer_id: sessionResult.customer.id,
          product_id: validation.data.productId
        },
        { onConflict: 'customer_id,product_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Failed to add to wishlist:', error)
      return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true, wishlistItem })
  } catch (error) {
    console.error('Add to wishlist error:', error)
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 })
  }
}

// Remove from wishlist
const removeSchema = z.object({
  productId: z.string().uuid()
})

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionResult = await validateSession(token)
    if (!sessionResult.success || !sessionResult.customer) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    const validation = removeSchema.safeParse({ productId })

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('customer_id', sessionResult.customer.id)
      .eq('product_id', validation.data.productId)

    if (error) {
      console.error('Failed to remove from wishlist:', error)
      return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove from wishlist error:', error)
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 })
  }
}
