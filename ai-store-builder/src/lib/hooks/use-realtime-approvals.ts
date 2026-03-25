'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgentApproval } from '@/lib/agents/types'

// Hook for real-time pending approval count + new approval notifications.
// Subscribes to INSERT and UPDATE events on agent_approvals table.
export function useRealtimeApprovals(storeId: string | null) {
  const [pendingCount, setPendingCount] = useState(0)
  const [latestApproval, setLatestApproval] = useState<AgentApproval | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPendingCount = useCallback(async () => {
    if (!storeId) {
      setPendingCount(0)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const supabase = createClient()
      const { count, error: fetchError } = await supabase
        .from('agent_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('status', 'pending')

      if (fetchError) throw fetchError
      setPendingCount(count ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending approvals')
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    if (!storeId) {
      setPendingCount(0)
      setIsLoading(false)
      return
    }

    fetchPendingCount()

    const supabase = createClient()
    const channel = supabase
      .channel(`agent-approvals-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_approvals',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const newApproval = payload.new as AgentApproval
          // Only count genuinely new pending approvals
          if (newApproval.status === 'pending') {
            setPendingCount((prev) => prev + 1)
            setLatestApproval(newApproval)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_approvals',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const updatedApproval = payload.new as AgentApproval
          const previousApproval = payload.old as Partial<AgentApproval>

          // Decrement when an approval moves away from pending status
          const wasResolved =
            previousApproval.status === 'pending' &&
            updatedApproval.status !== 'pending'

          if (wasResolved) {
            setPendingCount((prev) => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, fetchPendingCount])

  return { pendingCount, latestApproval, isLoading, error, refetch: fetchPendingCount }
}
