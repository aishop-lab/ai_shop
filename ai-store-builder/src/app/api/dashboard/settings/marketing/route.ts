import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const marketingPixelsSchema = z.object({
  facebook_pixel_id: z.string().nullable().optional(),
  google_analytics_id: z.string().nullable().optional(),
  google_ads_conversion_id: z.string().nullable().optional(),
  google_ads_conversion_label: z.string().nullable().optional()
})

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('marketing_pixels')
      .eq('owner_id', user.id)
      .single()

    if (storeError) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    return NextResponse.json({
      marketing_pixels: store.marketing_pixels || {
        facebook_pixel_id: null,
        google_analytics_id: null,
        google_ads_conversion_id: null,
        google_ads_conversion_label: null
      }
    })

  } catch (error) {
    console.error('Marketing settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marketing settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = marketingPixelsSchema.safeParse(body.marketing_pixels)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    // Validate pixel ID formats
    const pixels = validation.data

    if (pixels.facebook_pixel_id && !/^\d{15,16}$/.test(pixels.facebook_pixel_id)) {
      return NextResponse.json(
        { error: 'Invalid Facebook Pixel ID format. Should be 15-16 digits.' },
        { status: 400 }
      )
    }

    if (pixels.google_analytics_id && !/^G-[A-Z0-9]{10}$/.test(pixels.google_analytics_id)) {
      return NextResponse.json(
        { error: 'Invalid Google Analytics ID format. Should be G-XXXXXXXXXX.' },
        { status: 400 }
      )
    }

    if (pixels.google_ads_conversion_id && !/^AW-\d+$/.test(pixels.google_ads_conversion_id)) {
      return NextResponse.json(
        { error: 'Invalid Google Ads Conversion ID format. Should be AW-XXXXXXXXX.' },
        { status: 400 }
      )
    }

    // Get store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Update marketing pixels
    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update({
        marketing_pixels: pixels,
        updated_at: new Date().toISOString()
      })
      .eq('id', store.id)
      .select('marketing_pixels')
      .single()

    if (updateError) {
      console.error('Failed to update marketing pixels:', updateError)
      return NextResponse.json(
        { error: 'Failed to update marketing settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      marketing_pixels: updatedStore.marketing_pixels
    })

  } catch (error) {
    console.error('Marketing settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update marketing settings' },
      { status: 500 }
    )
  }
}
