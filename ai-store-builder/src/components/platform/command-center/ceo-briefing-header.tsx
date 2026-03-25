// src/components/platform/command-center/ceo-briefing-header.tsx
import { cn } from '@/lib/utils'

interface CeoBriefingHeaderProps {
  merchantName: string
  tasksCompleted: number
  revenueRecovered: number
  supportResolved: number
  currency?: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`
  }
  return `$${amount.toLocaleString('en-US')}`
}

export function CeoBriefingHeader({
  merchantName,
  tasksCompleted,
  revenueRecovered,
  supportResolved,
  currency = 'INR',
}: CeoBriefingHeaderProps) {
  const greeting = getGreeting()
  const today = formatDate()

  const hasSummary = tasksCompleted > 0 || revenueRecovered > 0 || supportResolved > 0

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="font-mono text-xl font-semibold text-[var(--platform-text-primary)]">
          {greeting},{' '}
          <span className="text-[var(--platform-accent)]">
            {merchantName || 'there'}
          </span>
        </h1>
        <span className="text-xs text-[var(--platform-text-muted)]">{today}</span>
      </div>

      {hasSummary ? (
        <p className="text-sm text-[var(--platform-text-secondary)]">
          Your agents completed{' '}
          <span className={cn('font-medium', tasksCompleted > 0 ? 'text-[var(--platform-text-primary)]' : '')}>
            {tasksCompleted} {tasksCompleted === 1 ? 'task' : 'tasks'}
          </span>{' '}
          today
          {revenueRecovered > 0 && (
            <>
              {', recovering '}
              <span className="font-medium text-emerald-400">
                {formatCurrency(revenueRecovered, currency)}
              </span>
              {' in revenue'}
            </>
          )}
          {supportResolved > 0 && (
            <>
              {' and resolving '}
              <span className="font-medium text-blue-400">
                {supportResolved} support {supportResolved === 1 ? 'ticket' : 'tickets'}
              </span>
            </>
          )}
          {'.'}
        </p>
      ) : (
        <p className="text-sm text-[var(--platform-text-secondary)]">
          Your AI team is standing by — enable agents to start automating your business.
        </p>
      )}
    </div>
  )
}
