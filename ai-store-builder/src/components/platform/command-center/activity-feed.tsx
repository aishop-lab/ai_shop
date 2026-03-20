// src/components/platform/command-center/activity-feed.tsx
import type { AgentAction } from '@/lib/agents/types'
import { ActivityItem } from './activity-item'

interface ActivityFeedProps {
  actions: AgentAction[]
  maxItems?: number
}

export function ActivityFeed({ actions, maxItems = 8 }: ActivityFeedProps) {
  const items = actions.slice(0, maxItems)

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--platform-border)] p-8 text-center">
        <p className="text-sm text-[var(--platform-text-muted)]">
          No agent activity yet. Enable an agent to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {items.map((action) => (
        <ActivityItem key={action.id} action={action} />
      ))}
    </div>
  )
}
