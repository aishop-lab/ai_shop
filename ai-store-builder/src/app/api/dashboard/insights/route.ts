// src/app/api/dashboard/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  // Fetch in parallel: recent insights, pending approvals, recent activity
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [insightsRes, approvalsRes, activityRes, agentStatesRes] = await Promise.all([
    // Recent insight-type actions (anomalies, recommendations, reports)
    admin
      .from('agent_actions')
      .select('id, agent_type, action_type, action_category, summary, details, status, created_at')
      .eq('store_id', storeId)
      .in('action_category', ['insight', 'anomaly', 'recommendation', 'report', 'alert'])
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(20),

    // Pending approvals
    admin
      .from('agent_approvals')
      .select('id, agent_type, action_type, summary, reasoning, details, priority, expires_at, created_at')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),

    // Recent agent activity
    admin
      .from('agent_actions')
      .select('id, agent_type, action_type, summary, status, execution_mode, created_at, duration_ms')
      .eq('store_id', storeId)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(30),

    // Agent states for status overview
    admin
      .from('agent_states')
      .select('agent_type, is_enabled, status, last_action_at, total_actions, error_count')
      .eq('store_id', storeId),
  ])

  return NextResponse.json({
    insights: insightsRes.data || [],
    pendingApprovals: approvalsRes.data || [],
    recentActivity: activityRes.data || [],
    agentStates: agentStatesRes.data || [],
  })
}
