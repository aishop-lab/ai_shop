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

    // Get user's store with all settings (use limit instead of single for robustness)
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (storeError) {
      console.error('Error fetching store:', storeError)
      return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
    }

    const store = stores?.[0] || null
    return NextResponse.json({ store })

  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get update data
    const body = await request.json()

    // Get user's store first
    const { data: stores, error: fetchError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('Error fetching store:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
    }

    const existingStore = stores?.[0]
    if (!existingStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Update store
    const { data: store, error: updateError } = await supabase
      .from('stores')
      .update({
        name: body.name,
        tagline: body.tagline,
        description: body.description,
        contact_email: body.contact_email,
        contact_phone: body.contact_phone,
        whatsapp_number: body.whatsapp_number,
        instagram_handle: body.instagram_handle,
        brand_colors: body.brand_colors,
        settings: body.settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingStore.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating store:', updateError)
      return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
    }

    return NextResponse.json({ store })

  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
