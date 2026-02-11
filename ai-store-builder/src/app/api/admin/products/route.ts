import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { getAdminProducts } from '@/lib/admin/queries'
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
    const storeId = searchParams.get('store_id') || undefined
    const status = searchParams.get('status') || undefined

    const { products, total } = await getAdminProducts({
      page,
      limit,
      search,
      storeId,
      status
    })

    return NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Admin products error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
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

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Product IDs required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Delete product images first
    await supabase
      .from('product_images')
      .delete()
      .in('product_id', ids)

    // Delete product variants
    await supabase
      .from('product_variants')
      .delete()
      .in('product_id', ids)

    // Delete products
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', ids)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error('Admin delete products error:', error)
    return NextResponse.json(
      { error: 'Failed to delete products' },
      { status: 500 }
    )
  }
}
