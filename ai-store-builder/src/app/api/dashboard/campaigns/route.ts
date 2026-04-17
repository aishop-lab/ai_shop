import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/dashboard/campaigns — List campaigns with optional status filter
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
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 })
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

    const admin = getSupabaseAdmin()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = admin
      .from('marketing_campaigns')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: campaigns, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Campaigns fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    // Get status counts for tabs
    const statusCounts = { all: 0, draft: 0, scheduled: 0, sending: 0, sent: 0, paused: 0, cancelled: 0 }
    const { data: countData } = await admin
      .from('marketing_campaigns')
      .select('status')
      .eq('store_id', storeId)

    if (countData) {
      statusCounts.all = countData.length
      for (const row of countData) {
        const s = row.status as keyof typeof statusCounts
        if (s in statusCounts) {
          statusCounts[s]++
        }
      }
    }

    return NextResponse.json({
      campaigns: campaigns || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      statusCounts,
    })
  } catch (error) {
    console.error('Campaigns list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/dashboard/campaigns — Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, name, channel, segment_filters, template_name, subject, content, scheduled_at } = body

    if (!store_id || !name || !channel) {
      return NextResponse.json({ error: 'store_id, name, and channel are required' }, { status: 400 })
    }

    if (!['whatsapp', 'email'].includes(channel)) {
      return NextResponse.json({ error: 'channel must be whatsapp or email' }, { status: 400 })
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found or access denied' }, { status: 403 })
    }

    const admin = getSupabaseAdmin()

    const status = scheduled_at ? 'scheduled' : 'draft'

    const { data: campaign, error } = await admin
      .from('marketing_campaigns')
      .insert({
        store_id,
        name,
        channel,
        status,
        segment_filters: segment_filters || {},
        template_name: template_name || null,
        subject: subject || null,
        content: content || {},
        scheduled_at: scheduled_at || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Campaign create error:', error)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Campaign create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
