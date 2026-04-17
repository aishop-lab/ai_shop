import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const { data: customers } = await admin
    .from('customers')
    .select('full_name, email, phone, total_orders, total_spent, last_order_at, marketing_consent, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(10000)

  if (!customers || customers.length === 0) {
    return NextResponse.json({ error: 'No customers to export' }, { status: 404 })
  }

  const headers = ['Name', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Last Order', 'Marketing Consent', 'Joined']
  const rows = customers.map((c: any) => [
    c.full_name || '',
    c.email,
    c.phone || '',
    c.total_orders,
    c.total_spent,
    c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : 'Never',
    c.marketing_consent ? 'Yes' : 'No',
    new Date(c.created_at).toLocaleDateString(),
  ])

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=customers-${new Date().toISOString().split('T')[0]}.csv`,
    },
  })
}
