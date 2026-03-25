// src/components/platform/command-center/impact-metrics-row.tsx
import { cn } from '@/lib/utils'
import { ShieldCheck, Zap, HeadphonesIcon, Bot } from 'lucide-react'

interface ImpactMetric {
  label: string
  value: string | number
  subtext?: string
  icon: React.ReactNode
  accent?: string
  isEmpty?: boolean
}

function MetricTile({ label, value, subtext, icon, accent, isEmpty }: ImpactMetric) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-4',
        'border-[var(--platform-border)] bg-[var(--platform-surface)]',
        isEmpty && 'opacity-50'
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          {label}
        </p>
        <span className={cn('opacity-60', accent)}>{icon}</span>
      </div>
      <p className={cn('font-mono text-2xl font-semibold', accent ?? 'text-[var(--platform-text-primary)]')}>
        {value}
      </p>
      {subtext && (
        <p className="text-[11px] text-[var(--platform-text-muted)]">{subtext}</p>
      )}
    </div>
  )
}

interface ImpactMetricsRowProps {
  revenueRecovered: number
  tasksCompleted: number
  supportResolved: number
  activeAgents: number
  totalAgents: number
  currency?: string
}

function formatCurrency(amount: number, currency: string): string {
  if (amount === 0) return '—'
  if (currency === 'INR') {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
    return `₹${amount.toLocaleString('en-IN')}`
  }
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`
  return `$${amount}`
}

export function ImpactMetricsRow({
  revenueRecovered,
  tasksCompleted,
  supportResolved,
  activeAgents,
  totalAgents,
  currency = 'INR',
}: ImpactMetricsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 overflow-x-auto">
      <MetricTile
        label="Revenue Protected"
        value={formatCurrency(revenueRecovered, currency)}
        subtext={revenueRecovered > 0 ? 'from abandoned carts today' : 'No recoveries yet today'}
        icon={<ShieldCheck className="h-4 w-4" />}
        accent="text-emerald-400"
        isEmpty={revenueRecovered === 0}
      />
      <MetricTile
        label="Tasks Completed"
        value={tasksCompleted === 0 ? '—' : tasksCompleted}
        subtext={tasksCompleted > 0 ? 'agent actions today' : 'No actions yet today'}
        icon={<Zap className="h-4 w-4" />}
        accent="text-[var(--platform-accent)]"
        isEmpty={tasksCompleted === 0}
      />
      <MetricTile
        label="Support Resolved"
        value={supportResolved === 0 ? '—' : supportResolved}
        subtext={supportResolved > 0 ? 'tickets closed today' : 'No tickets yet today'}
        icon={<HeadphonesIcon className="h-4 w-4" />}
        accent="text-blue-400"
        isEmpty={supportResolved === 0}
      />
      <MetricTile
        label="Active Agents"
        value={`${activeAgents} / ${totalAgents}`}
        subtext={activeAgents === 0 ? 'Enable agents to start' : `${totalAgents - activeAgents} agents offline`}
        icon={<Bot className="h-4 w-4" />}
        accent={activeAgents > 0 ? 'text-[var(--platform-text-primary)]' : 'text-[var(--platform-text-muted)]'}
        isEmpty={activeAgents === 0}
      />
    </div>
  )
}
