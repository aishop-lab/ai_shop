'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  Users,
  Package,
  Loader2,
  ArrowRight,
  Lightbulb,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InsightData {
  revenue: {
    current: number
    previous: number
    changePercent: number
  }
  orders: {
    current: number
    previous: number
    changePercent: number
  }
  topProducts: Array<{ title: string; revenue: number; quantity: number }>
  abandonedCarts: { rate: number; count: number; value: number }
  lowStockProducts: number
  newCustomers: number
  anomalies: Array<{ metric: string; message: string; severity: 'info' | 'warning' | 'critical' }>
}

interface Insight {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  type: 'positive' | 'negative' | 'warning' | 'info'
  action?: { label: string; href: string }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateInsights(data: InsightData, currency: string): Insight[] {
  const insights: Insight[] = []

  // Revenue trend
  if (data.revenue.changePercent > 10) {
    insights.push({
      id: 'revenue-up',
      icon: <TrendingUp className="h-4 w-4" />,
      title: `Revenue up ${Math.round(data.revenue.changePercent)}%`,
      description: `You're earning ${formatCurrency(data.revenue.current, currency)} this period, up from ${formatCurrency(data.revenue.previous, currency)}.`,
      type: 'positive',
    })
  } else if (data.revenue.changePercent < -10) {
    insights.push({
      id: 'revenue-down',
      icon: <TrendingDown className="h-4 w-4" />,
      title: `Revenue dropped ${Math.abs(Math.round(data.revenue.changePercent))}%`,
      description: `Consider running a promotion or enabling your Marketing Agent to boost sales.`,
      type: 'negative',
      action: { label: 'Talk to Marketing', href: '/platform/agents/marketing' },
    })
  }

  // Abandoned carts
  if (data.abandonedCarts.rate > 0.5 && data.abandonedCarts.count > 3) {
    insights.push({
      id: 'abandoned-carts',
      icon: <ShoppingCart className="h-4 w-4" />,
      title: `${data.abandonedCarts.count} abandoned carts`,
      description: `${formatCurrency(data.abandonedCarts.value, currency)} in potential revenue. Your Sales Agent can recover these automatically.`,
      type: 'warning',
      action: { label: 'Enable Cart Recovery', href: '/platform/agents/sales' },
    })
  }

  // Low stock
  if (data.lowStockProducts > 0) {
    insights.push({
      id: 'low-stock',
      icon: <Package className="h-4 w-4" />,
      title: `${data.lowStockProducts} products low on stock`,
      description: `Some products may sell out soon. Review inventory to avoid missed sales.`,
      type: 'warning',
      action: { label: 'View Products', href: '/platform/products' },
    })
  }

  // New customers
  if (data.newCustomers > 0) {
    insights.push({
      id: 'new-customers',
      icon: <Users className="h-4 w-4" />,
      title: `${data.newCustomers} new customers this week`,
      description: `Your store is growing. Consider enabling loyalty programs to retain them.`,
      type: 'positive',
      action: { label: 'View Customers', href: '/platform/customers' },
    })
  }

  // Top product insight
  if (data.topProducts.length > 0) {
    const top = data.topProducts[0]
    insights.push({
      id: 'top-product',
      icon: <TrendingUp className="h-4 w-4" />,
      title: `"${top.title}" is your bestseller`,
      description: `${top.quantity} sold for ${formatCurrency(top.revenue, currency)}. Consider promoting similar products.`,
      type: 'info',
    })
  }

  // Anomalies from analytics agent
  for (const anomaly of data.anomalies.slice(0, 2)) {
    insights.push({
      id: `anomaly-${anomaly.metric}`,
      icon: <AlertTriangle className="h-4 w-4" />,
      title: anomaly.message,
      description: `Detected by your Analytics Agent. Investigating...`,
      type: anomaly.severity === 'critical' ? 'negative' : 'warning',
      action: { label: 'View Analytics', href: '/platform/analytics' },
    })
  }

  return insights.slice(0, 4) // Max 4 insights
}

const TYPE_STYLES = {
  positive: {
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    icon: 'text-green-400',
    dot: 'bg-green-400',
  },
  negative: {
    border: 'border-red-500/20',
    bg: 'bg-red-500/5',
    icon: 'text-red-400',
    dot: 'bg-red-400',
  },
  warning: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    icon: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  info: {
    border: 'border-[var(--platform-accent)]/20',
    bg: 'bg-[var(--platform-accent)]/5',
    icon: 'text-[var(--platform-accent)]',
    dot: 'bg-[var(--platform-accent)]',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProactiveInsightsProps {
  currency: string
}

export function ProactiveInsights({ currency }: ProactiveInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const response = await fetch('/api/agents/analytics/insights?period=7d')
        if (!response.ok) {
          setLoading(false)
          return
        }
        const data = await response.json()

        // Build insights from the real analytics data
        // API shape: { revenue: { total, count, avgOrderValue, byDay }, orders: { total, byStatus },
        //   topProducts: [{ title, revenue, quantity }], customers: { total, new, returning },
        //   carts: { total, recovered, totalValue, recoveryRate },
        //   comparison: { current, previous, changes: { revenue, orders, aov } },
        //   anomalies: [{ metric, message, severity }] }
        const insightData: InsightData = {
          revenue: {
            current: data.revenue?.total ?? 0,
            previous: data.comparison?.previous?.revenue ?? 0,
            changePercent: data.comparison?.changes?.revenue ?? 0,
          },
          orders: {
            current: data.orders?.total ?? 0,
            previous: data.comparison?.previous?.orders ?? 0,
            changePercent: data.comparison?.changes?.orders ?? 0,
          },
          topProducts: (data.topProducts ?? []).slice(0, 3),
          abandonedCarts: {
            rate: data.carts?.recoveryRate ?? 0,
            count: data.carts?.total ?? 0,
            value: data.carts?.totalValue ?? 0,
          },
          lowStockProducts: 0, // Not in analytics API — would need separate query
          newCustomers: data.customers?.new ?? 0,
          anomalies: data.anomalies ?? [],
        }

        const generated = generateInsights(insightData, currency)
        setInsights(generated)
      } catch {
        // Silently fail — insights are not critical
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [currency])

  if (loading) return null
  if (insights.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
        <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Agent Insights
        </h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {insights.map((insight) => {
          const styles = TYPE_STYLES[insight.type]
          return (
            <div
              key={insight.id}
              className={cn(
                'rounded-lg border p-3.5 space-y-1.5',
                styles.border,
                styles.bg
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn('mt-0.5 shrink-0', styles.icon)}>
                  {insight.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                    {insight.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--platform-text-secondary)]">
                    {insight.description}
                  </p>
                </div>
              </div>
              {insight.action && (
                <Link
                  href={insight.action.href}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--platform-accent)] hover:underline ml-6"
                >
                  {insight.action.label}
                  <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
