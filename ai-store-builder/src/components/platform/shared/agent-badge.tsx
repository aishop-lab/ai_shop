import { cn } from '@/lib/utils'
import type { AgentType } from '@/lib/agents/types'
import { AGENT_DISPLAY_NAMES, AGENT_COLORS } from '@/lib/agents/constants'

interface AgentBadgeProps {
  agentType: AgentType
  size?: 'sm' | 'md'
  className?: string
}

export function AgentBadge({ agentType, size = 'sm', className }: AgentBadgeProps) {
  const colors = AGENT_COLORS[agentType]
  const name = AGENT_DISPLAY_NAMES[agentType]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-mono',
        colors.bg, colors.text, colors.border,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', colors.dot)} />
      {name.replace(' Agent', '')}
    </span>
  )
}
