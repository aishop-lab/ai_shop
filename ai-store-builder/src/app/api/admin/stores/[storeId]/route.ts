import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { getStoreDetails, updateStoreStatus } from '@/lib/admin/queries'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit-log'

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
    const { status, name } = body

    const supabase = getSupabaseAdmin()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const auditDetails: Record<string, unknown> = {}

    // Handle status update
    if (status) {
      if (!['active', 'suspended', 'draft'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be: active, suspended, or draft' },
          { status: 400 }
        )
      }
      updates.status = status
      auditDetails.new_status = status
    }

    // Handle name update
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 1) {
        return NextResponse.json(
          { error: 'Store name must be a non-empty string' },
          { status: 400 }
        )
      }
      updates.name = name.trim()
      auditDetails.new_name = name.trim()
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // If only status changed, use the existing helper for backward compat
    if (status && !name) {
      await updateStoreStatus(storeId, status)
    } else {
      const { error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', storeId)

      if (error) {
        throw new Error(`Failed to update store: ${error.message}`)
      }
    }

    // Determine the audit action
    let action = 'store_updated'
    if (status === 'suspended') action = 'store_suspended'
    else if (status === 'active') action = 'store_activated'

    await logAdminAction({
      admin_user_id: admin.user.id,
      action,
      entity_type: 'store',
      entity_id: storeId,
      details: auditDetails,
    })

    return NextResponse.json({ success: true, ...auditDetails })
  } catch (error) {
    console.error('Admin store update error:', error)
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    )
  }
}
