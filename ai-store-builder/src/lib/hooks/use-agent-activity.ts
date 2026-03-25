'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { AgentAction } from '@/lib/agents/types'

const AGENT_CODENAMES: Record<string, string> = {
  marketing: 'MARKETING',
  sales: 'SALES',
  support: 'SUPPORT',
  analytics: 'ANALYTICS',
  technical: 'TECHNICAL',
}

interface UseAgentActivityOptions {
  limit?: number
  showToasts?: boolean
}

// Hook to get real-time agent activity (actions) for a store.
// Subscribes to INSERT events on agent_actions table.
// Returns the latest N actions, auto-updating when new ones arrive.
export function useAgentActivity(
  storeId: string | null,
  options: UseAgentActivityOptions = {}
) {
  const { limit = 20, showToasts = false } = options

  const [actions, setActions] = useState<AgentAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const { data, error: fetchError } = await supabase
        .from('agent_actions')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      setActions((data as AgentAction[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent activity')
    } finally {
      setIsLoading(false)
    }
  }, [storeId, limit])

  useEffect(() => {
    if (!storeId) {
      setActions([])
      setIsLoading(false)
      return
    }

    fetchActions()

    const supabase = createClient()
    const channel = supabase
      .channel(`agent-activity-${storeId}`)
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

          // Prepend to list and keep max `limit` items
          setActions((prev) => [newAction, ...prev].slice(0, limit))

          // Show toast notification when a completed action arrives
          if (showToasts && newAction.status === 'completed') {
            const codename = AGENT_CODENAMES[newAction.agent_type] ?? newAction.agent_type.toUpperCase()
            toast(`🤖 ${codename} completed: ${newAction.summary}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, limit, showToasts, fetchActions])

  return { actions, isLoading, error, refetch: fetchActions }
}
