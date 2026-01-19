import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store with blueprint for category info (use limit(1) instead of single() for robustness)
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug, status, logo_url, blueprint')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (storeError) {
      console.error('Error fetching store:', storeError)
    }

    const store = stores?.[0] || null

    // If no store, return early
    if (!store) {
      return NextResponse.json({
        productCount: 0,
        publishedCount: 0,
        draftCount: 0,
        store: null
      })
    }

    // Get product counts
    const { count: productCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id)

    const { count: publishedCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .eq('status', 'published')

    const { count: draftCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .eq('status', 'draft')

    return NextResponse.json({
      productCount: productCount || 0,
      publishedCount: publishedCount || 0,
      draftCount: draftCount || 0,
      store
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
