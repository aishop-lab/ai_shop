import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')
  const segment = searchParams.get('segment') || 'all'
  const search = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort_by') || 'created_at'
  const sortOrder = searchParams.get('sort_order') === 'asc'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id is required' }, { status: 400 })
  }

  // Verify store ownership
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (storeError || !store) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = admin
    .from('customers')
    .select('id, email, phone, full_name, marketing_consent, total_orders, total_spent, last_order_at, created_at', { count: 'exact' })
    .eq('store_id', storeId)

  // Segment filtering
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  if (segment === 'active') {
    query = query.gte('last_order_at', thirtyDaysAgo)
  } else if (segment === 'at_risk') {
    query = query.lt('last_order_at', thirtyDaysAgo).gte('last_order_at', ninetyDaysAgo)
  } else if (segment === 'churned') {
    query = query.lt('last_order_at', ninetyDaysAgo)
  } else if (segment === 'new') {
    query = query.lte('total_orders', 1)
  }

  // Search
  if (search) {
    const s = sanitizeSearchQuery(search)
    query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`)
  }

  // Sort and paginate
  const validSortColumns = ['created_at', 'total_spent', 'total_orders', 'last_order_at', 'full_name']
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
  query = query.order(sortColumn, { ascending: sortOrder }).range(from, to)

  const { data: customers, error, count } = await query

  if (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }

  // Get segment counts for tabs
  const { data: allCustomers } = await admin
    .from('customers')
    .select('total_orders, last_order_at')
    .eq('store_id', storeId)

  const segments = { all: 0, active: 0, at_risk: 0, churned: 0, new: 0 }
  if (allCustomers) {
    segments.all = allCustomers.length
    for (const c of allCustomers) {
      if (c.total_orders <= 1) segments.new++
      if (c.last_order_at && c.last_order_at >= thirtyDaysAgo) segments.active++
      else if (c.last_order_at && c.last_order_at < thirtyDaysAgo && c.last_order_at >= ninetyDaysAgo) segments.at_risk++
      else if (c.last_order_at && c.last_order_at < ninetyDaysAgo) segments.churned++
    }
  }

  return NextResponse.json({
    customers: customers || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
    segments,
  })
}
