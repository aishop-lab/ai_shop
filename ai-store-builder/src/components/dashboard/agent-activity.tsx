'use client'

import { Bot, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

interface Activity {
  id: string
  agent_type: string
  action_type: string
  summary: string
  status: string
  execution_mode: string | null
  created_at: string
  duration_ms: number | null
}

const STATUS_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  completed: { icon: CheckCircle, color: 'text-green-400' },
  failed: { icon: XCircle, color: 'text-red-400' },
  running: { icon: Loader2, color: 'text-blue-400' },
  pending: { icon: Clock, color: 'text-yellow-400' },
  requires_approval: { icon: Clock, color: 'text-orange-400' },
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function AgentActivity({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent agent activity.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map(activity => {
        const statusInfo = STATUS_ICONS[activity.status] || STATUS_ICONS.completed
        const StatusIcon = statusInfo.icon

        return (
          <div key={activity.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50">
            <StatusIcon className={`h-4 w-4 shrink-0 ${statusInfo.color} ${activity.status === 'running' ? 'animate-spin' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-300 truncate">{activity.summary}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-zinc-600 capitalize">{activity.agent_type}</span>
              <span className="text-xs text-zinc-600">{timeAgo(activity.created_at)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
