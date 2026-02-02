import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/dashboard/settings/shipping
 * Update shipping settings for the store
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, settings')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await request.json()

    // Validate shipping settings
    const {
      free_shipping_threshold,
      flat_rate_national,
      cod_enabled,
      cod_fee,
      config,
    } = body

    if (typeof free_shipping_threshold !== 'number' || free_shipping_threshold < 0) {
      return NextResponse.json(
        { error: 'Invalid free shipping threshold' },
        { status: 400 }
      )
    }

    if (typeof flat_rate_national !== 'number' || flat_rate_national < 0) {
      return NextResponse.json(
        { error: 'Invalid flat rate' },
        { status: 400 }
      )
    }

    // Build updated settings
    const currentSettings = store.settings || {}
    const updatedSettings = {
      ...currentSettings,
      shipping: {
        ...(currentSettings.shipping || {}),
        free_shipping_threshold,
        flat_rate_national,
        cod_enabled: !!cod_enabled,
        cod_fee: cod_fee || 0,
        config: config || undefined,
      },
    }

    // Validate zones if provided
    if (config?.use_zones && config.zones?.length) {
      for (const zone of config.zones) {
        if (!zone.id || !zone.name) {
          return NextResponse.json(
            { error: 'Each zone must have an id and name' },
            { status: 400 }
          )
        }
        if (typeof zone.flat_rate !== 'number' || zone.flat_rate < 0) {
          return NextResponse.json(
            { error: `Invalid flat rate for zone: ${zone.name}` },
            { status: 400 }
          )
        }
      }
    }

    // Update store settings
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Failed to update shipping settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      shipping: updatedSettings.shipping,
    })
  } catch (error) {
    console.error('Shipping settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dashboard/settings/shipping
 * Get shipping settings for the store
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('settings')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const shipping = store.settings?.shipping || {
      free_shipping_threshold: 999,
      flat_rate_national: 49,
      cod_enabled: true,
      cod_fee: 20,
    }

    return NextResponse.json({ shipping })
  } catch (error) {
    console.error('Shipping settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
