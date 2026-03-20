// src/app/(platform)/platform/analytics/page.tsx
'use client'

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
  Instagram,
  Package,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import type { AgentType } from '@/lib/agents/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Metric {
  label: string
  value: string
  change: number
  positiveIsUp: boolean // false means lower is better (e.g. abandonment rate)
  icon: React.ReactNode
}

interface Insight {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  agentType: AgentType
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const REVENUE_DATA = [
  { day: 'Mon', revenue: 52000 },
  { day: 'Tue', revenue: 68000 },
  { day: 'Wed', revenue: 45000 },
  { day: 'Thu', revenue: 72000 },
  { day: 'Fri', revenue: 89000 },
  { day: 'Sat', revenue: 95000 },
  { day: 'Sun', revenue: 51500 },
]

const ORDER_STATUS_DATA = [
  { status: 'Delivered', count: 28, color: '#4ade80' },
  { status: 'Shipped', count: 34, color: '#a78bfa' },
  { status: 'Processing', count: 8, color: '#fbbf24' },
  { status: 'Confirmed', count: 12, color: '#60a5fa' },
  { status: 'Cancelled', count: 7, color: '#f87171' },
]

const METRICS: Metric[] = [
  {
    label: 'Revenue',
    value: '₹4,72,500',
    change: 23,
    positiveIsUp: true,
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    label: 'Orders',
    value: '89',
    change: 12,
    positiveIsUp: true,
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    label: 'Avg Order Value',
    value: '₹5,309',
    change: 8,
    positiveIsUp: true,
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    label: 'Conversion Rate',
    value: '3.2%',
    change: -0.5,
    positiveIsUp: true,
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    label: 'Cart Abandonment',
    value: '34%',
    change: -2,
    positiveIsUp: false, // lower abandonment = good
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    label: 'Active Customers',
    value: '234',
    change: 15,
    positiveIsUp: true,
    icon: <Users className="h-4 w-4" />,
  },
]

const INSIGHTS: Insight[] = [
  {
    id: '1',
    icon: <TrendingUp className="h-4 w-4 text-amber-400" />,
    title: 'Revenue up 23% this week',
    description: 'Driven by the Diwali Sale campaign. Marketing Agent ran 3 targeted email sequences.',
    agentType: 'analytics',
  },
  {
    id: '2',
    icon: <Instagram className="h-4 w-4 text-amber-400" />,
    title: '3× traffic spike from Instagram',
    description: 'Unusual referral surge detected. Likely from an influencer mention — investigate and engage.',
    agentType: 'analytics',
  },
  {
    id: '3',
    icon: <Package className="h-4 w-4 text-emerald-400" />,
    title: "'Silver Jhumka' is trending",
    description: '23 units sold in 48 hours — top performer this week. Consider restocking before weekend.',
    agentType: 'sales',
  },
  {
    id: '4',
    icon: <AlertTriangle className="h-4 w-4 text-emerald-400" />,
    title: '34% cart abandonment rate',
    description: 'Recovery emails sent to 5 high-value carts (₹2,000+). Follow-up scheduled in 24 hours.',
    agentType: 'sales',
  },
  {
    id: '5',
    icon: <Search className="h-4 w-4 text-cyan-400" />,
    title: 'SEO score improved to 82/100',
    description: 'Meta descriptions auto-updated for 12 products. Structured data added to 8 product pages.',
    agentType: 'technical',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRevenue(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value}`
}

// ---------------------------------------------------------------------------
// Custom Tooltip for AreaChart
// ---------------------------------------------------------------------------

interface RevenueTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
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
        {formatRevenue(payload[0].value)}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom Tooltip for BarChart
// ---------------------------------------------------------------------------

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
// MetricCard (local, analytics-specific)
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
          {metric.change}% vs last week
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
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
          Last 7 days · Updated 5 min ago
        </p>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {METRICS.map((metric) => (
          <AnalyticsMetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5">
          <div className="mb-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Revenue — Last 7 Days
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-[var(--platform-text-primary)]">
              ₹4,72,500
            </p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                tickFormatter={formatRevenue}
                width={40}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'var(--platform-border)', strokeWidth: 1 }} />
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
        </div>

        {/* Orders by Status Chart */}
        <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5">
          <div className="mb-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Orders by Status
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-[var(--platform-text-primary)]">
              89 total
            </p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={ORDER_STATUS_DATA}
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
                {ORDER_STATUS_DATA.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Insights */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
            Agent Insights
          </h2>
          <AgentBadge agentType="analytics" size="sm" />
        </div>
        <div className="space-y-3">
          {INSIGHTS.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  )
}
