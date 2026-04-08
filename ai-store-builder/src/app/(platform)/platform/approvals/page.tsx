'use client'

import { useState, useMemo, useEffect } from 'react'
import { Check, X, ChevronDown, ChevronUp, Clock, Loader2, Zap, ArrowRight, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { KeyboardHint } from '@/components/platform/shared/keyboard-hint'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard'
import { useApprovals } from '@/lib/hooks/use-approvals'
import { formatTimeAgo } from '@/lib/agents/mock-data'
import { AGENT_TYPES, AGENT_COLORS } from '@/lib/agents/constants'
import { AGENT_INTROS } from '@/components/platform/onboarding/agent-intro-data'
import type { AgentApproval, AgentType, ApprovalPriority } from '@/lib/agents/types'

/** Convert a sub-agent ID (e.g. "campaign-architect") into a display codename (e.g. "CAMPAIGN-ARCHITECT") */
function formatSubAgentCodename(subAgentType: string): string {
  return subAgentType.toUpperCase()
}

// --- Priority config (PL-11: colorblind-friendly with text labels and icons) ---
const PRIORITY_CONFIG: Record<ApprovalPriority, { label: string; dotClass: string; textClass: string; order: number; icon: React.ReactNode }> = {
  urgent: { label: 'Urgent', dotClass: 'bg-red-500', textClass: 'text-red-400', order: 0, icon: <Zap className="h-3 w-3 text-red-400" /> },
  high:   { label: 'High',   dotClass: 'bg-amber-400', textClass: 'text-amber-400', order: 1, icon: <Zap className="h-3 w-3 text-amber-400" /> },
  normal: { label: 'Normal', dotClass: 'bg-zinc-400',  textClass: 'text-zinc-400', order: 2, icon: <ArrowRight className="h-3 w-3 text-zinc-400" /> },
  low:    { label: 'Low',    dotClass: 'bg-zinc-600',   textClass: 'text-zinc-400', order: 3, icon: <ArrowDown className="h-3 w-3 text-zinc-400" /> },
}

type CardDecision = 'approved' | 'rejected' | null

export default function ApprovalsPage() {
  const [agentFilter, setAgentFilter] = useState<AgentType | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<ApprovalPriority | 'all'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [decisions, setDecisions] = useState<Record<string, CardDecision>>({})
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [storeId, setStoreId] = useState<string | null>(null)
  // PL-13: Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch the merchant's store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) setStoreId(data.store.id)
        }
      } catch {
        console.error('[Approvals] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  const {
    approvals,
    isLoading,
    approveAction,
    rejectAction,
  } = useApprovals(storeId)

  // Filtered + sorted list (pending first, sorted by priority)
  const filteredApprovals = useMemo(() => {
    return approvals
      .filter((a) => agentFilter === 'all' || a.agent_type === agentFilter)
      .filter((a) => priorityFilter === 'all' || a.priority === priorityFilter)
      .sort((a, b) => PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order)
  }, [agentFilter, priorityFilter, approvals])

  const pendingCount = filteredApprovals.filter((a) => !decisions[a.id]).length

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function approve(id: string) {
    setDecisions((prev) => ({ ...prev, [id]: 'approved' }))
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    await approveAction(id)
  }

  async function reject(id: string) {
    setDecisions((prev) => ({ ...prev, [id]: 'rejected' }))
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    await rejectAction(id)
  }

  // PL-13: Batch selection helpers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pendingForBatch = filteredApprovals.filter((a) => !decisions[a.id])
  const allSelected = pendingForBatch.length > 0 && pendingForBatch.every((a) => selectedIds.has(a.id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingForBatch.map((a) => a.id)))
    }
  }

  async function batchApprove() {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      await approve(id)
    }
    setSelectedIds(new Set())
  }

  async function batchReject() {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      await reject(id)
    }
    setSelectedIds(new Set())
  }

  // Keyboard navigation — clamp index to list bounds
  const clampedIndex = Math.min(selectedIndex, Math.max(0, filteredApprovals.length - 1))

  useKeyboardShortcuts([
    {
      key: 'j',
      handler: () => setSelectedIndex((i) => Math.min(i + 1, filteredApprovals.length - 1)),
      description: 'Move selection down',
    },
    {
      key: 'k',
      handler: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
      description: 'Move selection up',
    },
    {
      key: 'a',
      handler: () => {
        const item = filteredApprovals[clampedIndex]
        if (item) approve(item.id)
      },
      description: 'Approve selected',
    },
    {
      key: 'r',
      handler: () => {
        const item = filteredApprovals[clampedIndex]
        if (item) reject(item.id)
      },
      description: 'Reject selected',
    },
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PlatformBreadcrumb items={[{ label: 'Command Center', href: '/platform' }, { label: 'Approvals' }]} />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              Approval Queue
            </h1>
            {pendingCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-[var(--platform-status-approval)]/15 px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--platform-status-approval)]">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
            Review and decide on actions your agents are requesting permission for
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Agent filter */}
          <div className="relative">
            <select
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e.target.value as AgentType | 'all')
                setSelectedIndex(0)
              }}
              aria-label="Filter by agent"
              className={cn(
                'appearance-none rounded-lg border border-[var(--platform-border)]',
                'bg-[var(--platform-surface)] px-3 py-1.5 pr-7',
                'font-mono text-xs text-[var(--platform-text-secondary)]',
                'cursor-pointer outline-none',
                'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
                'transition-colors'
              )}
            >
              <option value="all">All agents</option>
              {AGENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--platform-text-muted)]" />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as ApprovalPriority | 'all')
                setSelectedIndex(0)
              }}
              aria-label="Filter by priority"
              className={cn(
                'appearance-none rounded-lg border border-[var(--platform-border)]',
                'bg-[var(--platform-surface)] px-3 py-1.5 pr-7',
                'font-mono text-xs text-[var(--platform-text-secondary)]',
                'cursor-pointer outline-none',
                'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
                'transition-colors'
              )}
            >
              <option value="all">All priorities</option>
              {(['urgent', 'high', 'normal', 'low'] as ApprovalPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_CONFIG[p].label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--platform-text-muted)]" />
          </div>
        </div>
      </div>

      {/* PL-13: Batch action bar */}
      {!isLoading && filteredApprovals.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-3.5 w-3.5 rounded border-[var(--platform-border)] bg-[var(--platform-bg)] accent-[var(--platform-accent)]"
            />
            <span className="text-xs text-[var(--platform-text-muted)]">
              {allSelected ? 'Deselect all' : 'Select all'}
            </span>
          </label>

          {selectedIds.size > 0 && (
            <>
              <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">
                {selectedIds.size} selected
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={batchReject}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <X className="h-3 w-3" />
                  Reject Selected
                </button>
                <button
                  type="button"
                  onClick={batchApprove}
                  className="flex items-center gap-1.5 rounded-lg border border-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/10"
                >
                  <Check className="h-3 w-3" />
                  Approve Selected
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Approval cards */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] py-20">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--platform-surface-hover)]">
            <Check className="h-5 w-5 text-[var(--platform-status-active)]" />
          </div>
          <p className="font-mono text-sm text-[var(--platform-text-primary)]">All clear</p>
          <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
            No pending approvals — your agents are running smoothly
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredApprovals.map((approval, idx) => {
            const decision = decisions[approval.id] ?? null
            const isSelected = idx === clampedIndex
            const isExpanded = expandedIds.has(approval.id)
            const priority = PRIORITY_CONFIG[approval.priority]

            return (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                decision={decision}
                isSelected={isSelected}
                isExpanded={isExpanded}
                priorityConfig={priority}
                isChecked={selectedIds.has(approval.id)}
                onToggleCheck={() => toggleSelect(approval.id)}
                onToggleExpand={() => toggleExpand(approval.id)}
                onApprove={() => approve(approval.id)}
                onReject={() => reject(approval.id)}
                onSelect={() => setSelectedIndex(idx)}
              />
            )
          })}
        </div>
      )}

      {/* Keyboard help bar — hidden on mobile (no physical keyboard) */}
      <div className="hidden sm:flex items-center justify-center gap-4 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5">
        <span className="text-[10px] text-[var(--platform-text-muted)]">Keyboard shortcuts</span>
        <div className="flex items-center gap-1">
          <KeyboardHint keys="j" />
          <KeyboardHint keys="k" />
          <span className="text-[10px] text-[var(--platform-text-muted)]">navigate</span>
        </div>
        <div className="flex items-center gap-1">
          <KeyboardHint keys="a" />
          <span className="text-[10px] text-[var(--platform-text-muted)]">approve</span>
        </div>
        <div className="flex items-center gap-1">
          <KeyboardHint keys="r" />
          <span className="text-[10px] text-[var(--platform-text-muted)]">reject</span>
        </div>
      </div>
    </div>
  )
}

// --- ApprovalCard sub-component ---

interface ApprovalCardProps {
  approval: AgentApproval
  decision: CardDecision
  isSelected: boolean
  isExpanded: boolean
  priorityConfig: { label: string; dotClass: string; textClass: string; icon: React.ReactNode }
  isChecked: boolean
  onToggleCheck: () => void
  onToggleExpand: () => void
  onApprove: () => void
  onReject: () => void
  onSelect: () => void
}

function ApprovalCard({
  approval,
  decision,
  isSelected,
  isExpanded,
  priorityConfig,
  isChecked,
  onToggleCheck,
  onToggleExpand,
  onApprove,
  onReject,
  onSelect,
}: ApprovalCardProps) {
  const isDone = decision !== null

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative rounded-xl border transition-all duration-150 overflow-hidden cursor-pointer',
        'bg-[var(--platform-surface)]',
        isSelected && !isDone
          ? 'border-[var(--platform-accent)] shadow-[0_0_0_1px_var(--platform-accent)]'
          : 'border-[var(--platform-border)]',
        isDone && 'opacity-50',
        !isDone && 'hover:border-[var(--platform-border-hover)]'
      )}
    >
      {/* Decision overlay */}
      {isDone && (
        <div
          className={cn(
            'absolute inset-0 z-10 flex items-center justify-center rounded-xl',
            decision === 'approved'
              ? 'bg-green-500/8'
              : 'bg-red-500/8'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5',
              decision === 'approved'
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            )}
          >
            {decision === 'approved' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            <span className="font-mono text-xs font-medium capitalize">{decision}</span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Top row: checkbox + priority + agent badge + timestamp */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* PL-13: Batch selection checkbox */}
            {!isDone && (
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation()
                  onToggleCheck()
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 shrink-0 rounded border-[var(--platform-border)] bg-[var(--platform-bg)] accent-[var(--platform-accent)]"
              />
            )}
            {/* Priority indicator with icon + label for accessibility */}
            <span
              title={`Priority: ${priorityConfig.label}`}
              className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-medium', priorityConfig.textClass, 'border-current/20')}
            >
              {priorityConfig.icon}
              {priorityConfig.label}
            </span>
            {/* Chief agent badge */}
            <AgentBadge agentType={approval.agent_type} size="sm" />
            {/* Sub-agent codename badge (only shown when sub_agent_type is set) */}
            {approval.sub_agent_type && (() => {
              const chiefColors = AGENT_COLORS[approval.agent_type]
              const chiefCodename = AGENT_INTROS[approval.agent_type]?.codename ?? approval.agent_type.toUpperCase()
              return (
                <span
                  title={`${chiefCodename} sub-agent: ${approval.sub_agent_type}`}
                  className={cn(
                    'inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-medium',
                    chiefColors.text,
                    chiefColors.bg,
                    chiefColors.border
                  )}
                >
                  {formatSubAgentCodename(approval.sub_agent_type)}
                </span>
              )
            })()}
          </div>
          <div className="flex items-center gap-1.5 text-[var(--platform-text-muted)]">
            <Clock className="h-3 w-3" />
            <span className="font-mono text-[10px]">{formatTimeAgo(approval.created_at)}</span>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm leading-relaxed text-[var(--platform-text-primary)]">
          {approval.summary}
        </p>

        {/* Reasoning toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="mt-2 flex items-center gap-1 text-[10px] text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)] transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {isExpanded ? 'Hide reasoning' : 'Show reasoning'}
        </button>

        {/* Reasoning (collapsible) */}
        {isExpanded && (
          <div className="mt-2.5 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)] mb-1.5">
              Agent reasoning
            </p>
            <p className="text-xs leading-relaxed text-[var(--platform-text-secondary)]">
              {approval.reasoning}
            </p>
          </div>
        )}

        {/* Bottom row: expires + action buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            {approval.expires_at ? (
              <span className="font-mono text-[10px] text-[var(--platform-status-approval)]">
                Expires {formatTimeAgo(approval.expires_at).replace('ago', '').trim() === 'just now'
                  ? 'soon'
                  : `in ~${formatTimeAgo(approval.expires_at)}`}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">
                No expiry
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Keyboard hint when selected */}
            {isSelected && !isDone && (
              <div className="flex items-center gap-1.5 mr-1">
                <div className="flex items-center gap-0.5">
                  <KeyboardHint keys="a" />
                </div>
                <div className="flex items-center gap-0.5">
                  <KeyboardHint keys="r" />
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isDone}
              onClick={(e) => {
                e.stopPropagation()
                onReject()
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                'border-red-500/20 text-red-400',
                isDone
                  ? 'cursor-default opacity-40'
                  : 'hover:bg-red-500/10 hover:border-red-500/40 active:bg-red-500/20'
              )}
            >
              <X className="h-3 w-3" />
              Reject
            </button>

            <button
              type="button"
              disabled={isDone}
              onClick={(e) => {
                e.stopPropagation()
                onApprove()
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                'border-green-500/20 text-green-400',
                isDone
                  ? 'cursor-default opacity-40'
                  : 'hover:bg-green-500/10 hover:border-green-500/40 active:bg-green-500/20'
              )}
            >
              <Check className="h-3 w-3" />
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
