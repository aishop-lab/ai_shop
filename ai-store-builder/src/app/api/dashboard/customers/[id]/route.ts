import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id is required' }, { status: 400 })
  }

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  // Fetch customer
  const { data: customer, error: customerError } = await admin
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Fetch related data in parallel
  const [ordersRes, addressesRes, wishlistRes, loyaltyRes] = await Promise.all([
    admin
      .from('orders')
      .select('id, order_number, total_amount, currency, order_status, payment_status, created_at')
      .eq('store_id', storeId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', id)
      .order('is_default', { ascending: false }),
    admin
      .from('wishlists')
      .select('product_id, created_at, products(id, title, price, currency, images)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('loyalty_points')
      .select('balance, lifetime_earned, lifetime_redeemed, tier')
      .eq('store_id', storeId)
      .eq('customer_id', id)
      .maybeSingle(),
  ])

  // Compute stats
  const orders = ordersRes.data || []
  const paidOrders = orders.filter((o: any) => o.payment_status === 'paid')
  const avgOrderValue = paidOrders.length > 0
    ? paidOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || 0), 0) / paidOrders.length
    : 0

  return NextResponse.json({
    customer,
    orders,
    addresses: addressesRes.data || [],
    wishlist: wishlistRes.data || [],
    loyalty: loyaltyRes.data || null,
    stats: {
      totalOrders: customer.total_orders,
      totalSpent: customer.total_spent,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      loyaltyPoints: loyaltyRes.data?.balance || 0,
      loyaltyTier: loyaltyRes.data?.tier || 'none',
    },
  })
}
