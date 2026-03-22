// src/app/(platform)/platform/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AgentCard } from '@/components/platform/command-center/agent-card'
import { ActivityFeed } from '@/components/platform/command-center/activity-feed'
import { ApprovalSummary } from '@/components/platform/command-center/approval-summary'
import { QuickStats } from '@/components/platform/command-center/quick-stats'
import { useAgentStates, useUpdateAgentState, getEnabledCount, getTotalActionsCount } from '@/lib/hooks/use-agents'
import { useActivityFeed } from '@/lib/hooks/use-activity'
import { useApprovals } from '@/lib/hooks/use-approvals'
import { AGENT_TYPES } from '@/lib/agents/constants'
import type { AgentType } from '@/lib/agents/types'

export default function CommandCenterPage() {
  const [storeId, setStoreId] = useState<string | null>(null)

  // Fetch the merchant's store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.storeId) setStoreId(data.storeId)
        }
      } catch {
        console.error('[CommandCenter] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Real-time hooks
  const { agents, isLoading: agentsLoading } = useAgentStates(storeId)
  const { actions, isLoading: activityLoading } = useActivityFeed(storeId, { limit: 6 })
  const { approvals, pendingCount, isLoading: approvalsLoading } = useApprovals(storeId)
  const { updateAgent } = useUpdateAgentState()

  // PL-15: Quick enable/disable toggle from home page
  const handleToggleAgent = async (agentType: string) => {
    if (!storeId) return
    const agent = agents.find((a) => a.agent_type === agentType)
    if (!agent) return
    await updateAgent(storeId, agentType as AgentType, { is_enabled: !agent.is_enabled })
  }

  const isLoading = agentsLoading || activityLoading || approvalsLoading

  if (isLoading && agents.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Command Center
          </h1>
          <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
            Loading your AI team...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--platform-accent)] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Command Center
        </h1>
        <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
          Your AI team at a glance
        </p>
      </div>

      {/* Quick Stats */}
      {/* TODO: Calculate from actual usage */}
      <QuickStats
        totalActions={getTotalActionsCount(agents)}
        pendingApprovals={pendingCount}
        activeAgents={getEnabledCount(agents)}
        totalAgents={AGENT_TYPES.length}
        monthlyCost={0}
      />

      {/* Two-column layout: Activity Feed + Approvals */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed — 2 columns */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Recent Activity
            </h2>
          </div>
          <ActivityFeed actions={actions} maxItems={6} />
        </div>

        {/* Approval Queue — 1 column */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Pending Approvals
            </h2>
            {pendingCount > 0 && (
              <Link
                href="/platform/approvals"
                className="flex items-center gap-1 text-[10px] text-[var(--platform-accent)] hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <ApprovalSummary approvals={approvals} maxItems={3} />
        </div>
      </div>

      {/* Agent Cards */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Your Agents
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onToggleEnabled={handleToggleAgent} />
          ))}
        </div>
      </div>
    </div>
  )
}
