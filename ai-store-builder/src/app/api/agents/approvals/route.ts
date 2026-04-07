// src/app/api/agents/approvals/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateStoreRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

/**
 * GET /api/agents/approvals?storeId=xxx&status=pending&agentType=sales
 * Returns approvals for a store, defaulting to pending status.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')

  if (!storeId) {
    return jsonError('storeId query parameter is required', 400)
  }

  const authResult = await authenticateStoreRequest(req, storeId)
  if (authResult instanceof Response) return authResult

  const status = url.searchParams.get('status') || 'pending'
  const agentType = url.searchParams.get('agentType')
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))

  const admin = getSupabaseAdmin()

  let query = admin
    .from('agent_approvals')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agentType) {
    query = query.eq('agent_type', agentType)
  }

  const { data: approvals, count, error } = await query

  if (error) {
    console.error('[Agents API] Failed to fetch approvals:', error)
    return jsonError('Failed to fetch approvals', 500)
  }

  return jsonSuccess({
    approvals: approvals || [],
    total: count || 0,
  })
}

/**
 * POST /api/agents/approvals
 * Batch approve or reject multiple approvals.
 * Body: { storeId: string, ids: string[], action: 'approve' | 'reject', reason?: string }
 */
export async function POST(req: NextRequest) {
  let body: {
    storeId: string
    ids: string[]
    action: 'approve' | 'reject'
    reason?: string
  }

  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.storeId || !body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return jsonError('storeId and ids[] are required', 400)
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return jsonError('action must be "approve" or "reject"', 400)
  }

  const authResult = await authenticateStoreRequest(req, body.storeId)
  if (authResult instanceof Response) return authResult
  const { user } = authResult

  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()

  const newStatus = body.action === 'approve' ? 'approved' : 'rejected'
  const update: Record<string, unknown> = {
    status: newStatus,
    resolved_by: user.id,
    resolved_at: now,
    updated_at: now,
  }

  if (body.action === 'reject' && body.reason) {
    update.rejection_reason = body.reason
  }

  const { data: updated, error } = await admin
    .from('agent_approvals')
    .update(update)
    .eq('store_id', body.storeId)
    .eq('status', 'pending')
    .in('id', body.ids)
    .select('id, status')

  if (error) {
    console.error('[Agents API] Failed to batch update approvals:', error)
    return jsonError('Failed to update approvals', 500)
  }

  // Also update the corresponding agent_actions rows
  if (updated && updated.length > 0) {
    const actionStatus = body.action === 'approve' ? 'approved' : 'rejected'
    await admin
      .from('agent_actions')
      .update({ status: actionStatus, completed_at: now })
      .eq('store_id', body.storeId)
      .eq('status', 'pending_approval')
      .in(
        'approval_id',
        updated.map((a) => a.id)
      )

    // --- Memory auto-learning from approval/rejection patterns ---
    // When a merchant rejects (or approves) an action, store it as agent memory
    // so the agent can learn from the pattern and avoid repeating rejected actions.
    try {
      // Fetch the full approval details to learn from
      const { data: approvalDetails } = await admin
        .from('agent_approvals')
        .select('id, agent_type, sub_agent_type, action_type, summary, details, tool_name')
        .in('id', updated.map((a) => a.id))

      if (approvalDetails && approvalDetails.length > 0) {
        const memories = approvalDetails.map((approval) => {
          const memoryKey = `${body.action}_pattern:${approval.action_type}:${Date.now()}`
          const memoryValue: Record<string, unknown> = {
            action: body.action,
            action_type: approval.action_type,
            sub_agent_type: approval.sub_agent_type,
            tool_name: approval.tool_name,
            summary: approval.summary,
          }

          if (body.action === 'reject' && body.reason) {
            memoryValue.rejection_reason = body.reason
            memoryValue.lesson = `Merchant rejected "${approval.action_type}" — reason: ${body.reason}. Avoid similar actions unless conditions change.`
          } else if (body.action === 'approve') {
            memoryValue.lesson = `Merchant approved "${approval.action_type}" — this type of action is acceptable.`
          }

          return {
            store_id: body.storeId,
            agent_type: approval.agent_type,
            memory_key: memoryKey,
            memory_value: memoryValue,
            memory_type: 'feedback',
            source: 'approval_pattern',
            confidence: body.action === 'reject' ? 0.9 : 0.7,
          }
        })

        if (memories.length > 0) {
          await admin.from('agent_memory').insert(memories)
        }
      }
    } catch (memError) {
      // Non-critical — don't fail the approval if memory logging fails
      console.warn('[Agents API] Failed to store approval memory:', memError)
    }
  }

  return jsonSuccess({
    updated: updated?.length || 0,
    ids: updated?.map((a) => a.id) || [],
  })
}
