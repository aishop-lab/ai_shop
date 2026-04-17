'use client'

import { TrendingUp, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react'

interface Insight {
  id: string
  agent_type: string
  action_type: string
  action_category: string
  summary: string
  details: Record<string, unknown>
  created_at: string
}

const AGENT_COLORS: Record<string, string> = {
  analytics: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  marketing: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  sales: 'text-green-400 bg-green-500/10 border-green-500/20',
  support: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  technical: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  anomaly: AlertTriangle,
  insight: Lightbulb,
  recommendation: TrendingUp,
  report: BarChart3,
  alert: AlertTriangle,
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function InsightsFeed({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No insights yet. Agents will surface findings here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {insights.map(insight => {
        const Icon = CATEGORY_ICONS[insight.action_category] || Lightbulb
        const colorClass = AGENT_COLORS[insight.agent_type] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'

        return (
          <div
            key={insight.id}
            className={`p-4 rounded-lg border ${colorClass}`}
          >
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase opacity-60">{insight.agent_type}</span>
                  <span className="text-xs opacity-40">{timeAgo(insight.created_at)}</span>
                </div>
                <p className="text-sm leading-relaxed">{insight.summary}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
