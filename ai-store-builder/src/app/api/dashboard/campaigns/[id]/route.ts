import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/dashboard/campaigns/[id] — Campaign detail with messages
 */
export async function GET(
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

    // Load campaign
    const { data: campaign, error: campaignError } = await admin
      .from('marketing_campaigns')
      .select('*')
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

    // Load campaign messages with pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: messages, count: messageCount } = await admin
      .from('campaign_messages')
      .select('*', { count: 'exact' })
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .range(from, to)

    return NextResponse.json({
      campaign,
      messages: messages || [],
      messageCount: messageCount || 0,
      messagePage: page,
      messageTotalPages: Math.ceil((messageCount || 0) / limit),
    })
  } catch (error) {
    console.error('Campaign detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/dashboard/campaigns/[id] — Delete a campaign
 */
export async function DELETE(
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

    // Don't allow deleting a campaign that's currently sending
    if (campaign.status === 'sending') {
      return NextResponse.json({ error: 'Cannot delete a campaign that is currently sending' }, { status: 400 })
    }

    // Delete campaign (cascade deletes campaign_messages)
    const { error: deleteError } = await admin
      .from('marketing_campaigns')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Campaign delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Campaign delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
