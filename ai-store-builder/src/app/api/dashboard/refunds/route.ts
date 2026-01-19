import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('refunds')
      .select(`
        *,
        orders!inner (
          order_number,
          customer_name,
          customer_email,
          store_id
        )
      `, { count: 'exact' })
      .eq('orders.store_id', store.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`orders.order_number.ilike.%${search}%,orders.customer_name.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: refunds, error: refundsError, count } = await query

    if (refundsError) {
      console.error('Failed to fetch refunds:', refundsError)
      return NextResponse.json({ error: 'Failed to fetch refunds' }, { status: 500 })
    }

    // Calculate stats
    const { data: stats } = await supabase
      .from('refunds')
      .select(`
        amount,
        status,
        orders!inner (store_id)
      `)
      .eq('orders.store_id', store.id)

    const totalRefunded = stats?.reduce((sum, r) => {
      if (r.status === 'processed') {
        return sum + Number(r.amount)
      }
      return sum
    }, 0) || 0

    const pendingRefunds = stats?.filter(r => r.status === 'pending').length || 0
    const processedRefunds = stats?.filter(r => r.status === 'processed').length || 0
    const failedRefunds = stats?.filter(r => r.status === 'failed').length || 0

    return NextResponse.json({
      refunds: refunds?.map(r => ({
        id: r.id,
        order_id: r.order_id,
        order_number: r.orders?.order_number,
        customer_name: r.orders?.customer_name,
        customer_email: r.orders?.customer_email,
        amount: r.amount,
        reason: r.reason,
        status: r.status,
        razorpay_refund_id: r.razorpay_refund_id,
        created_at: r.created_at,
        processed_at: r.processed_at
      })) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats: {
        totalRefunded,
        pendingRefunds,
        processedRefunds,
        failedRefunds
      }
    })

  } catch (error) {
    console.error('Refunds API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
