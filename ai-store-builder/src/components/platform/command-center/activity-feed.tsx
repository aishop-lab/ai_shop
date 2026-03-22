// src/components/platform/command-center/activity-feed.tsx
import { Activity } from 'lucide-react'
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
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--platform-border)] p-8 text-center">
        <Activity className="mb-2 h-5 w-5 text-[var(--platform-text-muted)] opacity-50" />
        <p className="text-sm text-[var(--platform-text-muted)]">
          No recent activity
        </p>
        <p className="mt-1 text-xs text-[var(--platform-text-muted)] opacity-70">
          Agent actions will appear here as they run
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
