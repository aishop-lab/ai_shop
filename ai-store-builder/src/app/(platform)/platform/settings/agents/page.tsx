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

interface ConfigOption {
  label: string
  value: string
  options?: string[] // dropdown options
}

const AGENT_CONFIG_HINTS: Record<AgentType, ConfigOption[]> = {
  support: [
    { label: 'Response tone', value: 'Friendly & professional', options: ['Friendly & professional', 'Formal & polished', 'Casual & warm', 'Concise & direct'] },
    { label: 'Escalation threshold', value: '3 failed attempts', options: ['2 failed attempts', '3 failed attempts', '5 failed attempts', 'Never auto-escalate'] },
  ],
  sales: [
    { label: 'Max discount %', value: '20%', options: ['5%', '10%', '15%', '20%', '25%', '30%'] },
    { label: 'Recovery email delay', value: '1 hour', options: ['30 minutes', '1 hour', '3 hours', '6 hours', '24 hours'] },
  ],
  analytics: [
    { label: 'Report frequency', value: 'Weekly', options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'] },
    { label: 'Anomaly sensitivity', value: 'Medium', options: ['Low', 'Medium', 'High', 'Critical only'] },
  ],
  technical: [
    { label: 'Auto-fix threshold', value: 'Minor issues only', options: ['Minor issues only', 'Minor + moderate', 'All issues', 'Never auto-fix'] },
    { label: 'SEO audit schedule', value: 'Every Monday', options: ['Daily', 'Every Monday', 'Every 1st of month', 'Manual only'] },
  ],
  marketing: [
    { label: 'Budget limit', value: '$500 / month', options: ['$100 / month', '$250 / month', '$500 / month', '$1000 / month', '$2500 / month', 'No limit'] },
    { label: 'Platform preference', value: 'Meta + Google', options: ['Meta + Google', 'Meta (Facebook + Instagram)', 'Google Ads only', 'Instagram only', 'All platforms'] },
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
  onConfigChange,
  saving,
}: {
  agentType: AgentType
  settings: AgentSettings
  onToggle: () => void
  onAutonomyChange: (level: AutonomyLevel) => void
  onConfigChange?: (label: string, value: string) => void
  saving?: boolean
}) {
  const hints = AGENT_CONFIG_HINTS[agentType]
  const currentLevel = AUTONOMY_LEVELS[settings.autonomy]

  return (
    <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-5">
      {/* Agent header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <AgentBadge agentType={agentType} size="md" />
          </div>
          <p className="text-sm text-[var(--platform-text-muted)]">
            {AGENT_DESCRIPTIONS[agentType]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="font-mono text-xs text-[var(--platform-text-muted)]">Saving...</span>
          )}
        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label={`${AGENT_DISPLAY_NAMES[agentType]} enabled`}
          onClick={onToggle}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-accent)]',
            settings.enabled ? 'bg-[var(--platform-accent)]' : 'bg-[var(--platform-border)]'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              settings.enabled ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
        </div>
      </div>

      {/* Autonomy selector — always editable */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Autonomy Level
        </p>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5] as AutonomyLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onAutonomyChange(level)}
              aria-label={`Level ${level}: ${AUTONOMY_LEVELS[level].label}`}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-sm font-medium transition-colors',
                settings.autonomy === level
                  ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)]/10 text-[var(--platform-accent)]'
                  : 'border-[var(--platform-border)] text-[var(--platform-text-muted)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-secondary)]'
              )}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="text-sm text-[var(--platform-text-secondary)]">
          <span className="font-medium text-[var(--platform-text-primary)]">
            {currentLevel.label}
          </span>
          {' — '}
          {currentLevel.description}
        </p>

        {/* All levels reference */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)] transition-colors">
            View all levels
          </summary>
          <div className="mt-2 space-y-1 rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2">
            {([1, 2, 3, 4, 5] as AutonomyLevel[]).map((level) => (
              <p key={level} className={cn(
                'text-xs leading-relaxed',
                settings.autonomy === level ? 'text-[var(--platform-text-primary)]' : 'text-[var(--platform-text-muted)]'
              )}>
                <span className="font-mono font-medium">{level}.</span>{' '}
                <span className="font-medium">{AUTONOMY_LEVELS[level].label}:</span>{' '}
                {AUTONOMY_LEVELS[level].description}
              </p>
            ))}
          </div>
        </details>
      </div>

      {/* Configuration — editable dropdowns */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Configuration
        </p>
        <div className="space-y-2">
          {hints.map((hint) => (
            <div
              key={hint.label}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2.5"
            >
              <span className="min-w-0 text-sm text-[var(--platform-text-secondary)]">{hint.label}</span>
              {hint.options ? (
                <select
                  defaultValue={hint.value}
                  onChange={(e) => onConfigChange?.(hint.label, e.target.value)}
                  className="rounded border border-[var(--platform-border)] bg-[var(--platform-surface)] px-2 py-1 font-mono text-xs text-[var(--platform-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)] cursor-pointer"
                >
                  {hint.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <span className="font-mono text-sm text-[var(--platform-text-muted)]">
                  {hint.value}
                </span>
              )}
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
          if (data.store?.id) setStoreId(data.store.id)
        }
      } catch {
        console.error('[AgentConfig] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  const { agents, isLoading, refetch } = useAgentStates(storeId)
  const { updateAgent } = useUpdateAgentState()
  const [initializing, setInitializing] = useState(false)

  // Auto-initialize agent_states if they don't exist yet
  useEffect(() => {
    if (!storeId || isLoading || agents.length > 0 || initializing) return
    setInitializing(true)
    fetch('/api/agents/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.initialized) refetch()
      })
      .catch(() => {
        setSaveMessage('Failed to initialize agents — please refresh')
      })
      .finally(() => setInitializing(false))
  }, [storeId, isLoading, agents.length, initializing, refetch])

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

  if ((isLoading || initializing) && agents.length === 0) {
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
          <h1 className="font-mono text-xl font-semibold text-[var(--platform-text-primary)]">
            Agent Configuration
          </h1>
          <p className="text-base text-[var(--platform-text-secondary)]">
            {initializing ? 'Initializing agents...' : 'Loading agent settings...'}
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
        <h1 className="font-mono text-xl font-semibold text-[var(--platform-text-primary)]">
          Agent Configuration
        </h1>
        <p className="text-base text-[var(--platform-text-secondary)]">
          Configure autonomy levels and behavior for each agent
        </p>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {AGENT_TYPES.map((agentType) => (
          <AgentConfigCard
            key={agentType}
            agentType={agentType}
            settings={agentSettings[agentType]}
            onToggle={() => handleToggle(agentType)}
            onAutonomyChange={(level) => handleAutonomyChange(agentType, level)}
            onConfigChange={(label, value) => {
              // Config changes saved to agent config JSON
              const agentState = agents.find((a) => a.agent_type === agentType)
              if (agentState && storeId) {
                const updatedConfig = { ...(agentState.config || {}), [label]: value }
                updateAgent(storeId, agentType, { config: updatedConfig })
                showToast(`${AGENT_DISPLAY_NAMES[agentType]}: ${label} updated`)
              }
            }}
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
