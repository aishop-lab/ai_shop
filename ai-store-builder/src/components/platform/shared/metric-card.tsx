import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  change?: { value: number; positive?: boolean }
  className?: string
}

export function MetricCard({ label, value, change, className }: MetricCardProps) {
  return (
    <div className={cn('rounded-lg border p-3 border-[var(--platform-border)] bg-[var(--platform-surface)]', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-[var(--platform-text-primary)]">{value}</p>
      {change && (
        <p className={cn('mt-0.5 font-mono text-xs', change.positive ? 'text-[var(--platform-status-active)]' : 'text-[var(--platform-status-error)]')}>
          {change.positive ? '↑' : '↓'} {Math.abs(change.value)}%
        </p>
      )}
    </div>
  )
}
