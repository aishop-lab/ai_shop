// src/app/(platform)/platform/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAgentStates, getEnabledCount } from '@/lib/hooks/use-agents'
import { useActivityFeed } from '@/lib/hooks/use-activity'
import { useApprovals } from '@/lib/hooks/use-approvals'
import { AGENT_TYPES } from '@/lib/agents/constants'
import type { AgentType } from '@/lib/agents/types'

import Link from 'next/link'
import { Bot, MessageSquare, Settings, Zap } from 'lucide-react'
import { CeoBriefingHeader } from '@/components/platform/command-center/ceo-briefing-header'
import { ImpactMetricsRow } from '@/components/platform/command-center/impact-metrics-row'
import { AgentActivityTimeline } from '@/components/platform/command-center/agent-activity-timeline'
import { PendingApprovalsPanel } from '@/components/platform/command-center/pending-approvals-panel'
import { AgentHealthOverview } from '@/components/platform/command-center/agent-health-overview'
import { ProactiveInsights } from '@/components/platform/command-center/proactive-insights'
import { DailyBriefing } from '@/components/platform/command-center/daily-briefing'
import { StoreHealth } from '@/components/platform/command-center/store-health'

interface StoreInfo {
  id: string
  name: string
  blueprint?: {
    location?: {
      currency?: string
    }
  }
}

export default function CommandCenterPage() {
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)

  // Fetch merchant's store info (name, currency, id)
  useEffect(() => {
    async function fetchStoreInfo() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store) {
            setStoreInfo(data.store)
            setStoreId(data.store.id)
          }
        }
      } catch {
        console.error('[CommandCenter] Failed to fetch store info')
      }
    }
    fetchStoreInfo()
  }, [])

  // Real-time hooks
  const { agents, isLoading: agentsLoading } = useAgentStates(storeId)
  const { actions, isLoading: activityLoading } = useActivityFeed(storeId, { limit: 20 })
  const { approvals, pendingCount, isLoading: approvalsLoading, approveAction, rejectAction } = useApprovals(storeId)

  const currency = storeInfo?.blueprint?.location?.currency ?? 'INR'
  const merchantName = storeInfo?.name ?? ''

  // Derive today's impact metrics from real action data
  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const todayActions = useMemo(
    () => actions.filter((a) => new Date(a.created_at).getTime() >= todayStart),
    [actions, todayStart]
  )

  const tasksCompleted = useMemo(
    () => todayActions.filter((a) => a.status === 'completed').length,
    [todayActions]
  )

  const supportResolved = useMemo(
    () =>
      todayActions.filter(
        (a) => a.status === 'completed' && a.agent_type === 'support'
      ).length,
    [todayActions]
  )

  // Revenue recovered: sum cart values from cart-whisperer completed actions
  const revenueRecovered = useMemo(() => {
    return todayActions
      .filter(
        (a) =>
          a.status === 'completed' &&
          a.agent_type === 'sales' &&
          (a.sub_agent_type === 'cart-whisperer' ||
            a.action_type === 'cart_recovery' ||
            a.action_type === 'cart_recovered')
      )
      .reduce((sum, a) => {
        const val =
          (a.details?.recovered_amount as number) ??
          (a.details?.cart_value as number) ??
          0
        return sum + val
      }, 0)
  }, [todayActions])

  const isLoading = agentsLoading || activityLoading || approvalsLoading

  if (isLoading && agents.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <div className="h-6 w-48 animate-pulse rounded bg-[var(--platform-border)]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[var(--platform-border)]" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-[var(--platform-border)]" />
          ))}
        </div>
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--platform-accent)] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* CEO Briefing Header */}
      <CeoBriefingHeader
        merchantName={merchantName}
        tasksCompleted={tasksCompleted}
        revenueRecovered={revenueRecovered}
        supportResolved={supportResolved}
        currency={currency}
      />

      {/* Impact Metrics Row */}
      <ImpactMetricsRow
        revenueRecovered={revenueRecovered}
        tasksCompleted={tasksCompleted}
        supportResolved={supportResolved}
        activeAgents={getEnabledCount(agents)}
        totalAgents={AGENT_TYPES.length}
        currency={currency}
      />

      {/* Daily Briefing — real-time store metrics */}
      <DailyBriefing storeId={storeId} currency={currency} />

      {/* Proactive Insights from agents */}
      <ProactiveInsights currency={currency} />

      {/* Getting Started Banner — shown when no agent activity exists */}
      {actions.length === 0 && agents.every((a) => a.total_actions === 0) && (
        <div className="rounded-lg border border-[var(--platform-accent)]/20 bg-[var(--platform-accent)]/5 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--platform-accent)]/30 bg-[var(--platform-accent)]/10">
              <Zap className="h-5 w-5 text-[var(--platform-accent)]" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
                Your agents are ready
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--platform-text-secondary)]">
                Enable and configure your AI agents to start automating your business.
                Once active, agent activity, metrics, and approval requests will appear here.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pl-[52px]">
            <Link
              href="/platform/settings/agents"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--platform-accent)] bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--platform-accent-hover)]"
            >
              <Settings className="h-3.5 w-3.5" />
              Configure Agents
            </Link>
            <Link
              href="/platform/agents/support"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--platform-border)] px-4 py-2 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat with Support
            </Link>
            <Link
              href="/platform/agents/marketing"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--platform-border)] px-4 py-2 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
            >
              <Bot className="h-3.5 w-3.5" />
              Chat with Marketing
            </Link>
          </div>
        </div>
      )}

      {/* Main content: Timeline + Approvals */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agent Activity Timeline — 2 columns */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
            Agent Activity
          </h2>
          <AgentActivityTimeline actions={actions} maxItems={20} />
        </div>

        {/* Pending Approvals — 1 column */}
        <div>
          <PendingApprovalsPanel
            approvals={approvals}
            pendingCount={pendingCount}
            maxItems={4}
            onApprove={approveAction}
            onReject={rejectAction}
          />

          {/* Store Health */}
          <StoreHealth storeId={storeId} />
        </div>
      </div>

      {/* Agent Health Overview */}
      <AgentHealthOverview agents={agents} />
    </div>
  )
}
