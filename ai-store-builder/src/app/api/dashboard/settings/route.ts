import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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

    // Get user's store first (include slug for revalidation)
    const { data: stores, error: fetchError } = await supabase
      .from('stores')
      .select('id, slug')
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

    // Build update object (only include defined fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.tagline !== undefined) updateData.tagline = body.tagline
    if (body.description !== undefined) updateData.description = body.description
    if (body.contact_email !== undefined) updateData.contact_email = body.contact_email
    if (body.contact_phone !== undefined) updateData.contact_phone = body.contact_phone
    if (body.whatsapp_number !== undefined) updateData.whatsapp_number = body.whatsapp_number
    if (body.instagram_handle !== undefined) updateData.instagram_handle = body.instagram_handle
    if (body.brand_colors !== undefined) updateData.brand_colors = body.brand_colors
    if (body.settings !== undefined) updateData.settings = body.settings
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url

    // Update store
    const { data: store, error: updateError } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', existingStore.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating store:', updateError)
      return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
    }

    // Revalidate storefront pages so changes appear immediately
    try {
      revalidatePath(`/${existingStore.slug}`)
      revalidatePath(`/${existingStore.slug}/about`)
      revalidatePath(`/${existingStore.slug}/products`)
      revalidatePath(`/${existingStore.slug}/contact`)
    } catch (revalidateError) {
      console.warn('Revalidation failed (non-blocking):', revalidateError)
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
