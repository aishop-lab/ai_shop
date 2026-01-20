import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { completeOnboardingSchema } from '@/lib/validations/onboarding'

export async function POST(request: Request) {
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

    const body = await request.json()
    const validationResult = completeOnboardingSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid store ID' },
        { status: 400 }
      )
    }

    const { store_id } = validationResult.data

    // Verify store belongs to user
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, slug, owner_id, status')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    if (store.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update store status to active
    const { error: updateStoreError } = await supabase
      .from('stores')
      .update({
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('id', store_id)

    if (updateStoreError) {
      console.error('Store activation error:', updateStoreError)
      return NextResponse.json(
        { success: false, error: 'Failed to activate store' },
        { status: 500 }
      )
    }

    // Generate legal policies for the store
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      await fetch(`${baseUrl}/api/onboarding/generate-policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id })
      })
      console.log('[Complete] Legal policies generated for store:', store_id)
    } catch (policyError) {
      console.error('[Complete] Policy generation failed (non-blocking):', policyError)
      // Don't fail the whole request - policies can be regenerated later
    }

    // Update profile - mark onboarding as completed
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_current_step: 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't fail the whole request - store is already active
    }

    // Generate subdomain URL
    const subdomain = `${store.slug}.mystore.in`
    const storeUrl = `https://${subdomain}`

    return NextResponse.json({
      success: true,
      message: 'Store activated successfully!',
      store_id: store_id,
      subdomain: subdomain,
      store_url: storeUrl,
      redirect_url: '/dashboard'
    })
  } catch (error) {
    console.error('Onboarding complete error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
