import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    // Verify user owns the store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('abandoned_carts')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('recovery_status', status)
    }

    // Search by email
    if (search) {
      query = query.ilike('email', `%${search}%`)
    }

    const { data: carts, error: cartsError } = await query.limit(100)

    if (cartsError) {
      console.error('Failed to fetch abandoned carts:', cartsError)
      return NextResponse.json({ error: 'Failed to fetch carts' }, { status: 500 })
    }

    // Calculate stats
    const { data: statsData } = await supabase
      .from('abandoned_carts')
      .select('recovery_status, subtotal')
      .eq('store_id', storeId)

    const stats = {
      active: 0,
      recovered: 0,
      expired: 0,
      total_value: 0,
      recovery_rate: 0,
    }

    if (statsData) {
      for (const cart of statsData) {
        if (cart.recovery_status === 'active') {
          stats.active++
          stats.total_value += cart.subtotal || 0
        } else if (cart.recovery_status === 'recovered') {
          stats.recovered++
        } else if (cart.recovery_status === 'expired') {
          stats.expired++
        }
      }

      const totalWithEmail = stats.active + stats.recovered + stats.expired
      if (totalWithEmail > 0) {
        stats.recovery_rate = (stats.recovered / totalWithEmail) * 100
      }
    }

    return NextResponse.json({
      carts: carts || [],
      total: carts?.length || 0,
      stats,
    })
  } catch (error) {
    console.error('Abandoned carts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
