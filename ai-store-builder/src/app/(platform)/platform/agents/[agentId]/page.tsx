'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusDot } from '@/components/platform/shared/status-dot'
import { MetricCard } from '@/components/platform/shared/metric-card'
import {
  AGENT_TYPES,
  AGENT_DISPLAY_NAMES,
  AGENT_DESCRIPTIONS,
  AGENT_COLORS,
  STATUS_COLORS,
  AUTONOMY_LEVELS,
} from '@/lib/agents/constants'
import { useAgentState } from '@/lib/hooks/use-agents'
import { useActivityFeed } from '@/lib/hooks/use-activity'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'

// ---- Helpers ----

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface ChatMessage {
  role: 'agent' | 'merchant'
  content: string
}

export default function AgentWorkspacePage() {
  const params = useParams()
  const agentId = params.agentId as string

  const isValidAgent = AGENT_TYPES.includes(agentId as AgentType)
  const agentType = (isValidAgent ? agentId : 'marketing') as AgentType
  const colors = AGENT_COLORS[agentType]
  const displayName = AGENT_DISPLAY_NAMES[agentType]
  const description = AGENT_DESCRIPTIONS[agentType]

  const [activeTab, setActiveTab] = useState<'timeline' | 'chat'>('timeline')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false)
  const [isUpdatingAutonomy, setIsUpdatingAutonomy] = useState(false)
  const [actionsPage, setActionsPage] = useState(1)
  const [paginatedActions, setPaginatedActions] = useState<Array<Record<string, unknown>>>([])
  const [actionsTotalPages, setActionsTotalPages] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Fetch storeId
  useEffect(() => {
    if (!isValidAgent) return
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.storeId) setStoreId(data.storeId)
        }
      } catch {
        console.error('[AgentWorkspace] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [isValidAgent])

  // Real agent state from Supabase with real-time updates
  const { agent: agentState, isLoading: isAgentLoading } = useAgentState(storeId, agentType)

  // Real activity feed from Supabase with real-time updates
  const { actions: realtimeActions, isLoading: isActivityLoading } = useActivityFeed(storeId, {
    agentType,
    limit: 20,
  })

  // Fetch paginated actions via API (for "Load more")
  const fetchActions = useCallback(
    async (page: number, append: boolean = false) => {
      if (!agentState?.id) return
      setIsLoadingMore(true)
      try {
        const response = await fetch(
          `/api/agents/${agentState.id}/actions?page=${page}&limit=20`
        )
        if (response.ok) {
          const data = await response.json()
          if (append) {
            setPaginatedActions((prev) => [...prev, ...(data.actions || [])])
          } else {
            setPaginatedActions(data.actions || [])
          }
          setActionsTotalPages(data.totalPages || 1)
        }
      } catch {
        console.error('[AgentWorkspace] Failed to fetch actions')
      } finally {
        setIsLoadingMore(false)
      }
    },
    [agentState?.id]
  )

  // Use realtime actions as the primary source; paginated for "load more"
  // When realtime actions load, sync paginated list
  useEffect(() => {
    if (realtimeActions.length > 0 && paginatedActions.length === 0) {
      setPaginatedActions(realtimeActions as unknown as Array<Record<string, unknown>>)
    }
  }, [realtimeActions, paginatedActions.length])

  // Initial paginated fetch when agent state loads
  useEffect(() => {
    if (agentState?.id) {
      fetchActions(1)
    }
  }, [agentState?.id, fetchActions])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Validate agentId — rendered after all hooks
  if (!isValidAgent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="font-mono text-sm text-[var(--platform-text-muted)]">Agent not found</p>
          <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
            Valid agents: {AGENT_TYPES.join(', ')}
          </p>
        </div>
      </div>
    )
  }

  const status = agentState?.status ?? 'idle'
  const statusColors = STATUS_COLORS[status]
  const autonomyLevel = agentState?.autonomy_level ?? 3
  const autonomyInfo = AUTONOMY_LEVELS[autonomyLevel]
  const enabled = agentState?.is_enabled ?? false

  // Merge realtime actions into paginated list (realtime prepends new ones)
  const displayActions = (() => {
    if (paginatedActions.length === 0) {
      return realtimeActions as unknown as Array<Record<string, unknown>>
    }
    // Merge: realtime actions that are newer than the first paginated action
    const paginatedIds = new Set(paginatedActions.map((a) => a.id))
    const newFromRealtime = (realtimeActions as unknown as Array<Record<string, unknown>>).filter(
      (a) => !paginatedIds.has(a.id as string)
    )
    return [...newFromRealtime, ...paginatedActions]
  })()

  // ---- Enable/Disable Toggle ----
  async function handleToggleEnabled() {
    if (!agentState?.id || isTogglingEnabled) return
    setIsTogglingEnabled(true)
    try {
      const response = await fetch(`/api/agents/${agentState.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !enabled }),
      })
      if (!response.ok) {
        console.error('[AgentWorkspace] Failed to toggle agent')
      }
      // Real-time subscription will update the state automatically
    } catch {
      console.error('[AgentWorkspace] Failed to toggle agent')
    } finally {
      setIsTogglingEnabled(false)
    }
  }

  // ---- Autonomy Level Change ----
  async function handleAutonomyChange(newLevel: AutonomyLevel) {
    if (!agentState?.id || isUpdatingAutonomy || newLevel === autonomyLevel) return
    setIsUpdatingAutonomy(true)
    try {
      const response = await fetch(`/api/agents/${agentState.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autonomy_level: newLevel }),
      })
      if (!response.ok) {
        console.error('[AgentWorkspace] Failed to update autonomy level')
      }
    } catch {
      console.error('[AgentWorkspace] Failed to update autonomy level')
    } finally {
      setIsUpdatingAutonomy(false)
    }
  }

  // ---- Streaming Chat ----
  async function handleSendMessage() {
    const trimmed = chatInput.trim()
    if (!trimmed || isStreaming || !agentState?.id) return

    const userMessage: ChatMessage = { role: 'merchant', content: trimmed }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setIsStreaming(true)

    // Build messages array for the API (map merchant -> user, agent -> assistant)
    const apiMessages = [...chatMessages, userMessage].map((m) => ({
      role: m.role === 'merchant' ? 'user' : 'assistant',
      content: m.content,
    }))

    try {
      const response = await fetch(`/api/agents/${agentState.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        const errMsg = errData.error || 'Failed to get response'
        setChatMessages((prev) => [
          ...prev,
          { role: 'agent', content: `Error: ${errMsg}` },
        ])
        setIsStreaming(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'agent', content: 'Error: No response stream' },
        ])
        setIsStreaming(false)
        return
      }

      const decoder = new TextDecoder()
      let assistantContent = ''

      // Add a placeholder message for the assistant
      setChatMessages((prev) => [...prev, { role: 'agent', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          // AI SDK UI stream protocol: text chunks are prefixed with "0:"
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2))
              assistantContent += text
              // Update the last message (the assistant placeholder)
              setChatMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'agent',
                  content: assistantContent,
                }
                return updated
              })
            } catch {
              // Ignore parse errors on partial chunks
            }
          }
        }
      }

      // If we got no content at all, show a fallback
      if (!assistantContent) {
        setChatMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'agent',
            content: 'No response received.',
          }
          return updated
        })
      }
    } catch (err) {
      console.error('[AgentWorkspace] Chat error:', err)
      setChatMessages((prev) => [
        ...prev.filter((m) => m.content !== ''), // Remove empty placeholder if exists
        { role: 'agent', content: 'Error: Failed to connect to agent.' },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  // ---- Load More Actions ----
  function handleLoadMore() {
    if (isLoadingMore || actionsPage >= actionsTotalPages) return
    const nextPage = actionsPage + 1
    setActionsPage(nextPage)
    fetchActions(nextPage, true)
  }

  // ---- Loading State ----
  if (isAgentLoading && !agentState) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--platform-text-muted)]" />
          <p className="font-mono text-sm text-[var(--platform-text-muted)]">Loading agent...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Agent color dot indicator */}
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', colors.bg, colors.border)}>
            <span className={cn('h-2.5 w-2.5 rounded-full', colors.dot)} />
          </div>
          <div>
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              {displayName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusDot status={status} size="sm" />
              <span className={cn('text-xs', statusColors.text)}>{statusColors.label}</span>
              <span className="text-[var(--platform-border)]">·</span>
              <span className="text-xs text-[var(--platform-text-muted)]">
                Level {autonomyLevel} — {autonomyInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Enable / Disable toggle */}
        <button
          type="button"
          onClick={handleToggleEnabled}
          disabled={isTogglingEnabled || !agentState}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            isTogglingEnabled && 'opacity-50 cursor-not-allowed',
            enabled
              ? 'border-[var(--platform-border)] text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]'
              : cn('border-transparent text-white', colors.bg, 'hover:opacity-80')
          )}
        >
          {isTogglingEnabled ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 rounded-full',
                enabled ? 'bg-[var(--platform-status-active)]' : 'bg-zinc-500'
              )}
            />
          )}
          {enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-0">
          {/* Tab bar */}
          <div className="flex gap-0 border-b border-[var(--platform-border)]">
            {(['timeline', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px',
                  activeTab === tab
                    ? cn('border-[var(--platform-accent)] text-[var(--platform-text-primary)]')
                    : 'border-transparent text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)]'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Timeline tab */}
          {activeTab === 'timeline' && (
            <div className="rounded-b-lg border border-t-0 border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-3 min-h-64">
              {isActivityLoading && displayActions.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-[var(--platform-text-muted)]" />
                    <p className="text-xs text-[var(--platform-text-muted)]">Loading activity...</p>
                  </div>
                </div>
              ) : displayActions.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-xs text-[var(--platform-text-muted)]">No activity yet</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[var(--platform-border)]">
                    {displayActions.map((action, idx) => (
                      <div key={action.id as string} className="flex gap-3 py-3">
                        {/* Timeline dot + line */}
                        <div className="flex flex-col items-center pt-1">
                          <div className={cn('h-2 w-2 flex-shrink-0 rounded-full', colors.dot)} />
                          {idx < displayActions.length - 1 && (
                            <div className="mt-1 w-px flex-1 bg-[var(--platform-border)]" />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">
                              {formatTimeAgo(action.created_at as string)}
                            </span>
                            <span
                              className={cn(
                                'rounded-full border px-1.5 py-px font-mono text-[9px]',
                                action.status === 'completed'
                                  ? 'border-[var(--platform-status-active)]/20 text-[var(--platform-status-active)]'
                                  : action.status === 'requires_approval'
                                    ? 'border-[var(--platform-status-approval)]/20 text-[var(--platform-status-approval)]'
                                    : 'border-[var(--platform-status-error)]/20 text-[var(--platform-status-error)]'
                              )}
                            >
                              {action.status as string}
                            </span>
                            <span className="font-mono text-[9px] text-[var(--platform-text-muted)] uppercase tracking-wide">
                              {action.execution_mode as string}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--platform-text-secondary)]">
                            {action.summary as string}
                          </p>
                          {(action.duration_ms as number) > 0 && (
                            <p className="mt-0.5 font-mono text-[10px] text-[var(--platform-text-muted)]">
                              {(action.duration_ms as number) < 1000
                                ? `${action.duration_ms}ms`
                                : `${((action.duration_ms as number) / 1000).toFixed(1)}s`}
                              {(action.estimated_cost_usd as number) > 0 && (
                                <> · ${(action.estimated_cost_usd as number).toFixed(4)}</>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load more button */}
                  {actionsPage < actionsTotalPages && (
                    <div className="flex justify-center pt-3 pb-1">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="flex items-center gap-1.5 rounded-md border border-[var(--platform-border)] px-3 py-1.5 text-[10px] font-medium text-[var(--platform-text-muted)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-secondary)] transition-colors disabled:opacity-50"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load more'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Chat tab */}
          {activeTab === 'chat' && (
            <div className="rounded-b-lg border border-t-0 border-[var(--platform-border)] bg-[var(--platform-surface)] flex flex-col min-h-64">
              {/* Messages */}
              <div ref={chatContainerRef} className="flex-1 space-y-3 p-4 max-h-[500px] overflow-y-auto">
                {chatMessages.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-xs text-[var(--platform-text-muted)]">
                      {enabled
                        ? `Start a conversation with ${displayName.replace(' Agent', '')}...`
                        : `Enable ${displayName.replace(' Agent', '')} to start chatting`}
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn('flex', msg.role === 'merchant' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                        msg.role === 'agent'
                          ? cn('rounded-tl-sm border', colors.bg, colors.border, colors.text)
                          : 'rounded-tr-sm border border-[var(--platform-accent)]/20 bg-[var(--platform-accent)]/10 text-[var(--platform-text-primary)]'
                      )}
                    >
                      {msg.role === 'agent' && (
                        <p className={cn('mb-1 font-mono text-[9px] uppercase tracking-wider opacity-70', colors.text)}>
                          {displayName.replace(' Agent', '')}
                        </p>
                      )}
                      {msg.content || (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="opacity-60">Thinking...</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-[var(--platform-border)] p-3">
                <div className="flex items-center gap-2 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 focus-within:border-[var(--platform-border-hover)]">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      enabled
                        ? `Ask ${displayName.replace(' Agent', '')}...`
                        : 'Enable agent to chat'
                    }
                    aria-label={`Chat with ${displayName}`}
                    disabled={!enabled || isStreaming}
                    className="flex-1 bg-transparent text-xs text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] outline-none disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!enabled || isStreaming || !chatInput.trim()}
                    className="flex h-5 w-5 items-center justify-center rounded text-[var(--platform-text-muted)] hover:text-[var(--platform-accent)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-4">
          {/* Metrics */}
          <div>
            <h2 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Metrics
            </h2>
            <div className="space-y-2">
              <MetricCard label="Total Actions" value={agentState?.total_actions ?? 0} />
              <MetricCard label="Approvals Requested" value={agentState?.total_approvals_requested ?? 0} />
              <MetricCard label="Errors" value={agentState?.error_count ?? 0} />
            </div>
          </div>

          {/* Autonomy Config */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-3">
            <h2 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Autonomy Level
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-2xl font-bold text-[var(--platform-text-primary)]">
                {autonomyLevel}
              </span>
              <span className={cn('text-sm font-medium', colors.text)}>
                {autonomyInfo.label}
              </span>
              {isUpdatingAutonomy && (
                <Loader2 className="h-3 w-3 animate-spin text-[var(--platform-text-muted)]" />
              )}
            </div>
            {/* Level indicators — clickable */}
            <div className="flex gap-1 mb-2">
              {([1, 2, 3, 4, 5] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleAutonomyChange(lvl)}
                  disabled={isUpdatingAutonomy || !agentState}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors cursor-pointer hover:opacity-80 disabled:cursor-not-allowed',
                    lvl <= autonomyLevel ? colors.dot : 'bg-[var(--platform-border)]'
                  )}
                  title={`Level ${lvl} — ${AUTONOMY_LEVELS[lvl].label}`}
                />
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--platform-text-muted)]">
              {autonomyInfo.description}
            </p>
          </div>

          {/* Quick Info */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-3 space-y-3">
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Info
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-[var(--platform-text-muted)]">Last Active</p>
                <p className="font-mono text-xs text-[var(--platform-text-secondary)]">
                  {agentState?.last_action_at
                    ? formatTimeAgo(agentState.last_action_at)
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--platform-text-muted)]">Description</p>
                <p className="text-xs leading-relaxed text-[var(--platform-text-secondary)]">
                  {description}
                </p>
              </div>
              {agentState?.last_error && (
                <div>
                  <p className="text-[10px] text-[var(--platform-status-error)]">Last Error</p>
                  <p className="text-xs text-[var(--platform-status-error)] opacity-80">
                    {agentState.last_error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
