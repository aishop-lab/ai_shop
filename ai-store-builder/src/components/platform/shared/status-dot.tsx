import { cn } from '@/lib/utils'
import type { AgentStatus } from '@/lib/agents/types'
import { STATUS_COLORS } from '@/lib/agents/constants'

interface StatusDotProps {
  status: AgentStatus
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
} as const

export function StatusDot({ status, size = 'md', pulse, className }: StatusDotProps) {
  const colors = STATUS_COLORS[status]
  const shouldPulse = pulse ?? status === 'running'

  return (
    <span className={cn('relative inline-flex', className)}>
      {shouldPulse && (
        <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', colors.dot)} />
      )}
      <span className={cn('relative inline-flex rounded-full', sizeClasses[size], colors.dot)} />
    </span>
  )
}
