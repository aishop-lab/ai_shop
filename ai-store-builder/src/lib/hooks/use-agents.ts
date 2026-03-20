'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgentType, AgentState, AutonomyLevel, AgentConfig } from '@/lib/agents/types'

// Hook to get all agent states for a store, with real-time updates
export function useAgentStates(storeId: string | null) {
  const [agents, setAgents] = useState<AgentState[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    if (!storeId) {
      setAgents([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('agent_states')
        .select('*')
        .eq('store_id', storeId)
        .order('agent_type')

      if (fetchError) throw fetchError
      setAgents((data as AgentState[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent states')
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    if (!storeId) {
      setAgents([])
      setIsLoading(false)
      return
    }

    fetchAgents()

    const supabase = createClient()
    const channel = supabase
      .channel(`agent-states-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_states',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAgents((prev) => [...prev, payload.new as AgentState])
          } else if (payload.eventType === 'UPDATE') {
            setAgents((prev) =>
              prev.map((a) => (a.id === (payload.new as AgentState).id ? (payload.new as AgentState) : a))
            )
          } else if (payload.eventType === 'DELETE') {
            setAgents((prev) => prev.filter((a) => a.id !== (payload.old as { id: string }).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, fetchAgents])

  return { agents, isLoading, error, refetch: fetchAgents }
}

// Hook to get a single agent state
export function useAgentState(storeId: string | null, agentType: AgentType) {
  const { agents, isLoading, error, refetch } = useAgentStates(storeId)
  const agent = agents.find((a) => a.agent_type === agentType) ?? null
  return { agent, isLoading, error, refetch }
}

type AgentStateUpdates = Partial<
  Pick<AgentState, 'is_enabled' | 'autonomy_level' | 'config' | 'status'>
> & {
  is_enabled?: boolean
  autonomy_level?: AutonomyLevel
  config?: AgentConfig
}

// Hook to update agent config (enable/disable, autonomy level)
export function useUpdateAgentState() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateAgent = useCallback(
    async (storeId: string, agentType: AgentType, updates: AgentStateUpdates): Promise<AgentState | null> => {
      try {
        setIsUpdating(true)
        setError(null)
        const supabase = createClient()
        const { data, error: updateError } = await supabase
          .from('agent_states')
          .update(updates)
          .eq('store_id', storeId)
          .eq('agent_type', agentType)
          .select()
          .single()

        if (updateError) throw updateError
        return data as AgentState
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update agent state'
        setError(message)
        return null
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { updateAgent, isUpdating, error }
}
