// src/app/(platform)/platform/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAgentStates, useUpdateAgentState, getEnabledCount } from '@/lib/hooks/use-agents'
import { useActivityFeed } from '@/lib/hooks/use-activity'
import { useApprovals } from '@/lib/hooks/use-approvals'
import { AGENT_TYPES } from '@/lib/agents/constants'
import type { AgentType } from '@/lib/agents/types'

import { CeoBriefingHeader } from '@/components/platform/command-center/ceo-briefing-header'
import { ImpactMetricsRow } from '@/components/platform/command-center/impact-metrics-row'
import { AgentActivityTimeline } from '@/components/platform/command-center/agent-activity-timeline'
import { PendingApprovalsPanel } from '@/components/platform/command-center/pending-approvals-panel'
import { AgentHealthOverview } from '@/components/platform/command-center/agent-health-overview'

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
  const { updateAgent } = useUpdateAgentState()

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
        </div>
      </div>

      {/* Agent Health Overview */}
      <AgentHealthOverview agents={agents} />
    </div>
  )
}
