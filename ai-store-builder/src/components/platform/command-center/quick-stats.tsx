// src/components/platform/command-center/quick-stats.tsx
import { MetricCard } from '@/components/platform/shared/metric-card'

interface QuickStatsProps {
  totalActions: number
  pendingApprovals: number
  activeAgents: number
  totalAgents: number
  monthlyCost: number
}

export function QuickStats({ totalActions, pendingApprovals, activeAgents, totalAgents, monthlyCost }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard label="Total Actions" value={totalActions} change={{ value: 12, positive: true }} />
      <MetricCard label="Pending Approvals" value={pendingApprovals} />
      <MetricCard label="Active Agents" value={`${activeAgents} / ${totalAgents}`} />
      <MetricCard label="This Month" value={`$${monthlyCost.toFixed(2)}`} />
    </div>
  )
}
