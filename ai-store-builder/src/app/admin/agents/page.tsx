'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminStatsCard } from '@/components/admin/admin-stats-card'
import {
  Bot,
  AlertTriangle,
  Clock,
  Zap,
  Loader2,
  ArrowLeft,
  DollarSign,
} from 'lucide-react'
import { AGENT_TYPES, AGENT_DISPLAY_NAMES, AGENT_COLORS } from '@/lib/agents/constants'
import type { AgentType } from '@/lib/agents/types'
import { format } from 'date-fns'

interface AgentHealthData {
  summary: {
    totalActive: number
    errored: number
    pendingApprovals: number
    actions24h: number
  }
  byType: Array<{
    agentType: AgentType
    activeCount: number
    errorCount: number
    actionCount7d: number
  }>
  recentErrors: Array<{
    agentType: AgentType
    storeId: string
    error: string | null
    errorCount: number
    updatedAt: string
  }>
  costs: {
    totalMonthly: number
    byAgent: Record<string, number>
    topStores: Array<{ storeId: string; cost: number }>
  }
}

function getHealthStatus(actionCount: number, errorCount: number): { label: string; color: string } {
  if (actionCount === 0 && errorCount === 0) {
    return { label: 'No Activity', color: 'text-zinc-400' }
  }
  const errorRate = actionCount > 0 ? (errorCount / actionCount) * 100 : (errorCount > 0 ? 100 : 0)
  if (errorRate > 15) {
    return { label: 'Critical', color: 'text-red-400' }
  }
  if (errorRate >= 5) {
    return { label: 'Warning', color: 'text-amber-400' }
  }
  return { label: 'Healthy', color: 'text-green-400' }
}

function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id
}

export default function AgentHealthDashboardPage() {
  const [data, setData] = useState<AgentHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/agents')
        if (!res.ok) {
          throw new Error('Failed to fetch agent health data')
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Unable to load agent health data</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  const summary = data!.summary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Admin
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Agent Health Dashboard</h1>
          <p className="text-muted-foreground">Platform-wide agent metrics and health status</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStatsCard
          title="Total Active Agents"
          value={summary.totalActive}
          description="Enabled across all stores"
          icon={Bot}
          iconColor="text-green-600"
        />
        <AdminStatsCard
          title="Agents with Errors"
          value={summary.errored}
          description="Currently in error state"
          icon={AlertTriangle}
          iconColor="text-red-600"
        />
        <AdminStatsCard
          title="Pending Approvals"
          value={summary.pendingApprovals}
          description="Awaiting merchant action"
          icon={Clock}
          iconColor="text-amber-600"
        />
        <AdminStatsCard
          title="Total Actions (24h)"
          value={summary.actions24h}
          description="Actions executed today"
          icon={Zap}
          iconColor="text-purple-600"
        />
      </div>

      {/* Agent Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Type Breakdown</CardTitle>
          <CardDescription>Health and activity by agent type (last 7 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Agent</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Active Instances</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions (7d)</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Errors (7d)</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {data!.byType.map((row) => {
                  const colors = AGENT_COLORS[row.agentType]
                  const health = getHealthStatus(row.actionCount7d, row.errorCount)
                  return (
                    <tr key={row.agentType} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          <span className="font-medium">{AGENT_DISPLAY_NAMES[row.agentType]}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 tabular-nums">{row.activeCount}</td>
                      <td className="text-right py-3 px-2 tabular-nums">{row.actionCount7d}</td>
                      <td className="text-right py-3 px-2 tabular-nums">{row.errorCount}</td>
                      <td className="text-right py-3 px-2">
                        <span className={`font-medium ${health.color}`}>
                          {health.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Agent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Agent Errors</CardTitle>
          <CardDescription>Latest errors across all agent instances</CardDescription>
        </CardHeader>
        <CardContent>
          {!data!.recentErrors.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No agent errors recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Agent</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Store ID</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Error</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Count</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Last Occurred</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.recentErrors.map((err, idx) => {
                    const colors = AGENT_COLORS[err.agentType]
                    return (
                      <tr key={`${err.storeId}-${err.agentType}-${idx}`} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            {AGENT_DISPLAY_NAMES[err.agentType]}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                          {truncateId(err.storeId)}
                        </td>
                        <td className="py-3 px-2 max-w-xs truncate text-muted-foreground">
                          {err.error || 'Unknown error'}
                        </td>
                        <td className="text-right py-3 px-2 tabular-nums font-medium text-red-400">
                          {err.errorCount}
                        </td>
                        <td className="text-right py-3 px-2 text-muted-foreground whitespace-nowrap">
                          {format(new Date(err.updatedAt), 'MMM dd, h:mm a')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LLM Cost Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              LLM Cost Summary (This Month)
            </CardTitle>
            <CardDescription>
              Total: ${data!.costs.totalMonthly.toFixed(4)} USD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {AGENT_TYPES.map((agentType) => {
                const cost = data!.costs.byAgent[agentType] || 0
                const colors = AGENT_COLORS[agentType]
                const maxCost = Math.max(...Object.values(data!.costs.byAgent), 0.001)
                const widthPercent = (cost / maxCost) * 100
                return (
                  <div key={agentType} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        <span>{AGENT_DISPLAY_NAMES[agentType]}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">${cost.toFixed(4)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.dot}`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Stores by LLM Cost</CardTitle>
            <CardDescription>Highest spending stores this month</CardDescription>
          </CardHeader>
          <CardContent>
            {!data!.costs.topStores.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No cost data available</p>
            ) : (
              <div className="space-y-3">
                {data!.costs.topStores.map((store, index) => (
                  <div
                    key={store.storeId}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}
                      </span>
                      <span className="font-mono text-sm">{truncateId(store.storeId)}</span>
                    </div>
                    <span className="font-semibold text-sm font-mono">
                      ${store.cost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
