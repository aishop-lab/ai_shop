// src/app/(platform)/platform/settings/agents/[agentType]/memory/page.tsx
'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Trash2, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AGENT_TYPES,
  AGENT_DISPLAY_NAMES,
  AGENT_COLORS,
} from '@/lib/agents/constants'
import type { AgentType } from '@/lib/agents/types'

type MemoryType = 'preference' | 'pattern' | 'feedback' | 'context'
type MemorySource = 'merchant_feedback' | 'data_analysis' | 'approval_pattern' | 'explicit_config'

interface AgentMemory {
  id: string
  store_id: string
  agent_type: AgentType
  memory_type: MemoryType
  memory_key: string
  memory_value: Record<string, unknown>
  confidence: number
  source: MemorySource
  source_action_id: string | null
  created_at: string
  updated_at: string
  expires_at: string | null
}

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  preference: 'Preferences',
  pattern: 'Learned Patterns',
  feedback: 'Merchant Feedback',
  context: 'Context',
}

const MEMORY_TYPE_DESCRIPTIONS: Record<MemoryType, string> = {
  preference: 'Merchant preferences the agent has learned',
  pattern: 'Behavioral patterns detected from approvals and actions',
  feedback: 'Direct feedback from approval rejections',
  context: 'Contextual information gathered from data analysis',
}

const SOURCE_LABELS: Record<MemorySource, string> = {
  merchant_feedback: 'Feedback',
  data_analysis: 'Analysis',
  approval_pattern: 'Approval',
  explicit_config: 'Config',
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMemoryValue(value: Record<string, unknown>): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100)
  const colorClass =
    confidence > 0.7
      ? 'bg-emerald-400'
      : confidence >= 0.3
        ? 'bg-amber-400'
        : 'bg-red-400'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-[var(--platform-border)]">
        <div
          className={cn('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-mono text-[10px] text-[var(--platform-text-muted)] tabular-nums">
        {percentage}%
      </span>
    </div>
  )
}

function MemoryCard({
  memory,
  onDelete,
  deleting,
}: {
  memory: AgentMemory
  onDelete: (id: string) => void
  deleting: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const formattedValue = formatMemoryValue(memory.memory_value)
  const isLong = formattedValue.length > 120

  return (
    <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-xs font-medium text-[var(--platform-text-primary)] break-all">
            {memory.memory_key}
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--platform-text-muted)]">
              {SOURCE_LABELS[memory.source]}
            </span>
            {memory.expires_at && (
              <span className="text-[10px] text-[var(--platform-text-muted)]">
                Expires {formatTimestamp(memory.expires_at)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(memory.id)}
          disabled={deleting}
          className="shrink-0 rounded p-1.5 text-[var(--platform-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          aria-label="Delete memory"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Confidence */}
      <ConfidenceBar confidence={memory.confidence} />

      {/* Value */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] p-2.5 text-left',
            isLong && 'cursor-pointer'
          )}
        >
          <pre
            className={cn(
              'font-mono text-[11px] leading-relaxed text-[var(--platform-text-secondary)] whitespace-pre-wrap break-all',
              !expanded && isLong && 'line-clamp-3'
            )}
          >
            {formattedValue}
          </pre>
          {isLong && (
            <span className="mt-1 block text-[10px] text-[var(--platform-text-muted)]">
              {expanded ? 'Click to collapse' : 'Click to expand'}
            </span>
          )}
        </button>
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-3 text-[10px] text-[var(--platform-text-muted)]">
        <span>Created {formatTimestamp(memory.created_at)}</span>
        <span>Updated {formatTimestamp(memory.updated_at)}</span>
      </div>
    </div>
  )
}

export default function AgentMemoryPage({
  params,
}: {
  params: Promise<{ agentType: string }>
}) {
  const { agentType: agentTypeParam } = use(params)
  const agentType = agentTypeParam as AgentType

  const [storeId, setStoreId] = useState<string | null>(null)
  const [memories, setMemories] = useState<AgentMemory[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  const isValidAgent = AGENT_TYPES.includes(agentType)
  const agentName = isValidAgent ? AGENT_DISPLAY_NAMES[agentType] : 'Unknown Agent'
  const colors = isValidAgent ? AGENT_COLORS[agentType] : AGENT_COLORS.support

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // Fetch store ID
  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => setStoreId(d.storeId))
      .catch(() => {})
  }, [])

  // Fetch memories
  const fetchMemories = useCallback(async () => {
    if (!storeId || !isValidAgent) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/agents/memory?agent_type=${agentType}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to fetch memories')
      }
      const data = await res.json()
      setMemories(data.memories || [])
      setCount(data.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch memories')
    } finally {
      setLoading(false)
    }
  }, [storeId, agentType, isValidAgent])

  useEffect(() => {
    if (storeId) fetchMemories()
  }, [storeId, fetchMemories])

  // Delete memory
  const handleDelete = useCallback(
    async (memoryId: string) => {
      setDeletingIds((prev) => new Set(prev).add(memoryId))

      try {
        const res = await fetch(`/api/agents/memory/${memoryId}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to delete memory')
        }
        setMemories((prev) => prev.filter((m) => m.id !== memoryId))
        setCount((prev) => prev - 1)
        showToast('Memory deleted')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to delete')
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev)
          next.delete(memoryId)
          return next
        })
      }
    },
    [showToast]
  )

  // Group memories by type
  const grouped = memories.reduce<Record<MemoryType, AgentMemory[]>>(
    (acc, m) => {
      if (!acc[m.memory_type]) acc[m.memory_type] = []
      acc[m.memory_type].push(m)
      return acc
    },
    {} as Record<MemoryType, AgentMemory[]>
  )

  const memoryTypes = Object.keys(MEMORY_TYPE_LABELS) as MemoryType[]

  // Loading state
  if (loading && memories.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-1">
          <Link
            href="/platform/settings/agents"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
          >
            <ArrowLeft className="h-3 w-3" />
            Settings / Agents
          </Link>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            {agentName} Memory
          </h1>
          <p className="text-sm text-[var(--platform-text-secondary)]">
            Loading memories...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header with breadcrumb */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)]">
          <Link
            href="/platform/settings"
            className="transition-colors hover:text-[var(--platform-text-secondary)]"
          >
            Settings
          </Link>
          <span>/</span>
          <Link
            href="/platform/settings/agents"
            className="transition-colors hover:text-[var(--platform-text-secondary)]"
          >
            Agents
          </Link>
          <span>/</span>
          <span className={colors.text}>{agentName}</span>
          <span>/</span>
          <span className="text-[var(--platform-text-primary)]">Memory</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              Agent Memory
            </h1>
            <p className="text-sm text-[var(--platform-text-secondary)]">
              What the {agentName} has learned from your interactions and data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5',
                colors.border,
                colors.bg
              )}
            >
              <Brain className={cn('h-3.5 w-3.5', colors.text)} />
              <span className={cn('font-mono text-xs font-medium', colors.text)}>
                {count} {count === 1 ? 'memory' : 'memories'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && memories.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] py-16">
          <Brain className="h-10 w-10 text-[var(--platform-text-muted)] opacity-40" />
          <p className="mt-4 font-mono text-sm text-[var(--platform-text-secondary)]">
            No memories yet
          </p>
          <p className="mt-1 max-w-sm text-center text-xs text-[var(--platform-text-muted)]">
            This agent will learn from your interactions and data. Memories are formed from
            approval patterns, direct feedback, and data analysis.
          </p>
        </div>
      )}

      {/* Memory groups */}
      {memoryTypes.map((type) => {
        const typeMemories = grouped[type]
        if (!typeMemories || typeMemories.length === 0) return null

        return (
          <div key={type} className="space-y-3">
            <div className="space-y-0.5">
              <h2 className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
                {MEMORY_TYPE_LABELS[type]}
              </h2>
              <p className="text-xs text-[var(--platform-text-muted)]">
                {MEMORY_TYPE_DESCRIPTIONS[type]}
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {typeMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onDelete={handleDelete}
                  deleting={deletingIds.has(memory.id)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2 shadow-lg">
          <p className="font-mono text-xs text-[var(--platform-text-primary)]">{toast}</p>
        </div>
      )}
    </div>
  )
}
