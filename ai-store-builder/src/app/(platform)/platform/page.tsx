// src/app/(platform)/platform/page.tsx
'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AgentCard } from '@/components/platform/command-center/agent-card'
import { ActivityFeed } from '@/components/platform/command-center/activity-feed'
import { ApprovalSummary } from '@/components/platform/command-center/approval-summary'
import { QuickStats } from '@/components/platform/command-center/quick-stats'
import {
  MOCK_AGENT_STATES,
  MOCK_ACTIVITY_FEED,
  MOCK_APPROVALS,
  getEnabledAgentCount,
  getPendingApprovalCount,
  getTotalActions,
} from '@/lib/agents/mock-data'
import { AGENT_TYPES } from '@/lib/agents/constants'

export default function CommandCenterPage() {
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
      <QuickStats
        totalActions={getTotalActions()}
        pendingApprovals={getPendingApprovalCount()}
        activeAgents={getEnabledAgentCount()}
        totalAgents={AGENT_TYPES.length}
        monthlyCost={3.52}
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
          <ActivityFeed actions={MOCK_ACTIVITY_FEED} maxItems={6} />
        </div>

        {/* Approval Queue — 1 column */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Pending Approvals
            </h2>
            {getPendingApprovalCount() > 0 && (
              <Link
                href="/platform/approvals"
                className="flex items-center gap-1 text-[10px] text-[var(--platform-accent)] hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <ApprovalSummary approvals={MOCK_APPROVALS} maxItems={3} />
        </div>
      </div>

      {/* Agent Cards */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Your Agents
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MOCK_AGENT_STATES.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  )
}
