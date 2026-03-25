// src/components/platform/command-center/agent-health-overview.tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AGENT_COLORS, AGENT_DISPLAY_NAMES, STATUS_COLORS } from '@/lib/agents/constants'
import { AGENT_INTROS } from '@/components/platform/onboarding/agent-intro-data'
import { SUB_AGENTS_BY_CHIEF } from '@/lib/agents/sub-agents/registry'
import { StatusDot } from '@/components/platform/shared/status-dot'
import type { AgentState } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface AgentHealthOverviewProps {
  agents: AgentState[]
}

export function AgentHealthOverview({ agents }: AgentHealthOverviewProps) {
  if (agents.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
        Agent Health
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {agents.map((agent) => {
          const colors = AGENT_COLORS[agent.agent_type]
          const statusInfo = STATUS_COLORS[agent.status]
          const intro = AGENT_INTROS[agent.agent_type]
          const subAgentCount = (SUB_AGENTS_BY_CHIEF[agent.agent_type] ?? []).length

          return (
            <Link
              key={agent.id}
              href={`/platform/agents/${agent.agent_type}`}
              className={cn(
                'block rounded-lg border p-3 transition-colors',
                'border-[var(--platform-border)] bg-[var(--platform-surface)]',
                'hover:border-[var(--platform-border-hover)]',
                !agent.is_enabled && 'opacity-40'
              )}
            >
              {/* Chief name + status */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', colors.dot)} />
                  <span className={cn('font-mono text-[11px] font-semibold truncate', colors.text)}>
                    {intro?.codename ?? AGENT_DISPLAY_NAMES[agent.agent_type].replace(' Agent', '')}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <StatusDot status={agent.status} size="sm" />
                  <span className={cn('text-[9px]', statusInfo.text)}>{statusInfo.label}</span>
                </div>
              </div>

              {/* Sub-agent count */}
              <p className="text-[10px] text-[var(--platform-text-muted)]">
                {subAgentCount} sub-agents
                {agent.is_enabled ? '' : ' · offline'}
              </p>

              {/* Last action */}
              {agent.is_enabled && agent.last_action_at && (
                <p className="mt-1 text-[10px] text-[var(--platform-text-muted)] opacity-70">
                  Last: {formatTimeAgo(agent.last_action_at)}
                </p>
              )}

              {/* Total actions badge */}
              {agent.is_enabled && agent.total_actions > 0 && (
                <p className="mt-1.5 font-mono text-xs font-semibold text-[var(--platform-text-primary)]">
                  {agent.total_actions.toLocaleString()}
                  <span className="font-normal text-[var(--platform-text-muted)]"> total actions</span>
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
