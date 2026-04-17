// src/app/api/dashboard/approvals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, rejection_reason, modifications } = body

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Fetch the approval and verify store ownership
  const { data: approval } = await admin
    .from('agent_approvals')
    .select('id, store_id, status')
    .eq('id', id)
    .single()

  if (!approval) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  }

  // Verify ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', approval.store_id)
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (approval.status !== 'pending') {
    return NextResponse.json({ error: 'Approval already resolved' }, { status: 409 })
  }

  const updateData: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (action === 'reject' && rejection_reason) {
    updateData.rejection_reason = rejection_reason
  }

  if (action === 'approve' && modifications) {
    updateData.modifications = modifications
  }

  const { error } = await admin
    .from('agent_approvals')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: updateData.status })
}
