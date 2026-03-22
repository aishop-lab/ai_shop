// src/components/platform/onboarding/agent-setup-checklist.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AGENT_DISPLAY_NAMES,
  AGENT_DESCRIPTIONS,
  AGENT_COLORS,
  AUTONOMY_LEVELS,
  DEFAULT_AUTONOMY_LEVEL,
} from '@/lib/agents/constants'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'
import {
  X,
  Check,
  CreditCard,
  Headphones,
  TrendingUp,
  BarChart3,
  Settings,
  Plug,
  ChevronRight,
} from 'lucide-react'

interface AgentSetupChecklistProps {
  storeId: string
  isOpen: boolean
  onClose: () => void
}

interface ChecklistState {
  paymentsConnected: boolean
  agents: Record<AgentType, { enabled: boolean; autonomy: AutonomyLevel }>
  integrationsConnected: boolean
  dismissed: boolean
}

const AGENT_ICON_MAP: Record<AgentType, typeof Headphones> = {
  support: Headphones,
  sales: TrendingUp,
  analytics: BarChart3,
  technical: Settings,
  marketing: BarChart3, // not shown in checklist but needed for typing
}

const CHECKLIST_AGENTS: AgentType[] = ['support', 'sales', 'analytics', 'technical']

function getStorageKey(storeId: string) {
  return `agent-setup-checklist-${storeId}`
}

function loadState(storeId: string): ChecklistState {
  if (typeof window === 'undefined') return getDefaultState()
  try {
    const stored = localStorage.getItem(getStorageKey(storeId))
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore parse errors
  }
  return getDefaultState()
}

function getDefaultState(): ChecklistState {
  return {
    paymentsConnected: false,
    agents: {
      support: { enabled: false, autonomy: DEFAULT_AUTONOMY_LEVEL },
      sales: { enabled: false, autonomy: DEFAULT_AUTONOMY_LEVEL },
      analytics: { enabled: false, autonomy: DEFAULT_AUTONOMY_LEVEL },
      technical: { enabled: false, autonomy: DEFAULT_AUTONOMY_LEVEL },
      marketing: { enabled: false, autonomy: DEFAULT_AUTONOMY_LEVEL },
    },
    integrationsConnected: false,
    dismissed: false,
  }
}

function getCompletedCount(state: ChecklistState): number {
  let count = 0
  if (state.paymentsConnected) count++
  for (const agent of CHECKLIST_AGENTS) {
    if (state.agents[agent].enabled) count++
  }
  if (state.integrationsConnected) count++
  return count
}

const TOTAL_ITEMS = 6

export function AgentSetupChecklist({ storeId, isOpen, onClose }: AgentSetupChecklistProps) {
  const [state, setState] = useState<ChecklistState>(() => loadState(storeId))

  // Persist state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(storeId), JSON.stringify(state))
    } catch {
      // ignore storage errors
    }
  }, [state, storeId])

  const toggleAgent = useCallback(
    async (agentType: AgentType) => {
      const newEnabled = !state.agents[agentType].enabled
      setState((prev) => ({
        ...prev,
        agents: {
          ...prev.agents,
          [agentType]: { ...prev.agents[agentType], enabled: newEnabled },
        },
      }))

      // Persist to backend
      try {
        await fetch(`/api/agents/${agentType}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_enabled: newEnabled }),
        })
      } catch {
        // Revert on failure
        setState((prev) => ({
          ...prev,
          agents: {
            ...prev.agents,
            [agentType]: { ...prev.agents[agentType], enabled: !newEnabled },
          },
        }))
      }
    },
    [state.agents]
  )

  const setAutonomy = useCallback(
    async (agentType: AgentType, level: AutonomyLevel) => {
      const prevLevel = state.agents[agentType].autonomy
      setState((prev) => ({
        ...prev,
        agents: {
          ...prev.agents,
          [agentType]: { ...prev.agents[agentType], autonomy: level },
        },
      }))

      try {
        await fetch(`/api/agents/${agentType}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ autonomy_level: level }),
        })
      } catch {
        setState((prev) => ({
          ...prev,
          agents: {
            ...prev.agents,
            [agentType]: { ...prev.agents[agentType], autonomy: prevLevel },
          },
        }))
      }
    },
    [state.agents]
  )

  const handleDismiss = useCallback(() => {
    setState((prev) => ({ ...prev, dismissed: true }))
    onClose()
  }, [onClose])

  if (!isOpen) return null

  const completedCount = getCompletedCount(state)
  const progressPercent = Math.round((completedCount / TOTAL_ITEMS) * 100)

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div className="space-y-0.5">
          <h2 className="font-mono text-sm font-semibold text-zinc-100">
            Set Up Your Agents
          </h2>
          <p className="text-xs text-zinc-400">
            {completedCount} of {TOTAL_ITEMS} steps complete
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checklist"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {/* 1. Connect Payments */}
        <ChecklistItem
          completed={state.paymentsConnected}
          title="Connect Payments"
          description="Set up Razorpay or Stripe to accept orders"
          required
          action={
            <Link href="/platform/settings">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              >
                Connect
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
          icon={<CreditCard className="h-4 w-4" />}
          iconColor="text-zinc-400"
        />

        {/* 2-5. Agent toggles */}
        {CHECKLIST_AGENTS.map((agentType) => {
          const colors = AGENT_COLORS[agentType]
          const AgentIcon = AGENT_ICON_MAP[agentType]
          const agentState = state.agents[agentType]

          return (
            <div
              key={agentType}
              className={cn(
                'rounded-lg border bg-zinc-900 p-4 space-y-3 transition-colors',
                agentState.enabled ? colors.border : 'border-zinc-800'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex h-5 w-5 items-center justify-center rounded',
                      agentState.enabled ? colors.bg : 'bg-zinc-800'
                    )}
                  >
                    {agentState.enabled ? (
                      <Check className={cn('h-3 w-3', colors.text)} />
                    ) : (
                      <AgentIcon className="h-3 w-3 text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {AGENT_DISPLAY_NAMES[agentType].replace(' Agent', '')}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {AGENT_DESCRIPTIONS[agentType]}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={agentState.enabled}
                  aria-label={`Toggle ${AGENT_DISPLAY_NAMES[agentType]}`}
                  onClick={() => toggleAgent(agentType)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    agentState.enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                      agentState.enabled ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {/* Autonomy level selector (shown when enabled) */}
              {agentState.enabled && (
                <div className="ml-8 space-y-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    Autonomy Level
                  </p>
                  <div className="flex gap-1">
                    {([1, 2, 3, 4, 5] as AutonomyLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setAutonomy(agentType, level)}
                        aria-label={`Level ${level}: ${AUTONOMY_LEVELS[level].label}`}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded border font-mono text-xs font-medium transition-colors',
                          agentState.autonomy === level
                            ? `${colors.border} ${colors.bg} ${colors.text}`
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-400'
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    <span className="font-medium text-zinc-400">
                      {AUTONOMY_LEVELS[agentState.autonomy].label}
                    </span>
                    {' — '}
                    {AUTONOMY_LEVELS[agentState.autonomy].description}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* 6. Connect Integrations */}
        <ChecklistItem
          completed={state.integrationsConnected}
          title="Connect Integrations"
          description="Shipping, email, WhatsApp — optional but recommended"
          action={
            <Link href="/platform/settings">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              >
                Browse
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
          icon={<Plug className="h-4 w-4" />}
          iconColor="text-zinc-400"
        />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-5 py-4">
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full text-center text-xs text-zinc-400 transition-colors hover:text-zinc-400"
        >
          I&apos;ll do this later
        </button>
      </div>
    </div>
  )
}

/**
 * Generic checklist item for non-agent steps (payments, integrations)
 */
function ChecklistItem({
  completed,
  title,
  description,
  required,
  action,
  icon,
  iconColor,
}: {
  completed: boolean
  title: string
  description: string
  required?: boolean
  action: React.ReactNode
  icon: React.ReactNode
  iconColor: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-5 w-5 items-center justify-center rounded',
            completed ? 'bg-emerald-500/10' : 'bg-zinc-800'
          )}
        >
          {completed ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <span className={iconColor}>{icon}</span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">
            {title}
            {required && (
              <span className="ml-1.5 text-[10px] font-medium uppercase text-amber-400">
                Required
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
        </div>
      </div>
      {!completed && action}
    </div>
  )
}
