'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgentApproval } from '@/lib/agents/types'

const PRIORITY_ORDER: Record<AgentApproval['priority'], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
}

function sortByPriorityThenCreatedAt(a: AgentApproval, b: AgentApproval): number {
  const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  if (priorityDiff !== 0) return priorityDiff
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

// Hook to get pending approvals with real-time updates + approve/reject actions
export function useApprovals(storeId: string | null) {
  const [approvals, setApprovals] = useState<AgentApproval[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApprovals = useCallback(async () => {
    if (!storeId) {
      setApprovals([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('agent_approvals')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      const sorted = ((data as AgentApproval[]) ?? []).sort(sortByPriorityThenCreatedAt)
      setApprovals(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals')
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    if (!storeId) {
      setApprovals([])
      setIsLoading(false)
      return
    }

    fetchApprovals()

    const supabase = createClient()
    const channel = supabase
      .channel(`approvals-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_approvals',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as AgentApproval
            if (incoming.status === 'pending') {
              setApprovals((prev) => [...prev, incoming].sort(sortByPriorityThenCreatedAt))
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AgentApproval
            if (updated.status === 'pending') {
              setApprovals((prev) =>
                prev
                  .map((a) => (a.id === updated.id ? updated : a))
                  .sort(sortByPriorityThenCreatedAt)
              )
            } else {
              // No longer pending — remove from list
              setApprovals((prev) => prev.filter((a) => a.id !== updated.id))
            }
          } else if (payload.eventType === 'DELETE') {
            setApprovals((prev) => prev.filter((a) => a.id !== (payload.old as { id: string }).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, fetchApprovals])

  const approveAction = useCallback(
    async (id: string, modifications?: Record<string, unknown>): Promise<boolean> => {
      try {
        const supabase = createClient()
        const { error: updateError } = await supabase
          .from('agent_approvals')
          .update({
            status: 'approved',
            resolved_at: new Date().toISOString(),
            ...(modifications ? { modifications } : {}),
          })
          .eq('id', id)
          .eq('status', 'pending')

        if (updateError) throw updateError
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to approve action')
        return false
      }
    },
    []
  )

  const rejectAction = useCallback(
    async (id: string, reason?: string): Promise<boolean> => {
      try {
        const supabase = createClient()
        const { error: updateError } = await supabase
          .from('agent_approvals')
          .update({
            status: 'rejected',
            resolved_at: new Date().toISOString(),
            ...(reason ? { rejection_reason: reason } : {}),
          })
          .eq('id', id)
          .eq('status', 'pending')

        if (updateError) throw updateError
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject action')
        return false
      }
    },
    []
  )

  return { approvals, isLoading, error, approveAction, rejectAction, refetch: fetchApprovals }
}
