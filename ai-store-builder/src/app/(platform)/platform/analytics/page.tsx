// src/app/(platform)/platform/analytics/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  ShoppingCart,
  Users,
  ShoppingBag,
  RefreshCw,
  FileText,
  Loader2,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useStoreCurrency } from '@/lib/hooks/use-store-currency'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import type { AgentType } from '@/lib/agents/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Metric {
  label: string
  value: string
  change: number
  positiveIsUp: boolean
  icon: React.ReactNode
}

interface Insight {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  agentType: AgentType
}

interface AnalyticsData {
  period: string
  revenue: { total: number; count: number; avgOrderValue: number; byDay: Record<string, number> }
  orders: { total: number; byStatus: Record<string, number> }
  topProducts: { id: string; name: string; units: number; revenue: number }[]
  customers: { totalCustomers: number; newCustomers: number; repeatCustomers: number; activeCustomers: number }
  carts: { total: number; recovered: number; totalValue: number; recoveryRate: number }
  comparison: { changes: { revenue: number; orders: number; aov: number } }
  anomalies: { metric: string; message: string; severity: string; direction?: string; percentChange?: number }[]
  insights: { id: string; summary: string; details: Record<string, unknown>; created_at: string }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCompactCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

// ---------------------------------------------------------------------------
// Custom Tooltips
// ---------------------------------------------------------------------------

interface RevenueTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  currency?: string
}

function RevenueTooltip({ active, payload, label, currency = 'INR' }: RevenueTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--platform-border)] px-3 py-2',
        'bg-[var(--platform-surface)] shadow-xl',
      )}
    >
      <p className="font-mono text-[10px] text-[var(--platform-text-muted)]">{label}</p>
      <p className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
        {formatCompactCurrency(payload[0].value, currency)}
      </p>
    </div>
  )
}

interface OrderTooltipProps {
  active?: boolean
  payload?: { value: number; payload: { status: string } }[]
}

function OrderTooltip({ active, payload }: OrderTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--platform-border)] px-3 py-2',
        'bg-[var(--platform-surface)] shadow-xl',
      )}
    >
      <p className="font-mono text-[10px] text-[var(--platform-text-muted)]">{payload[0].payload.status}</p>
      <p className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
        {payload[0].value} orders
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

function AnalyticsMetricCard({ metric }: { metric: Metric }) {
  const isPositiveChange = metric.positiveIsUp ? metric.change > 0 : metric.change < 0
  const isNeutral = metric.change === 0

  return (
    <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          {metric.label}
        </p>
        <span className="text-[var(--platform-text-muted)]">{metric.icon}</span>
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold text-[var(--platform-text-primary)]">
        {metric.value}
      </p>
      {!isNeutral && (
        <p
          className={cn(
            'mt-1 flex items-center gap-0.5 font-mono text-xs',
            isPositiveChange
              ? 'text-[var(--platform-status-active)]'
              : 'text-[var(--platform-status-error)]',
          )}
        >
          {isPositiveChange ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {metric.change > 0 ? '+' : ''}
          {metric.change}% vs prev period
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// InsightCard
// ---------------------------------------------------------------------------

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div
      className={cn(
        'flex gap-4 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4',
        'transition-colors hover:border-[var(--platform-border-hover)] hover:bg-[var(--platform-surface-hover)]',
      )}
    >
      <div className="mt-0.5 flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--platform-surface-hover)]">
        {insight.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
            {insight.title}
          </p>
          <AgentBadge agentType={insight.agentType} size="sm" />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--platform-text-secondary)]">
          {insight.description}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 animate-pulse">
      <div className="h-3 w-16 rounded bg-[var(--platform-surface-hover)]" />
      <div className="mt-3 h-7 w-24 rounded bg-[var(--platform-surface-hover)]" />
      <div className="mt-2 h-3 w-20 rounded bg-[var(--platform-surface-hover)]" />
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 animate-pulse">
      <div className="mb-5 space-y-2">
        <div className="h-3 w-32 rounded bg-[var(--platform-surface-hover)]" />
        <div className="h-7 w-24 rounded bg-[var(--platform-surface-hover)]" />
      </div>
      <div className="h-[180px] rounded-lg bg-zinc-800/50" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] animate-pulse overflow-hidden">
      <div className="border-b border-[var(--platform-border)] px-4 py-3">
        <div className="h-3 w-24 rounded bg-[var(--platform-surface-hover)]" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-[var(--platform-border)] px-4 py-3 last:border-0">
          <div className="h-3 w-40 rounded bg-[var(--platform-surface-hover)]" />
          <div className="ml-auto h-3 w-12 rounded bg-[var(--platform-surface-hover)]" />
          <div className="h-3 w-16 rounded bg-[var(--platform-surface-hover)]" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status colors for order chart
// ---------------------------------------------------------------------------

const ORDER_STATUS_COLORS: Record<string, string> = {
  delivered: '#4ade80',
  shipped: '#a78bfa',
  processing: '#fbbf24',
  confirmed: '#60a5fa',
  cancelled: '#f87171',
  refunded: '#f472b6',
  pending: '#94a3b8',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [generatingReport, setGeneratingReport] = useState(false)
  const { currency } = useStoreCurrency()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined'
        ? (await (window as unknown as { __supabase_token?: () => Promise<string> }).__supabase_token?.()) || ''
        : ''

      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`/api/agents/analytics/insights?period=${period}`, { headers })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateReport = async (type: 'daily_digest' | 'weekly_report') => {
    setGeneratingReport(true)
    try {
      const token = typeof window !== 'undefined'
        ? (await (window as unknown as { __supabase_token?: () => Promise<string> }).__supabase_token?.()) || ''
        : ''

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      await fetch('/api/agents/analytics/report', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type }),
      })
      // Refresh data after report generation
      await fetchData()
    } finally {
      setGeneratingReport(false)
    }
  }

  // Build metrics from data
  const metrics: Metric[] = data
    ? [
        {
          label: 'Revenue',
          value: formatCurrency(Math.round(data.revenue.total), currency),
          change: data.comparison.changes.revenue,
          positiveIsUp: true,
          icon: <TrendingUp className="h-4 w-4" />,
        },
        {
          label: 'Orders',
          value: String(data.orders.total),
          change: data.comparison.changes.orders,
          positiveIsUp: true,
          icon: <ShoppingBag className="h-4 w-4" />,
        },
        {
          label: 'Avg Order Value',
          value: formatCurrency(Math.round(data.revenue.avgOrderValue), currency),
          change: data.comparison.changes.aov,
          positiveIsUp: true,
          icon: <ShoppingCart className="h-4 w-4" />,
        },
        {
          label: 'Cart Abandonment',
          value: `${data.carts.total}`,
          change: 0,
          positiveIsUp: false,
          icon: <ShoppingCart className="h-4 w-4" />,
        },
        {
          label: 'Recovery Rate',
          value: `${Math.round(data.carts.recoveryRate * 100)}%`,
          change: 0,
          positiveIsUp: true,
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          label: 'Active Customers',
          value: String(data.customers.activeCustomers),
          change: 0,
          positiveIsUp: true,
          icon: <Users className="h-4 w-4" />,
        },
      ]
    : []

  // Build revenue chart data from byDay
  const revenueChartData = data
    ? Object.entries(data.revenue.byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, revenue]) => ({
          day: new Date(day).toLocaleDateString('en-IN', { weekday: 'short' }),
          revenue,
        }))
    : []

  // Build order status chart data
  const orderStatusData = data
    ? Object.entries(data.orders.byStatus).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        color: ORDER_STATUS_COLORS[status] || '#94a3b8',
      }))
    : []

  // Build insights from anomalies + agent actions
  const insightsList: Insight[] = []
  if (data) {
    for (const anomaly of data.anomalies) {
      insightsList.push({
        id: `anomaly-${anomaly.metric}`,
        icon: <AlertTriangle className={cn('h-4 w-4', anomaly.severity === 'critical' ? 'text-red-400' : 'text-amber-400')} />,
        title: anomaly.message,
        description: `${anomaly.severity === 'critical' ? 'Critical' : 'Warning'} — this is a statistically significant deviation from the 30-day average.`,
        agentType: 'analytics',
      })
    }
    for (const insight of data.insights.slice(0, 5 - insightsList.length)) {
      insightsList.push({
        id: insight.id,
        icon: <BarChart3 className="h-4 w-4 text-amber-400" />,
        title: insight.summary,
        description: new Date(insight.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        agentType: 'analytics',
      })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
            Last {period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}
            {data ? '' : loading ? ' · Loading...' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period switcher */}
          <div className="flex rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)]">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 font-mono text-xs transition-colors',
                  period === p
                    ? 'bg-[var(--platform-accent)] text-white'
                    : 'text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)]',
                  p === '7d' && 'rounded-l-lg',
                  p === '90d' && 'rounded-r-lg',
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-2 text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)] disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>

          <button
            onClick={() => handleGenerateReport('weekly_report')}
            disabled={generatingReport}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-2',
              'font-mono text-xs text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)]',
              'disabled:opacity-50',
            )}
          >
            {generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Generate Report
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Metrics bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)
          : metrics.map((metric) => <AnalyticsMetricCard key={metric.label} metric={metric} />)}
      </div>

      {/* Charts — show skeletons while loading */}
      {loading && !data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      )}

      {/* Top Products skeleton */}
      {loading && !data && (
        <div>
          <div className="mb-4 h-4 w-24 animate-pulse rounded bg-[var(--platform-surface-hover)]" />
          <TableSkeleton />
        </div>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5">
            <div className="mb-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                Revenue — Last {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--platform-text-primary)]">
                {formatCurrency(Math.round(data.revenue.total), currency)}
              </p>
            </div>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--platform-accent)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--platform-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="transparent" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(value: number) => formatCompactCurrency(value, currency)}
                    width={40}
                  />
                  <Tooltip content={<RevenueTooltip currency={currency} />} cursor={{ stroke: 'var(--platform-border)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--platform-accent)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--platform-accent)', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-sm text-[var(--platform-text-muted)]">
                No revenue data for this period
              </div>
            )}
          </div>

          {/* Orders by Status Chart */}
          <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5">
            <div className="mb-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                Orders by Status
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--platform-text-primary)]">
                {data.orders.total} total
              </p>
            </div>
            {orderStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={orderStatusData}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="transparent" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="status"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
                    width={72}
                  />
                  <Tooltip content={<OrderTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {orderStatusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-sm text-[var(--platform-text-muted)]">
                No order data for this period
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Products */}
      {data && data.topProducts.length > 0 && (
        <div>
          <h2 className="mb-4 font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
            Top Products
          </h2>
          <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] overflow-x-auto overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--platform-border)]">
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">Product</th>
                  <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">Units</th>
                  <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((product, i) => (
                  <tr key={product.id} className={cn(i < data.topProducts.length - 1 && 'border-b border-[var(--platform-border)]')}>
                    <td className="px-4 py-3 font-mono text-sm text-[var(--platform-text-primary)]">{product.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-[var(--platform-text-secondary)]">{product.units}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-[var(--platform-text-primary)]">{formatCurrency(Math.round(product.revenue), currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agent Insights */}
      {insightsList.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
              Agent Insights
            </h2>
            <AgentBadge agentType="analytics" size="sm" />
          </div>
          <div className="space-y-3">
            {insightsList.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.revenue.total === 0 && data.orders.total === 0 && (
        <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-8 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-[var(--platform-text-muted)]" />
          <p className="mt-3 font-mono text-sm text-[var(--platform-text-secondary)]">
            No data yet for this period. Analytics will populate as your store receives orders.
          </p>
        </div>
      )}
    </div>
  )
}
