'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'
import { AGENT_COLORS, AGENT_DISPLAY_NAMES, AUTONOMY_LEVELS } from '@/lib/agents/constants'
import { AGENT_INTRO_ORDER, AGENT_INTROS } from './agent-intro-data'

interface AgentTeamSummaryProps {
  agentStates: Record<AgentType, { enabled: boolean; autonomy: AutonomyLevel }>
  onComplete: () => void
}

export function AgentTeamSummary({ agentStates, onComplete }: AgentTeamSummaryProps) {
  const activeCount = AGENT_INTRO_ORDER.filter((agent) => agentStates[agent].enabled).length

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      role="dialog"
      aria-modal="true"
      aria-label="Your AI team summary"
    >
      <div
        className="w-full max-w-[480px] animate-[scaleIn_0.4s_ease-out]"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-8 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20">
            <Check className="w-7 h-7 text-emerald-400" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">
              Your AI Team is Ready
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {activeCount} of 5 agents activated
            </p>
          </div>
        </div>

        {/* Agent roster */}
        <div
          className="rounded-xl border divide-y overflow-hidden"
          style={{
            borderColor: 'var(--platform-border)',
            backgroundColor: 'var(--platform-surface)',
          }}
        >
          {AGENT_INTRO_ORDER.map((agent) => {
            const state = agentStates[agent]
            const colors = AGENT_COLORS[agent]
            const intro = AGENT_INTROS[agent]
            const autonomyInfo = AUTONOMY_LEVELS[state.autonomy]
            const isEnabled = state.enabled

            return (
              <div
                key={agent}
                className="flex items-center justify-between px-4 py-3 gap-3"
              >
                {/* Left: dot + name + role */}
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      'flex-shrink-0 w-2 h-2 rounded-full',
                      isEnabled ? colors.dot : 'bg-zinc-700'
                    )}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'font-mono font-bold text-sm leading-tight truncate',
                        isEnabled ? 'text-zinc-100' : 'text-zinc-500'
                      )}
                    >
                      {intro.codename}
                    </p>
                    <p className="text-xs text-zinc-500 leading-tight truncate">
                      {AGENT_DISPLAY_NAMES[agent]}
                    </p>
                  </div>
                </div>

                {/* Right: autonomy badge or inactive label */}
                {isEnabled ? (
                  <span className={cn('text-xs font-mono font-medium flex-shrink-0', colors.text)}>
                    L{state.autonomy} {autonomyInfo.label}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600 flex-shrink-0">Not active</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="mt-4 text-xs text-zinc-500 text-center leading-relaxed">
          You can change any of this anytime in Settings → Agent Configuration
        </p>

        {/* CTA button */}
        <div className="mt-6">
          <button
            onClick={onComplete}
            className="w-full py-3 px-6 rounded-lg bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Enter Command Center →
          </button>
        </div>
      </div>
    </div>
  )
}
