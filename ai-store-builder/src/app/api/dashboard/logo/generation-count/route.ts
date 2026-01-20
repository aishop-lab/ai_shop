import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Verify the user owns this store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, owner_id')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    // Count AI-generated logos in storage (works across onboarding and dashboard)
    // All AI-generated logos have the format: {user.id}/ai-generated-{timestamp}.{ext}
    const { data: files, error: listError } = await supabase.storage
      .from('store-logos')
      .list(user.id, {
        search: 'ai-generated-'
      })

    if (listError) {
      console.error('[Logo Generation Count] List error:', listError)
      // Fall back to 0 if we can't list files
      return NextResponse.json({
        success: true,
        count: 0
      })
    }

    const count = files?.length || 0

    return NextResponse.json({
      success: true,
      count
    })
  } catch (error) {
    console.error('[Logo Generation Count] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get generation count' },
      { status: 500 }
    )
  }
}
