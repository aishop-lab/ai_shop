import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCompetitorPrices,
  addCompetitorPrice,
} from '@/lib/agents/sales/competitor-monitor'

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
    const productId = searchParams.get('product_id') || undefined

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'store_id is required' },
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

    const prices = await getCompetitorPrices(storeId, productId)

    return NextResponse.json({ success: true, prices })
  } catch (error) {
    console.error('Competitor prices GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch competitor prices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, product_id, source, price, url } = body

    if (!store_id) {
      return NextResponse.json(
        { success: false, error: 'store_id is required' },
        { status: 400 }
      )
    }

    if (!product_id) {
      return NextResponse.json(
        { success: false, error: 'product_id is required' },
        { status: 400 }
      )
    }

    if (!source || typeof source !== 'string' || source.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'source is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { success: false, error: 'price must be a number greater than 0' },
        { status: 400 }
      )
    }

    // Verify the authenticated user owns this store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, error: 'Store not found or access denied' },
        { status: 403 }
      )
    }

    const result = await addCompetitorPrice(store_id, {
      productId: product_id,
      source: source.trim(),
      price,
      url: url || undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Competitor prices POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add competitor price' },
      { status: 500 }
    )
  }
}
