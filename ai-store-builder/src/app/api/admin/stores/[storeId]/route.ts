import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { getStoreDetails, updateStoreStatus } from '@/lib/admin/queries'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { storeId } = await params
    const store = await getStoreDetails(storeId)

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Also get recent orders for this store
    const supabase = getSupabaseAdmin()
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        total_amount,
        payment_status,
        order_status,
        created_at
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get customers count for this store
    const { count: customersCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)

    return NextResponse.json({
      store,
      recentOrders: recentOrders || [],
      customersCount: customersCount || 0
    })
  } catch (error) {
    console.error('Admin store detail error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch store details' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { storeId } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['active', 'suspended', 'draft'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: active, suspended, or draft' },
        { status: 400 }
      )
    }

    await updateStoreStatus(storeId, status)

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Admin store update error:', error)
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    )
  }
}
