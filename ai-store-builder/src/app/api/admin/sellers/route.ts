import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { getSellers } from '@/lib/admin/queries'
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

    const { sellers, total } = await getSellers({ page, limit, search })

    return NextResponse.json({
      sellers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Admin sellers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sellers' },
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
      return NextResponse.json({ error: 'Seller IDs required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Get stores owned by these sellers
    const { data: stores } = await supabase
      .from('stores')
      .select('id')
      .in('owner_id', ids)

    const storeIds = stores?.map(s => s.id) || []

    if (storeIds.length > 0) {
      // Delete store-related data
      await supabase.from('products').delete().in('store_id', storeIds)
      await supabase.from('orders').delete().in('store_id', storeIds)
      await supabase.from('customers').delete().in('store_id', storeIds)
      await supabase.from('coupons').delete().in('store_id', storeIds)
      await supabase.from('collections').delete().in('store_id', storeIds)
      await supabase.from('notifications').delete().in('store_id', storeIds)

      // Delete stores
      await supabase.from('stores').delete().in('id', storeIds)
    }

    // Delete seller profiles
    const { error } = await supabase
      .from('profiles')
      .delete()
      .in('id', ids)

    if (error) {
      throw error
    }

    // Note: Supabase auth users are not deleted - they would need to be deleted via auth admin API

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error('Admin delete sellers error:', error)
    return NextResponse.json(
      { error: 'Failed to delete sellers' },
      { status: 500 }
    )
  }
}
