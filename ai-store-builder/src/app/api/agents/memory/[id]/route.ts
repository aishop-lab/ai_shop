// src/app/api/agents/memory/[id]/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, isAuthError } from '@/lib/agents/api-auth'

export const runtime = 'nodejs'

/**
 * DELETE /api/agents/memory/[id]
 * Deletes a specific memory, verifying store ownership.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateAgentRequest(req)
  if (isAuthError(authResult)) {
    return Response.json({ error: authResult.error }, { status: authResult.status })
  }

  const { storeId } = authResult
  const { id } = await params

  if (!id) {
    return Response.json({ error: 'Memory ID is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Verify memory belongs to the user's store before deleting
  const { data: memory, error: fetchError } = await admin
    .from('agent_memory')
    .select('id, store_id')
    .eq('id', id)
    .single()

  if (fetchError || !memory) {
    return Response.json({ error: 'Memory not found' }, { status: 404 })
  }

  if (memory.store_id !== storeId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { error: deleteError } = await admin
    .from('agent_memory')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[Agents Memory API] Failed to delete memory:', deleteError)
    return Response.json({ error: 'Failed to delete memory' }, { status: 500 })
  }

  return Response.json({ success: true })
}
