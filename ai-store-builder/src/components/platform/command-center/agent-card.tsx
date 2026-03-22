// src/components/platform/command-center/agent-card.tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatusDot } from '@/components/platform/shared/status-dot'
import { AGENT_DISPLAY_NAMES, AGENT_DESCRIPTIONS, AGENT_COLORS, STATUS_COLORS } from '@/lib/agents/constants'
import type { AgentState } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface AgentCardProps {
  agent: AgentState
  onToggleEnabled?: (agentType: string) => void
}

export function AgentCard({ agent, onToggleEnabled }: AgentCardProps) {
  const colors = AGENT_COLORS[agent.agent_type]
  const statusInfo = STATUS_COLORS[agent.status]

  const cardClasses = cn(
    'block rounded-lg border p-4 transition-colors',
    'border-[var(--platform-border)] bg-[var(--platform-surface)]',
    agent.is_enabled && 'hover:border-[var(--platform-border-hover)] cursor-pointer',
    !agent.is_enabled && 'opacity-50'
  )

  const cardBody = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('inline-block h-2 w-2 rounded-full', colors.dot)} />
          <span className={cn('font-mono text-xs font-medium', colors.text)}>
            {AGENT_DISPLAY_NAMES[agent.agent_type].replace(' Agent', '')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onToggleEnabled && (
            <span
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -my-2 mr-0.5"
            >
              <button
                type="button"
                role="switch"
                aria-checked={agent.is_enabled}
                aria-label={`Toggle ${AGENT_DISPLAY_NAMES[agent.agent_type]}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleEnabled(agent.agent_type)
                }}
                className={cn(
                  'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-accent)]',
                  agent.is_enabled ? 'bg-[var(--platform-accent)]' : 'bg-[var(--platform-border)]'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                    agent.is_enabled ? 'translate-x-3' : 'translate-x-0'
                  )}
                />
              </button>
            </span>
          )}
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
    </>
  )

  return (
    <Link
      href={`/platform/agents/${agent.agent_type}`}
      className={cardClasses}
    >
      {cardBody}
    </Link>
  )
}
