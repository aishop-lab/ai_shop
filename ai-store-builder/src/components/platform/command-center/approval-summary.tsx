// src/components/platform/command-center/approval-summary.tsx
import { cn } from '@/lib/utils'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { APPROVAL_PRIORITY_ORDER } from '@/lib/agents/constants'
import type { AgentApproval, ApprovalPriority } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface ApprovalSummaryProps {
  approvals: AgentApproval[]
  maxItems?: number
}

const priorityDots: Record<ApprovalPriority, string> = {
  urgent: 'bg-red-400',
  high: 'bg-amber-400',
  normal: 'bg-[var(--platform-text-muted)]',
  low: 'bg-[var(--platform-border-hover)]',
}

export function ApprovalSummary({ approvals, maxItems = 5 }: ApprovalSummaryProps) {
  const pending = approvals
    .filter((a) => a.status === 'pending')
    .sort((a, b) => {
      const ai = APPROVAL_PRIORITY_ORDER.indexOf(a.priority)
      const bi = APPROVAL_PRIORITY_ORDER.indexOf(b.priority)
      return ai - bi
    })
    .slice(0, maxItems)

  if (pending.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--platform-border)] p-6 text-center">
        <p className="text-xs text-[var(--platform-text-muted)]">No pending approvals</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {pending.map((approval) => (
        <div
          key={approval.id}
          className="flex items-start gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-3 transition-colors hover:border-[var(--platform-border-hover)] cursor-pointer"
        >
          <div className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', priorityDots[approval.priority])} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <AgentBadge agentType={approval.agent_type} size="sm" />
              <span className="text-[10px] text-[var(--platform-text-muted)]">
                {formatTimeAgo(approval.created_at)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--platform-text-secondary)] line-clamp-2">
              {approval.summary}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
