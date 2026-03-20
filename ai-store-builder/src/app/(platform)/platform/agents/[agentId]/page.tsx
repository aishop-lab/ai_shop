'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Send } from 'lucide-react'
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
import {
  MOCK_ACTIVITY_FEED,
  getAgentState,
  formatTimeAgo,
} from '@/lib/agents/mock-data'
import type { AgentType } from '@/lib/agents/types'

// --- Mock chat messages for each agent ---
const MOCK_CHAT: Record<AgentType, { role: 'agent' | 'merchant'; content: string }[]> = {
  support: [
    { role: 'agent', content: 'I resolved 3 customer tickets this morning. One was about a shipping delay on order #1847 — I sent Priya an updated tracking link and a small apology note.' },
    { role: 'merchant', content: 'Great. Any refund requests pending?' },
    { role: 'agent', content: 'Yes — one from Rajesh for ₹2,499 on order #1823. He received a damaged ceramic vase. I have the photos he sent. I recommend approving the refund; it falls under transit damage policy.' },
  ],
  sales: [
    { role: 'agent', content: 'I sent cart recovery emails to 5 abandoned carts with a 10% discount. Two have already converted — ₹3,840 recovered so far.' },
    { role: 'merchant', content: 'Nice. Should we increase the discount for high-value carts?' },
    { role: 'agent', content: 'I\'d suggest 15% for carts above ₹2,000. Based on last month\'s data, that threshold gives us the best conversion-to-margin ratio. Want me to set that up?' },
  ],
  analytics: [
    { role: 'agent', content: 'Today\'s digest: Revenue is ₹47,500, up 23% vs last Tuesday. I also detected a 3x traffic spike from Instagram — likely an organic mention by a creator.' },
    { role: 'merchant', content: 'Which product was getting traction?' },
    { role: 'agent', content: 'The handwoven cotton throw blanket (SKU: BLK-001). It had 214 views in 2 hours vs the usual 12/day. Stock is at 8 units — you may want to consider restocking soon.' },
  ],
  marketing: [
    { role: 'agent', content: 'I\'m ready to start once you enable me. I\'ve already drafted a Diwali campaign strategy based on your product catalog and last year\'s performance data.' },
    { role: 'merchant', content: 'What\'s the plan?' },
    { role: 'agent', content: 'Three-phase: pre-sale teaser (email + WhatsApp), live sale with countdown (Meta ads), and post-sale thank you + review ask. Estimated reach: 1,200 existing customers + ~800 cold audience.' },
  ],
  technical: [
    { role: 'agent', content: 'I updated meta descriptions for 12 products that were missing SEO tags. Estimated improvement: 8-12% in click-through rate from search results.' },
    { role: 'merchant', content: 'Can you check the site speed too?' },
    { role: 'agent', content: 'Already on it. I ran a Lighthouse audit — mobile performance score is 71. The biggest gains would come from lazy-loading product images on collection pages and reducing unused CSS. I can apply both automatically.' },
  ],
}

export default function AgentWorkspacePage() {
  const params = useParams()
  const agentId = params.agentId as string

  const [activeTab, setActiveTab] = useState<'timeline' | 'chat'>('timeline')
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null)
  const [chatInput, setChatInput] = useState('')

  // Validate agentId
  if (!AGENT_TYPES.includes(agentId as AgentType)) {
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

  const agentType = agentId as AgentType
  const agentState = getAgentState(agentType)
  const colors = AGENT_COLORS[agentType]
  const displayName = AGENT_DISPLAY_NAMES[agentType]
  const description = AGENT_DESCRIPTIONS[agentType]
  const status = agentState?.status ?? 'idle'
  const statusColors = STATUS_COLORS[status]
  const autonomyLevel = agentState?.autonomy_level ?? 3
  const autonomyInfo = AUTONOMY_LEVELS[autonomyLevel]
  const enabled = isEnabled ?? agentState?.is_enabled ?? false

  // Filter activity feed for this agent
  const agentActivity = MOCK_ACTIVITY_FEED.filter((a) => a.agent_type === agentType)
  const mockChat = MOCK_CHAT[agentType]

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
          onClick={() => setIsEnabled(!enabled)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            enabled
              ? 'border-[var(--platform-border)] text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]'
              : cn('border-transparent text-white', colors.bg, 'hover:opacity-80')
          )}
        >
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              enabled ? 'bg-[var(--platform-status-active)]' : 'bg-zinc-500'
            )}
          />
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
              {agentActivity.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-xs text-[var(--platform-text-muted)]">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--platform-border)]">
                  {agentActivity.map((action, idx) => (
                    <div key={action.id} className="flex gap-3 py-3">
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center pt-1">
                        <div className={cn('h-2 w-2 flex-shrink-0 rounded-full', colors.dot)} />
                        {idx < agentActivity.length - 1 && (
                          <div className="mt-1 w-px flex-1 bg-[var(--platform-border)]" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">
                            {formatTimeAgo(action.created_at)}
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
                            {action.status}
                          </span>
                          <span className="font-mono text-[9px] text-[var(--platform-text-muted)] uppercase tracking-wide">
                            {action.execution_mode}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--platform-text-secondary)]">
                          {action.summary}
                        </p>
                        {action.duration_ms && (
                          <p className="mt-0.5 font-mono text-[10px] text-[var(--platform-text-muted)]">
                            {action.duration_ms < 1000
                              ? `${action.duration_ms}ms`
                              : `${(action.duration_ms / 1000).toFixed(1)}s`}
                            {action.estimated_cost_usd > 0 && (
                              <> · ${action.estimated_cost_usd.toFixed(4)}</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat tab */}
          {activeTab === 'chat' && (
            <div className="rounded-b-lg border border-t-0 border-[var(--platform-border)] bg-[var(--platform-surface)] flex flex-col min-h-64">
              {/* Messages */}
              <div className="flex-1 space-y-3 p-4">
                {mockChat.map((msg, idx) => (
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
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input bar */}
              <div className="border-t border-[var(--platform-border)] p-3">
                <div className="flex items-center gap-2 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 focus-within:border-[var(--platform-border-hover)]">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Ask ${displayName.replace(' Agent', '')}...`}
                    className="flex-1 bg-transparent text-xs text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setChatInput('')
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setChatInput('')}
                    className="flex h-5 w-5 items-center justify-center rounded text-[var(--platform-text-muted)] hover:text-[var(--platform-accent)] transition-colors"
                  >
                    <Send className="h-3 w-3" />
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
            </div>
            {/* Level indicators */}
            <div className="flex gap-1 mb-2">
              {([1, 2, 3, 4, 5] as const).map((lvl) => (
                <div
                  key={lvl}
                  className={cn(
                    'h-1 flex-1 rounded-full',
                    lvl <= autonomyLevel ? colors.dot : 'bg-[var(--platform-border)]'
                  )}
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
