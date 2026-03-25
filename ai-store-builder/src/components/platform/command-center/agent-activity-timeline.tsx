// src/components/platform/command-center/agent-activity-timeline.tsx
import { cn } from '@/lib/utils'
import { Activity } from 'lucide-react'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { AGENT_COLORS } from '@/lib/agents/constants'
import { ALL_SUB_AGENTS } from '@/lib/agents/sub-agents/registry'
import type { AgentAction } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface AgentActivityTimelineProps {
  actions: AgentAction[]
  maxItems?: number
}

type TimeGroup = 'just-now' | 'earlier-today' | 'yesterday'

function getTimeGroup(dateString: string): TimeGroup {
  const now = Date.now()
  const ts = new Date(dateString).getTime()
  const diffMs = now - ts
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffMs < 5 * 60 * 1000) return 'just-now'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const actionDate = new Date(dateString)
  actionDate.setHours(0, 0, 0, 0)

  if (actionDate.getTime() === today.getTime()) return 'earlier-today'
  if (diffHours < 48) return 'yesterday'
  return 'earlier-today' // fallback for older items shown
}

const GROUP_LABELS: Record<TimeGroup, string> = {
  'just-now': 'Just now',
  'earlier-today': 'Earlier today',
  yesterday: 'Yesterday',
}

const STATUS_DOTS: Record<string, string> = {
  completed: 'bg-emerald-400',
  running: 'bg-[var(--platform-accent)]',
  failed: 'bg-red-400',
  cancelled: 'bg-zinc-500',
  pending: 'bg-amber-400',
  requires_approval: 'bg-amber-400',
  rolled_back: 'bg-orange-400',
}

function getSubAgentCodename(subAgentType: string | null): string | null {
  if (!subAgentType) return null
  const found = ALL_SUB_AGENTS.find(
    (s) => s.id === subAgentType || s.codename.toLowerCase() === subAgentType.toLowerCase()
  )
  return found?.codename ?? subAgentType.toUpperCase()
}

interface TimelineEntryProps {
  action: AgentAction
  isLast: boolean
}

function TimelineEntry({ action, isLast }: TimelineEntryProps) {
  const colors = AGENT_COLORS[action.agent_type]
  const subCodename = getSubAgentCodename(action.sub_agent_type)
  const statusDot = STATUS_DOTS[action.status] ?? 'bg-zinc-500'

  return (
    <div className="group flex gap-3 py-2.5">
      {/* Timeline line */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className={cn('h-2 w-2 rounded-full', colors.dot)} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-[var(--platform-border)] min-h-[1.5rem]" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <AgentBadge agentType={action.agent_type} size="sm" />

          {subCodename && (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-medium',
                colors.text,
                colors.bg,
                colors.border
              )}
              title={`Sub-agent: ${action.sub_agent_type}`}
            >
              {subCodename}
            </span>
          )}

          <span className="text-[10px] text-[var(--platform-text-muted)]">
            {formatTimeAgo(action.created_at)}
          </span>

          {/* Status dot */}
          <span className={cn('ml-auto inline-block h-1.5 w-1.5 rounded-full shrink-0', statusDot)} />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--platform-text-secondary)]">
          {action.summary}
        </p>
      </div>
    </div>
  )
}

export function AgentActivityTimeline({ actions, maxItems = 20 }: AgentActivityTimelineProps) {
  const items = actions.slice(0, maxItems)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--platform-border)] p-10 text-center">
        <Activity className="mb-2 h-5 w-5 text-[var(--platform-text-muted)] opacity-40" />
        <p className="text-sm text-[var(--platform-text-muted)]">No activity yet</p>
        <p className="mt-1 text-xs text-[var(--platform-text-muted)] opacity-60">
          Agent actions will appear here as they run
        </p>
      </div>
    )
  }

  // Group by time
  const grouped = new Map<TimeGroup, AgentAction[]>()
  const groupOrder: TimeGroup[] = []

  for (const action of items) {
    const group = getTimeGroup(action.created_at)
    if (!grouped.has(group)) {
      grouped.set(group, [])
      groupOrder.push(group)
    }
    grouped.get(group)!.push(action)
  }

  // Sort groups: just-now → earlier-today → yesterday
  const sortedGroups: TimeGroup[] = ['just-now', 'earlier-today', 'yesterday'].filter((g) =>
    grouped.has(g as TimeGroup)
  ) as TimeGroup[]

  return (
    <div className="space-y-4">
      {sortedGroups.map((group) => {
        const groupActions = grouped.get(group) ?? []
        return (
          <div key={group}>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              {GROUP_LABELS[group]}
            </p>
            <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-1">
              {groupActions.map((action, idx) => (
                <TimelineEntry
                  key={action.id}
                  action={action}
                  isLast={idx === groupActions.length - 1}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
