import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { getCustomers } from '@/lib/admin/queries'
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

    const { customers, total } = await getCustomers({ page, limit, search, storeId })

    return NextResponse.json({
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Admin customers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
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
      return NextResponse.json({ error: 'Customer IDs required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Delete customer sessions
    await supabase
      .from('customer_sessions')
      .delete()
      .in('customer_id', ids)

    // Delete customer addresses
    await supabase
      .from('customer_addresses')
      .delete()
      .in('customer_id', ids)

    // Delete wishlists
    await supabase
      .from('wishlists')
      .delete()
      .in('customer_id', ids)

    // Delete customers
    const { error } = await supabase
      .from('customers')
      .delete()
      .in('id', ids)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error('Admin delete customers error:', error)
    return NextResponse.json(
      { error: 'Failed to delete customers' },
      { status: 500 }
    )
  }
}
