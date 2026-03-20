// src/components/platform/command-center/agent-card.tsx
import { cn } from '@/lib/utils'
import { StatusDot } from '@/components/platform/shared/status-dot'
import { AGENT_DISPLAY_NAMES, AGENT_DESCRIPTIONS, AGENT_COLORS, STATUS_COLORS } from '@/lib/agents/constants'
import type { AgentState } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface AgentCardProps {
  agent: AgentState
}

export function AgentCard({ agent }: AgentCardProps) {
  const colors = AGENT_COLORS[agent.agent_type]
  const statusInfo = STATUS_COLORS[agent.status]

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        'border-[var(--platform-border)] bg-[var(--platform-surface)]',
        agent.is_enabled && 'hover:border-[var(--platform-border-hover)] cursor-pointer',
        !agent.is_enabled && 'opacity-50'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('inline-block h-2 w-2 rounded-full', colors.dot)} />
          <span className={cn('font-mono text-xs font-medium', colors.text)}>
            {AGENT_DISPLAY_NAMES[agent.agent_type].replace(' Agent', '')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot status={agent.status} size="sm" />
          <span className="text-[10px] text-[var(--platform-text-muted)]">
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--platform-text-muted)]">
        {AGENT_DESCRIPTIONS[agent.agent_type]}
      </p>

      {/* Stats */}
      {agent.is_enabled && (
        <div className="mt-3 flex items-center gap-4 border-t border-[var(--platform-border)] pt-3">
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              {agent.total_actions}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-[var(--platform-text-muted)]">Actions</p>
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              {agent.total_approvals_requested}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-[var(--platform-text-muted)]">Approvals</p>
          </div>
          {agent.last_action_at && (
            <div className="ml-auto text-right">
              <p className="text-[10px] text-[var(--platform-text-muted)]">
                Last active {formatTimeAgo(agent.last_action_at)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Not enabled state */}
      {!agent.is_enabled && (
        <div className="mt-3 border-t border-[var(--platform-border)] pt-3">
          <p className="text-[10px] text-[var(--platform-text-muted)]">Not configured</p>
        </div>
      )}
    </div>
  )
}
