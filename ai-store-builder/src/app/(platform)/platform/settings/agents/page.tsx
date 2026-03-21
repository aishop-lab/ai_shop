// src/app/(platform)/platform/settings/agents/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { useAgentStates, useUpdateAgentState } from '@/lib/hooks/use-agents'
import {
  AGENT_TYPES,
  AGENT_DISPLAY_NAMES,
  AGENT_DESCRIPTIONS,
  AUTONOMY_LEVELS,
  DEFAULT_AUTONOMY_LEVEL,
} from '@/lib/agents/constants'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'

interface AgentConfigHints {
  label: string
  value: string
}

const AGENT_CONFIG_HINTS: Record<AgentType, AgentConfigHints[]> = {
  support: [
    { label: 'Response tone', value: 'Friendly & professional' },
    { label: 'Escalation threshold', value: '3 failed attempts' },
  ],
  sales: [
    { label: 'Max discount %', value: '20%' },
    { label: 'Recovery email delay', value: '1 hour' },
  ],
  analytics: [
    { label: 'Report frequency', value: 'Weekly' },
    { label: 'Anomaly sensitivity', value: 'Medium' },
  ],
  technical: [
    { label: 'Auto-fix threshold', value: 'Minor issues only' },
    { label: 'SEO audit schedule', value: 'Every Monday' },
  ],
  marketing: [
    { label: 'Budget limit', value: '$500 / month' },
    { label: 'Platform preference', value: 'Meta + Google' },
  ],
}

type AgentSettings = {
  enabled: boolean
  autonomy: AutonomyLevel
}

function AgentConfigCard({
  agentType,
  settings,
  onToggle,
  onAutonomyChange,
  saving,
}: {
  agentType: AgentType
  settings: AgentSettings
  onToggle: () => void
  onAutonomyChange: (level: AutonomyLevel) => void
  saving?: boolean
}) {
  const hints = AGENT_CONFIG_HINTS[agentType]
  const currentLevel = AUTONOMY_LEVELS[settings.autonomy]

  return (
    <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-5">
      {/* Agent header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AgentBadge agentType={agentType} size="md" />
          </div>
          <p className="text-xs text-[var(--platform-text-muted)]">
            {AGENT_DESCRIPTIONS[agentType]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">Saving...</span>
          )}
        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label={`${AGENT_DISPLAY_NAMES[agentType]} enabled`}
          onClick={onToggle}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-accent)]',
            settings.enabled ? 'bg-[var(--platform-accent)]' : 'bg-[var(--platform-border)]'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              settings.enabled ? 'translate-x-4' : 'translate-x-0'
            )}
          />
        </button>
        </div>
      </div>

      {/* Autonomy selector */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Autonomy Level
        </p>
        <div className="flex gap-1.5">
          {([1, 2, 3, 4, 5] as AutonomyLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onAutonomyChange(level)}
              disabled={!settings.enabled}
              aria-label={`Level ${level}: ${AUTONOMY_LEVELS[level].label}`}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded border font-mono text-xs font-medium transition-colors',
                settings.enabled
                  ? settings.autonomy === level
                    ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)]/10 text-[var(--platform-accent)]'
                    : 'border-[var(--platform-border)] text-[var(--platform-text-muted)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-secondary)]'
                  : 'border-[var(--platform-border)] text-[var(--platform-text-muted)] opacity-40 cursor-not-allowed'
              )}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--platform-text-secondary)]">
          <span className="font-medium text-[var(--platform-text-primary)]">
            {currentLevel.label}
          </span>
          {' — '}
          {currentLevel.description}
        </p>
      </div>

      {/* Config hints */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Configuration
        </p>
        <div className="space-y-1.5">
          {hints.map((hint) => (
            <div
              key={hint.label}
              className="flex items-center justify-between rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2"
            >
              <span className="text-xs text-[var(--platform-text-secondary)]">{hint.label}</span>
              <span className="font-mono text-xs text-[var(--platform-text-muted)]">
                {hint.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AgentConfigPage() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [savingAgents, setSavingAgents] = useState<Set<AgentType>>(new Set())
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Fetch the merchant's store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.storeId) setStoreId(data.storeId)
        }
      } catch {
        console.error('[AgentConfig] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  const { agents, isLoading } = useAgentStates(storeId)
  const { updateAgent } = useUpdateAgentState()

  // Build settings from real agent states
  const agentSettings: Record<AgentType, AgentSettings> = Object.fromEntries(
    AGENT_TYPES.map((type) => {
      const agentState = agents.find((a) => a.agent_type === type)
      return [
        type,
        {
          enabled: agentState?.is_enabled ?? true,
          autonomy: agentState?.autonomy_level ?? DEFAULT_AUTONOMY_LEVEL,
        },
      ]
    })
  ) as Record<AgentType, AgentSettings>

  const showToast = useCallback((msg: string) => {
    setSaveMessage(msg)
    setTimeout(() => setSaveMessage(null), 2000)
  }, [])

  const handleToggle = useCallback(async (agentType: AgentType) => {
    if (!storeId) return
    const agentState = agents.find((a) => a.agent_type === agentType)
    if (!agentState) return

    setSavingAgents((prev) => new Set(prev).add(agentType))
    const result = await updateAgent(storeId, agentType, { is_enabled: !agentState.is_enabled })
    setSavingAgents((prev) => { const next = new Set(prev); next.delete(agentType); return next })

    if (result) {
      showToast(`${AGENT_DISPLAY_NAMES[agentType]} ${result.is_enabled ? 'enabled' : 'disabled'}`)
    } else {
      showToast('Failed to update — please try again')
    }
  }, [storeId, agents, updateAgent, showToast])

  const handleAutonomyChange = useCallback(async (agentType: AgentType, level: AutonomyLevel) => {
    if (!storeId) return
    const agentState = agents.find((a) => a.agent_type === agentType)
    if (!agentState) return

    setSavingAgents((prev) => new Set(prev).add(agentType))
    const result = await updateAgent(storeId, agentType, { autonomy_level: level })
    setSavingAgents((prev) => { const next = new Set(prev); next.delete(agentType); return next })

    if (result) {
      showToast(`${AGENT_DISPLAY_NAMES[agentType]} autonomy set to level ${level}`)
    } else {
      showToast('Failed to update — please try again')
    }
  }, [storeId, agents, updateAgent, showToast])

  if (isLoading && agents.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-1">
          <Link
            href="/platform/settings"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
          >
            <ArrowLeft className="h-3 w-3" />
            Settings
          </Link>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Agent Configuration
          </h1>
          <p className="text-sm text-[var(--platform-text-secondary)]">
            Loading agent settings...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/platform/settings"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Settings
        </Link>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Agent Configuration
        </h1>
        <p className="text-sm text-[var(--platform-text-secondary)]">
          Configure autonomy levels and behavior for each agent
        </p>
      </div>

      {/* Agent cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {AGENT_TYPES.map((agentType) => (
          <AgentConfigCard
            key={agentType}
            agentType={agentType}
            settings={agentSettings[agentType]}
            onToggle={() => handleToggle(agentType)}
            onAutonomyChange={(level) => handleAutonomyChange(agentType, level)}
            saving={savingAgents.has(agentType)}
          />
        ))}
      </div>

      {/* Toast notification */}
      {saveMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2 shadow-lg">
          <p className="font-mono text-xs text-[var(--platform-text-primary)]">{saveMessage}</p>
        </div>
      )}
    </div>
  )
}
