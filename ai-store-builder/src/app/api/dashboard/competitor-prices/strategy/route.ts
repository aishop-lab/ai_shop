import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPricingStrategy } from '@/lib/agents/sales/competitor-monitor'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('store_id')
    const productId = searchParams.get('product_id')

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'store_id is required' },
        { status: 400 }
      )
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'product_id is required' },
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
      return NextResponse.json(
        { success: false, error: 'Store not found or access denied' },
        { status: 403 }
      )
    }

    const result = await getPricingStrategy(storeId, productId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Pricing strategy error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get pricing strategy' },
      { status: 500 }
    )
  }
}
