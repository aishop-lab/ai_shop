import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdmin } from '@/lib/admin/auth'
import { getStoresWithDetails } from '@/lib/admin/queries'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined

    const { stores, total } = await getStoresWithDetails({ page, limit, search, status })

    return NextResponse.json({
      stores,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Admin stores error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate IDs are UUIDs and enforce count limit
    const deleteSchema = z.object({
      ids: z.array(z.string().uuid()).min(1).max(100),
    })
    const validation = deleteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request: each ID must be a valid UUID, max 100 items' },
        { status: 400 }
      )
    }
    const { ids } = validation.data

    const supabase = getSupabaseAdmin()

    // Get all products in these stores
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .in('store_id', ids)

    const productIds = products?.map(p => p.id) || []

    if (productIds.length > 0) {
      // Delete product-related data
      await supabase.from('product_images').delete().in('product_id', productIds)
      await supabase.from('product_variants').delete().in('product_id', productIds)
      await supabase.from('product_reviews').delete().in('product_id', productIds)
    }

    // Delete store-related data
    await supabase.from('products').delete().in('store_id', ids)
    await supabase.from('orders').delete().in('store_id', ids)
    await supabase.from('customers').delete().in('store_id', ids)
    await supabase.from('coupons').delete().in('store_id', ids)
    await supabase.from('collections').delete().in('store_id', ids)
    await supabase.from('notifications').delete().in('store_id', ids)
    await supabase.from('abandoned_carts').delete().in('store_id', ids)

    // Delete stores
    const { error } = await supabase
      .from('stores')
      .delete()
      .in('id', ids)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error('Admin delete stores error:', error)
    return NextResponse.json(
      { error: 'Failed to delete stores' },
      { status: 500 }
    )
  }
}
