import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { executeCampaign } from '@/lib/campaigns/send-campaign'

/**
 * POST /api/dashboard/campaigns/[id]/send — Execute a campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    // Load campaign to verify ownership
    const { data: campaign, error: campaignError } = await admin
      .from('marketing_campaigns')
      .select('store_id, status')
      .eq('id', id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', campaign.store_id)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify campaign is in a sendable state
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return NextResponse.json(
        { error: `Campaign cannot be sent from status: ${campaign.status}` },
        { status: 400 }
      )
    }

    // Execute campaign
    const result = await executeCampaign(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Campaign execution failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    })
  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
