// src/app/api/agents/approvals/[id]/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/agents/approvals/[id]
 * Approve or reject a single approval.
 * Body: { action: 'approve' | 'reject', reason?: string, modifications?: Record<string, unknown> }
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const auth = await authenticateRequest(req)
  if (!auth.user) {
    return jsonError(auth.error || 'Unauthorized', auth.status)
  }

  let body: {
    action: 'approve' | 'reject'
    reason?: string
    modifications?: Record<string, unknown>
  }

  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return jsonError('action must be "approve" or "reject"', 400)
  }

  const admin = getSupabaseAdmin()

  // Fetch approval and verify ownership
  const { data: approval, error: fetchError } = await admin
    .from('agent_approvals')
    .select('id, store_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !approval) {
    return jsonError('Approval not found', 404)
  }

  // Verify user owns this store
  const { data: store } = await admin
    .from('stores')
    .select('id')
    .eq('id', approval.store_id)
    .eq('owner_id', auth.user.id)
    .single()

  if (!store) {
    return jsonError('Unauthorized', 403)
  }

  if (approval.status !== 'pending') {
    return jsonError(`Approval already ${approval.status}`, 400)
  }

  const now = new Date().toISOString()
  const newStatus = body.action === 'approve' ? 'approved' : 'rejected'

  const update: Record<string, unknown> = {
    status: newStatus,
    resolved_by: auth.user.id,
    resolved_at: now,
    updated_at: now,
  }

  if (body.action === 'reject' && body.reason) {
    update.rejection_reason = body.reason
  }
  if (body.action === 'approve' && body.modifications) {
    update.modifications = body.modifications
  }

  const { data: updated, error: updateError } = await admin
    .from('agent_approvals')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError) {
    console.error('[Agents API] Failed to update approval:', updateError)
    return jsonError('Failed to update approval', 500)
  }

  // Update the corresponding agent_action
  const actionStatus = body.action === 'approve' ? 'approved' : 'rejected'
  await admin
    .from('agent_actions')
    .update({ status: actionStatus, completed_at: now })
    .eq('approval_id', id)
    .eq('status', 'pending_approval')

  // If approved, update the agent status back to idle (from waiting_approval)
  if (body.action === 'approve') {
    await admin
      .from('agent_states')
      .update({ status: 'idle', updated_at: now })
      .eq('store_id', approval.store_id)
      .eq('status', 'waiting_approval')
  }

  return jsonSuccess(updated)
}
