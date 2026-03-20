'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgentType, AgentAction } from '@/lib/agents/types'

const MAX_FEED_SIZE = 50

// Hook to get activity feed with real-time updates
export function useActivityFeed(
  storeId: string | null,
  filters?: { agentType?: AgentType; limit?: number }
) {
  const [actions, setActions] = useState<AgentAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const limit = filters?.limit ?? 20

  const fetchActions = useCallback(async () => {
    if (!storeId) {
      setActions([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const supabase = createClient()

      let query = supabase
        .from('agent_actions')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (filters?.agentType) {
        query = query.eq('agent_type', filters.agentType)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setActions((data as AgentAction[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity feed')
    } finally {
      setIsLoading(false)
    }
  }, [storeId, filters?.agentType, limit])

  useEffect(() => {
    if (!storeId) {
      setActions([])
      setIsLoading(false)
      return
    }

    fetchActions()

    const supabase = createClient()
    const channel = supabase
      .channel(`activity-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_actions',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const newAction = payload.new as AgentAction

          // If agentType filter is active, skip actions that don't match
          if (filters?.agentType && newAction.agent_type !== filters.agentType) {
            return
          }

          setActions((prev) => {
            const updated = [newAction, ...prev]
            return updated.slice(0, MAX_FEED_SIZE)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, filters?.agentType, limit, fetchActions])

  return { actions, isLoading, error, refetch: fetchActions }
}
