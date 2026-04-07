import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'
import type { OrdersListResponse } from '@/lib/types/dashboard'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('store_id')
    const status = searchParams.get('status') // all, pending, confirmed, shipped, etc.
    const paymentStatus = searchParams.get('payment_status') // all, pending, paid, failed
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      )
    }

    // Verify the authenticated user owns this store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
    }

    let query = getSupabaseAdmin()
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('store_id', storeId)

    // Filter by order status
    if (status && status !== 'all') {
      query = query.eq('order_status', status)
    }

    // Filter by payment status
    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus)
    }

    // Search by order number or customer name/email (database columns: customer_name, email)
    if (search) {
      const s = sanitizeSearchQuery(search)
      query = query.or(
        `order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_email.ilike.%${s}%`
      )
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Sorting
    const ascending = sortOrder === 'asc'
    
    const { data: orders, count, error } = await query
      .range(from, to)
      .order(sortBy, { ascending })

    if (error) throw error

    return NextResponse.json({
      orders: orders || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
