// Reset Onboarding API - Delete existing store and reset onboarding state
// POST /api/onboarding/reset

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`[Reset] Resetting onboarding for user: ${user.id}`)

    // Get existing stores for this user
    const { data: existingStores, error: fetchError } = await supabase
      .from('stores')
      .select('id, slug, name')
      .eq('owner_id', user.id)

    if (fetchError) {
      console.error('[Reset] Error fetching stores:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch existing stores' },
        { status: 500 }
      )
    }

    const storeCount = existingStores?.length || 0
    console.log(`[Reset] Found ${storeCount} existing store(s)`)

    // Delete existing stores
    if (storeCount > 0) {
      // First delete products for these stores
      const storeIds = existingStores.map(s => s.id)

      // Fetch product IDs first
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .in('store_id', storeIds)

      const productIds = products?.map(p => p.id) || []

      // Delete product images first (foreign key constraint)
      if (productIds.length > 0) {
        const { error: imgError } = await supabase
          .from('product_images')
          .delete()
          .in('product_id', productIds)

        if (imgError) {
          console.log('[Reset] Note: product_images deletion:', imgError.message)
        }
      }

      // Delete products
      const { error: prodError } = await supabase
        .from('products')
        .delete()
        .in('store_id', storeIds)

      if (prodError) {
        console.log('[Reset] Note: products deletion:', prodError.message)
      }

      // Delete stores
      const { error: storeError } = await supabase
        .from('stores')
        .delete()
        .eq('owner_id', user.id)

      if (storeError) {
        console.error('[Reset] Error deleting stores:', storeError)
        return NextResponse.json(
          { success: false, error: 'Failed to delete existing stores' },
          { status: 500 }
        )
      }
    }

    // Reset profile onboarding state
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: false,
        onboarding_current_step: 0
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('[Reset] Error updating profile:', profileError)
      // Don't fail completely, store was deleted
    }

    console.log(`[Reset] Successfully reset onboarding for user: ${user.id}`)

    return NextResponse.json({
      success: true,
      message: `Reset complete. Deleted ${storeCount} store(s).`,
      deletedStores: existingStores?.map(s => ({ slug: s.slug, name: s.name })) || []
    })
  } catch (error) {
    console.error('[Reset] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset onboarding' },
      { status: 500 }
    )
  }
}

// GET - Check current state
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get existing stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, slug, name, status, created_at')
      .eq('owner_id', user.id)

    // Get profile state
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_current_step')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      user_id: user.id,
      stores: stores || [],
      profile: profile || null
    })
  } catch (error) {
    console.error('[Reset] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check state' },
      { status: 500 }
    )
  }
}
