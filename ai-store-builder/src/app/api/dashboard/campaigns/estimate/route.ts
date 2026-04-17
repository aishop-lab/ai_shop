import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAudienceEstimate } from '@/lib/campaigns/send-campaign'

/**
 * GET /api/dashboard/campaigns/estimate — Get audience size estimate
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('store_id')
    const channel = searchParams.get('channel') as 'whatsapp' | 'email'
    const segment = searchParams.get('segment') || 'all'

    if (!storeId || !channel) {
      return NextResponse.json({ error: 'store_id and channel are required' }, { status: 400 })
    }

    if (!['whatsapp', 'email'].includes(channel)) {
      return NextResponse.json({ error: 'channel must be whatsapp or email' }, { status: 400 })
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
    }

    const estimate = await getAudienceEstimate(storeId, channel, {
      segment: segment as 'all' | 'active' | 'at_risk' | 'churned' | 'new',
    })

    return NextResponse.json({ estimate })
  } catch (error) {
    console.error('Audience estimate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
