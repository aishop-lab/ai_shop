// src/components/platform/command-center/pending-approvals-panel.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowRight, Check, X } from 'lucide-react'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { AGENT_COLORS, APPROVAL_PRIORITY_ORDER } from '@/lib/agents/constants'
import { AGENT_INTROS } from '@/components/platform/onboarding/agent-intro-data'
import { ALL_SUB_AGENTS } from '@/lib/agents/sub-agents/registry'
import type { AgentApproval, ApprovalPriority } from '@/lib/agents/types'
import { formatTimeAgo } from '@/lib/agents/mock-data'

interface PendingApprovalsPanelProps {
  approvals: AgentApproval[]
  pendingCount: number
  maxItems?: number
  onApprove?: (id: string) => Promise<boolean>
  onReject?: (id: string) => Promise<boolean>
}

const PRIORITY_DOTS: Record<ApprovalPriority, string> = {
  urgent: 'bg-red-400',
  high: 'bg-amber-400',
  normal: 'bg-[var(--platform-text-muted)]',
  low: 'bg-[var(--platform-border)]',
}

const PRIORITY_LABELS: Record<ApprovalPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

function getSubAgentCodename(subAgentType: string | null): string | null {
  if (!subAgentType) return null
  const found = ALL_SUB_AGENTS.find(
    (s) => s.id === subAgentType || s.codename.toLowerCase() === subAgentType.toLowerCase()
  )
  return found?.codename ?? subAgentType.toUpperCase()
}

interface ApprovalCardProps {
  approval: AgentApproval
  onApprove?: (id: string) => Promise<boolean>
  onReject?: (id: string) => Promise<boolean>
}

function ApprovalCard({ approval, onApprove, onReject }: ApprovalCardProps) {
  const [isActing, setIsActing] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const colors = AGENT_COLORS[approval.agent_type]
  const subCodename = getSubAgentCodename(approval.sub_agent_type)

  if (isDone) return null

  const handleApprove = async () => {
    if (!onApprove || isActing) return
    setIsActing(true)
    const ok = await onApprove(approval.id)
    if (ok) setIsDone(true)
    setIsActing(false)
  }

  const handleReject = async () => {
    if (!onReject || isActing) return
    setIsActing(true)
    const ok = await onReject(approval.id)
    if (ok) setIsDone(true)
    setIsActing(false)
  }

  return (
    <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-3 space-y-2 hover:border-[var(--platform-border-hover)] transition-colors">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOTS[approval.priority])} />
        <AgentBadge agentType={approval.agent_type} size="sm" />
        {subCodename && (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-medium',
              colors.text,
              colors.bg,
              colors.border
            )}
            title={`Sub-agent: ${approval.sub_agent_type}`}
          >
            {subCodename}
          </span>
        )}
        <span className="ml-auto text-[10px] text-[var(--platform-text-muted)]">
          {PRIORITY_LABELS[approval.priority]} · {formatTimeAgo(approval.created_at)}
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs leading-relaxed text-[var(--platform-text-secondary)] line-clamp-2">
        {approval.summary}
      </p>

      {/* Actions */}
      {(onApprove || onReject) && (
        <div className="flex gap-2 pt-0.5">
          {onApprove && (
            <button
              type="button"
              disabled={isActing}
              onClick={handleApprove}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors',
                'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                'hover:bg-emerald-500/20 hover:border-emerald-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Check className="h-3 w-3" />
              Approve
            </button>
          )}
          {onReject && (
            <button
              type="button"
              disabled={isActing}
              onClick={handleReject}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors',
                'border-red-500/30 bg-red-500/10 text-red-400',
                'hover:bg-red-500/20 hover:border-red-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <X className="h-3 w-3" />
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function PendingApprovalsPanel({
  approvals,
  pendingCount,
  maxItems = 4,
  onApprove,
  onReject,
}: PendingApprovalsPanelProps) {
  const sorted = approvals
    .filter((a) => a.status === 'pending')
    .sort((a, b) => {
      const ai = APPROVAL_PRIORITY_ORDER.indexOf(a.priority)
      const bi = APPROVAL_PRIORITY_ORDER.indexOf(b.priority)
      return ai - bi
    })
    .slice(0, maxItems)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Pending Approvals
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
              {pendingCount}
            </span>
          )}
        </h2>
        {pendingCount > maxItems && (
          <Link
            href="/platform/approvals"
            className="flex items-center gap-1 text-[10px] text-[var(--platform-accent)] hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--platform-border)] p-6 text-center">
          <p className="text-xs text-[var(--platform-text-muted)]">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
