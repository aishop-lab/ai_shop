import { AGENT_TYPES, AGENT_DESCRIPTIONS } from '@/lib/agents/constants'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import { MetricCard } from '@/components/platform/shared/metric-card'

export default function CommandCenterPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Command Center
        </h1>
        <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
          Your AI team at a glance. All agents are currently in setup mode.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total Actions" value="—" />
        <MetricCard label="Pending Approvals" value="0" />
        <MetricCard label="Active Agents" value="0 / 5" />
        <MetricCard label="This Month Cost" value="$0.00" />
      </div>

      {/* Agent Cards */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Your Agents
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_TYPES.map((type) => (
            <div
              key={type}
              className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4"
            >
              <div className="flex items-center justify-between">
                <AgentBadge agentType={type} size="md" />
                <span className="text-[10px] text-[var(--platform-text-muted)]">Not configured</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--platform-text-secondary)]">
                {AGENT_DESCRIPTIONS[type]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed placeholder */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Activity Feed
        </h2>
        <div className="rounded-lg border border-dashed border-[var(--platform-border)] p-8 text-center">
          <p className="text-sm text-[var(--platform-text-muted)]">
            No agent activity yet. Enable an agent to get started.
          </p>
        </div>
      </div>
    </div>
  )
}
