// src/components/platform/command-center/activity-item.tsx
import { cn } from '@/lib/utils'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { AGENT_COLORS } from '@/lib/agents/constants'
import type { AgentAction } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface ActivityItemProps {
  action: AgentAction
}

export function ActivityItem({ action }: ActivityItemProps) {
  const colors = AGENT_COLORS[action.agent_type]

  return (
    <div className="group flex gap-3 py-2.5">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div className={cn('h-2 w-2 rounded-full', colors.dot)} />
        <div className="mt-1 w-px flex-1 bg-[var(--platform-border)]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <AgentBadge agentType={action.agent_type} size="sm" />
          <span className="text-[10px] text-[var(--platform-text-muted)]">
            {formatTimeAgo(action.created_at)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--platform-text-secondary)]">
          {action.summary}
        </p>
      </div>
    </div>
  )
}
