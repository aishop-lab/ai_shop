'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AGENT_COLORS } from '@/lib/agents/constants'
import { AGENT_INTROS } from '@/components/platform/onboarding/agent-intro-data'
import type { AgentType } from '@/lib/agents/types'
import type { SubAgentCategory } from '@/lib/agents/sub-agents/types'

// ---- Local type for API response (no server-only imports) ----

interface SubAgentMeta {
  id: string
  codename: string
  chief: AgentType
  role: string
  description: string
  category: SubAgentCategory
  autonomyRules: {
    autonomous: string[]
    needsChiefApproval: string[]
    needsMerchantApproval: string[]
  }
}

// ---- Category badge helpers ----

const CATEGORY_LABELS: Record<SubAgentCategory, string> = {
  'data-only': 'Data',
  'llm-only': 'AI',
  'llm-api': 'AI + API',
  'llm-new-api': 'AI + External',
}

const CATEGORY_STYLES: Record<SubAgentCategory, string> = {
  'data-only': 'bg-zinc-700/60 text-zinc-300 border-zinc-600/40',
  'llm-only': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'llm-api': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'llm-new-api': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

// ---- Sub-agent card ----

interface SubAgentCardProps {
  subAgent: SubAgentMeta
  agentType: AgentType
  storeId: string
}

function SubAgentCard({ subAgent, agentType, storeId }: SubAgentCardProps) {
  const colors = AGENT_COLORS[agentType]
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    if (isRunning) return
    setIsRunning(true)
    try {
      const response = await fetch('/api/agents/sub-agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sub_agent_id: subAgent.id,
          instruction: 'Run standard task',
          store_id: storeId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errMsg = data?.error || 'Execution failed'
        setLastResult(`Error: ${errMsg}`)
        toast.error(`${subAgent.codename} failed`, { description: errMsg })
        return
      }

      const summary =
        typeof data?.output === 'string'
          ? data.output
          : data?.actions?.[0]?.summary ?? 'Task completed'

      setLastResult(summary)
      toast.success(`${subAgent.codename} ran successfully`, { description: summary })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setLastResult(`Error: ${msg}`)
      toast.error(`${subAgent.codename} failed`, { description: msg })
    } finally {
      setIsRunning(false)
    }
  }, [isRunning, subAgent, storeId])

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-3 transition-colors hover:border-[var(--platform-border-hover)]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn('font-mono text-xs font-bold leading-tight', colors.text)}>
            {subAgent.codename}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--platform-text-muted)] truncate">
            {subAgent.role}
          </p>
        </div>
        {/* Category badge */}
        <span
          className={cn(
            'flex-shrink-0 rounded-full border px-1.5 py-px font-mono text-[9px] leading-tight',
            CATEGORY_STYLES[subAgent.category]
          )}
        >
          {CATEGORY_LABELS[subAgent.category]}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed text-[var(--platform-text-secondary)] line-clamp-2">
        {subAgent.description}
      </p>

      {/* Last action */}
      <p className="font-mono text-[10px] text-[var(--platform-text-muted)] truncate">
        {lastResult ?? 'No actions yet'}
      </p>

      {/* Run button */}
      <button
        type="button"
        onClick={handleRun}
        disabled={isRunning}
        aria-label={`Run ${subAgent.codename}`}
        className={cn(
          'mt-auto flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-medium transition-colors',
          'border-[var(--platform-border)] text-[var(--platform-text-muted)]',
          'hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-secondary)]',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {isRunning ? (
          <>
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Running…
          </>
        ) : (
          'Run'
        )}
      </button>
    </div>
  )
}

// ---- Main component ----

interface SubAgentGridProps {
  agentType: AgentType
  storeId: string
}

export function SubAgentGrid({ agentType, storeId }: SubAgentGridProps) {
  const colors = AGENT_COLORS[agentType]
  const chiefCodename = AGENT_INTROS[agentType]?.codename ?? agentType.toUpperCase()

  const [subAgents, setSubAgents] = useState<SubAgentMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`/api/agents/sub-agents?chief=${agentType}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || `Request failed: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setSubAgents(data.sub_agents ?? [])
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load sub-agents')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [agentType])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-3 w-3 animate-spin text-[var(--platform-text-muted)]" />
        <span className="text-xs text-[var(--platform-text-muted)]">Loading sub-agents…</span>
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-xs text-[var(--platform-status-error)] py-4">
        Failed to load sub-agents: {error}
      </p>
    )
  }

  if (subAgents.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Sub-Agents
        </h2>
        <span
          className={cn(
            'rounded-full border px-1.5 py-px font-mono text-[9px]',
            colors.border,
            colors.text
          )}
        >
          {subAgents.length} specialists
        </span>
        <span className="text-[10px] text-[var(--platform-text-muted)] opacity-60">
          reporting to {chiefCodename}
        </span>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {subAgents.map((subAgent) => (
          <SubAgentCard
            key={subAgent.id}
            subAgent={subAgent}
            agentType={agentType}
            storeId={storeId}
          />
        ))}
      </div>
    </div>
  )
}
