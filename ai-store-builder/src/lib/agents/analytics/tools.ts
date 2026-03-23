// src/lib/agents/analytics/tools.ts
// Analytics Agent tool definitions

import { z } from 'zod'
import type { AgentToolConfig } from '../base-agent'
import {
  queryRevenue,
  queryOrders,
  queryTopProducts,
  queryCustomerMetrics,
  queryAbandonedCartMetrics,
  compareTimePeriods,
  getDateRange,
} from './queries'
import { detectAnomalies as runAnomalyDetection } from './anomaly-detection'
import { generateReport as runReportGeneration } from './report-generator'
import {
  getTrafficOverview as fetchTrafficOverview,
  getTrafficSources as fetchTrafficSources,
  getTopPages as fetchTopPages,
} from './ga4-client'
import {
  calculateAttribution as runAttribution,
  getChannelPerformance as runChannelPerformance,
  type AttributionModel,
} from './attribution'

// ---- Tool: queryRevenue ----

const queryRevenueSchema = z.object({
  storeId: z.string().describe('The store ID'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period to query'),
})

async function executeQueryRevenue(args: Record<string, unknown>) {
  const { storeId, period } = args as z.infer<typeof queryRevenueSchema>
  const range = getDateRange(period)
  const data = await queryRevenue(storeId, range)

  return {
    success: true,
    data,
    summary: `Revenue for last ${period}: ₹${data.total.toLocaleString('en-IN')} from ${data.count} orders (AOV: ₹${Math.round(data.avgOrderValue).toLocaleString('en-IN')})`,
  }
}

// ---- Tool: queryOrders ----

const queryOrdersSchema = z.object({
  storeId: z.string().describe('The store ID'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period'),
})

async function executeQueryOrders(args: Record<string, unknown>) {
  const { storeId, period } = args as z.infer<typeof queryOrdersSchema>
  const range = getDateRange(period)
  const data = await queryOrders(storeId, range)

  const statusSummary = Object.entries(data.byStatus)
    .map(([s, c]) => `${s}: ${c}`)
    .join(', ')
  return {
    success: true,
    data,
    summary: `${data.total} orders in last ${period}. Status breakdown: ${statusSummary}`,
  }
}

// ---- Tool: queryProducts ----

const queryProductsSchema = z.object({
  storeId: z.string().describe('The store ID'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period'),
  limit: z.number().optional().describe('Number of top products (default 5)'),
})

async function executeQueryProducts(args: Record<string, unknown>) {
  const { storeId, period, limit } = args as z.infer<typeof queryProductsSchema>
  const range = getDateRange(period)
  const data = await queryTopProducts(storeId, range, limit || 5)

  const topNames = data
    .slice(0, 3)
    .map((p) => p.name)
    .join(', ')
  return {
    success: true,
    data,
    summary: `Top products (${period}): ${topNames || 'No sales data'}`,
  }
}

// ---- Tool: queryCustomers ----

const queryCustomersSchema = z.object({
  storeId: z.string().describe('The store ID'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period'),
})

async function executeQueryCustomers(args: Record<string, unknown>) {
  const { storeId, period } = args as z.infer<typeof queryCustomersSchema>
  const range = getDateRange(period)
  const data = await queryCustomerMetrics(storeId, range)

  return {
    success: true,
    data,
    summary: `Customers (${period}): ${data.totalCustomers} total, ${data.newCustomers} new, ${data.repeatCustomers} repeat, ${data.activeCustomers} active`,
  }
}

// ---- Tool: detectAnomalies ----

const detectAnomaliesSchema = z.object({
  storeId: z.string().describe('The store ID'),
})

async function executeDetectAnomalies(args: Record<string, unknown>) {
  const { storeId } = args as z.infer<typeof detectAnomaliesSchema>
  const anomalies = await runAnomalyDetection(storeId)

  if (anomalies.length === 0) {
    return {
      success: true,
      data: { anomalies: [] },
      summary: 'No anomalies detected — all metrics within normal range',
    }
  }

  const critical = anomalies.filter((a) => a.severity === 'critical').length
  const warnings = anomalies.filter((a) => a.severity === 'warning').length
  return {
    success: true,
    data: { anomalies },
    summary: `Detected ${anomalies.length} anomalies (${critical} critical, ${warnings} warnings): ${anomalies[0].message}`,
  }
}

// ---- Tool: generateReport ----

const generateReportSchema = z.object({
  storeId: z.string().describe('The store ID'),
  type: z.enum(['daily_digest', 'weekly_report']).describe('Report type'),
})

async function executeGenerateReport(args: Record<string, unknown>) {
  const { storeId, type } = args as z.infer<typeof generateReportSchema>
  const report = await runReportGeneration(storeId, type)

  return {
    success: true,
    data: report,
    summary: `Generated ${type === 'weekly_report' ? 'weekly' : 'daily'} report: ₹${report.metrics.revenue.total.toLocaleString('en-IN')} revenue (${report.metrics.revenue.change > 0 ? '+' : ''}${report.metrics.revenue.change}%)`,
  }
}

// ---- Tool: compareTimePeriods ----

const compareTimePeriodsSchema = z.object({
  storeId: z.string().describe('The store ID'),
  currentPeriod: z.enum(['7d', '30d', '90d']).describe('Current time period'),
})

async function executeCompareTimePeriods(args: Record<string, unknown>) {
  const { storeId, currentPeriod } = args as z.infer<typeof compareTimePeriodsSchema>
  const currentRange = getDateRange(currentPeriod as '7d' | '30d' | '90d')

  const duration = currentPeriod === '7d' ? 7 : currentPeriod === '30d' ? 30 : 90
  const prevFrom = new Date(currentRange.from)
  prevFrom.setDate(prevFrom.getDate() - duration)
  const previousRange = { from: prevFrom.toISOString(), to: currentRange.from }

  const data = await compareTimePeriods(storeId, currentRange, previousRange)

  return {
    success: true,
    data,
    summary: `Period comparison (${currentPeriod}): Revenue ${data.changes.revenue > 0 ? '+' : ''}${data.changes.revenue}%, Orders ${data.changes.orders > 0 ? '+' : ''}${data.changes.orders}%, AOV ${data.changes.aov > 0 ? '+' : ''}${data.changes.aov}%`,
  }
}

// ---- Tool: getInsights ----

const getInsightsSchema = z.object({
  storeId: z.string().describe('The store ID'),
})

async function executeGetInsights(args: Record<string, unknown>) {
  const { storeId } = args as z.infer<typeof getInsightsSchema>
  const range = getDateRange('7d')

  const [revenue, topProducts, customers, carts, anomalies] = await Promise.all([
    queryRevenue(storeId, range),
    queryTopProducts(storeId, range, 3),
    queryCustomerMetrics(storeId, range),
    queryAbandonedCartMetrics(storeId, range),
    runAnomalyDetection(storeId),
  ])

  return {
    success: true,
    data: { revenue, topProducts, customers, carts, anomalies },
    summary: `Business snapshot: ₹${revenue.total.toLocaleString('en-IN')} revenue, ${revenue.count} orders, ${customers.newCustomers} new customers, ${anomalies.length} anomalies`,
  }
}

// ---- Tool: queryTrafficOverview ----

const queryTrafficOverviewSchema = z.object({
  storeId: z.string().describe('The store ID'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period to query'),
})

async function executeQueryTrafficOverview(args: Record<string, unknown>) {
  const { storeId, period } = args as z.infer<typeof queryTrafficOverviewSchema>

  try {
    const data = await fetchTrafficOverview(storeId, period)
    return {
      success: true,
      data,
      summary: `Traffic overview (${period}): ${data.sessions.toLocaleString('en-IN')} sessions, ${data.users.toLocaleString('en-IN')} users, ${data.pageviews.toLocaleString('en-IN')} pageviews, ${(data.bounceRate * 100).toFixed(1)}% bounce rate`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('not connected')) {
      return {
        success: false,
        data: null,
        summary: 'Google Analytics is not connected. The merchant needs to connect their GA4 property in Settings > Integrations.',
      }
    }
    throw err
  }
}

// ---- Tool: queryTrafficSources ----

const queryTrafficSourcesSchema = z.object({
  storeId: z.string().describe('The store ID'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period to query'),
})

async function executeQueryTrafficSources(args: Record<string, unknown>) {
  const { storeId, period } = args as z.infer<typeof queryTrafficSourcesSchema>

  try {
    const data = await fetchTrafficSources(storeId, period)

    const topSources = data
      .slice(0, 3)
      .map((s) => `${s.source}/${s.medium} (${s.sessions} sessions)`)
      .join(', ')

    return {
      success: true,
      data,
      summary: `Traffic sources (${period}): ${data.length} sources. Top: ${topSources || 'No data'}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('not connected')) {
      return {
        success: false,
        data: null,
        summary: 'Google Analytics is not connected. The merchant needs to connect their GA4 property in Settings > Integrations.',
      }
    }
    throw err
  }
}

// ---- Tool: queryTopPages ----

const queryTopPagesSchema = z.object({
  storeId: z.string().describe('The store ID'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period to query'),
})

async function executeQueryTopPages(args: Record<string, unknown>) {
  const { storeId, period } = args as z.infer<typeof queryTopPagesSchema>

  try {
    const data = await fetchTopPages(storeId, period)

    const topPages = data
      .slice(0, 3)
      .map((p) => `${p.pagePath} (${p.pageviews} views)`)
      .join(', ')

    return {
      success: true,
      data,
      summary: `Top pages (${period}): ${data.length} pages tracked. Top: ${topPages || 'No data'}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('not connected')) {
      return {
        success: false,
        data: null,
        summary: 'Google Analytics is not connected. The merchant needs to connect their GA4 property in Settings > Integrations.',
      }
    }
    throw err
  }
}

// ---- Tool: calculateAttribution ----

const calculateAttributionSchema = z.object({
  storeId: z.string().describe('The store ID'),
  model: z
    .enum(['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'])
    .describe('Attribution model to use: first_touch (100% to first interaction), last_touch (100% to last), linear (equal split), time_decay (recent weighted), position_based (40/20/40)'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period to analyze'),
})

async function executeCalculateAttribution(args: Record<string, unknown>) {
  const { storeId, model, period } = args as z.infer<typeof calculateAttributionSchema>

  const data = await runAttribution(storeId, model as AttributionModel, period)

  if (data.length === 0) {
    return {
      success: true,
      data: [],
      summary: `No conversion data available for attribution analysis (${period}). Orders need source/medium tracking.`,
    }
  }

  const topChannels = data
    .slice(0, 3)
    .map(
      (r) =>
        `${r.channel}: ₹${r.attributed_revenue.toLocaleString('en-IN')} (${r.percentage}%)`
    )
    .join(', ')

  return {
    success: true,
    data,
    summary: `${model} attribution (${period}): ${data.length} channels. Top: ${topChannels}`,
  }
}

// ---- Tool: getChannelPerformance ----

const getChannelPerformanceSchema = z.object({
  storeId: z.string().describe('The store ID'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period to analyze'),
})

async function executeGetChannelPerformance(args: Record<string, unknown>) {
  const { storeId, period } = args as z.infer<typeof getChannelPerformanceSchema>

  const data = await runChannelPerformance(storeId, period)

  if (data.length === 0) {
    return {
      success: true,
      data: [],
      summary: `No channel performance data available (${period}). Orders need source/medium tracking for attribution.`,
    }
  }

  const topChannels = data
    .slice(0, 3)
    .map(
      (ch) =>
        `${ch.channel}: ₹${ch.total_revenue.toLocaleString('en-IN')} (${ch.total_conversions.toFixed(1)} conversions)`
    )
    .join(', ')

  return {
    success: true,
    data,
    summary: `Channel performance (${period}): ${data.length} channels across 5 attribution models. Top (linear): ${topChannels}`,
  }
}

// ---- Export all tools ----

export const analyticsTools: AgentToolConfig[] = [
  {
    name: 'queryRevenue',
    description:
      'Query revenue metrics for a time period: total revenue, order count, average order value, daily breakdown',
    inputSchema: queryRevenueSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryRevenue,
  },
  {
    name: 'queryOrders',
    description:
      'Query order metrics: total count and status breakdown (confirmed, processing, shipped, delivered, cancelled)',
    inputSchema: queryOrdersSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryOrders,
  },
  {
    name: 'queryProducts',
    description:
      'Get top-selling products ranked by revenue with units sold and revenue per product',
    inputSchema: queryProductsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryProducts,
  },
  {
    name: 'queryCustomers',
    description:
      'Query customer metrics: total, new, repeat purchasers, and active customers for a period',
    inputSchema: queryCustomersSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryCustomers,
  },
  {
    name: 'detectAnomalies',
    description:
      'Detect statistical anomalies across revenue, orders, average order value, and cart abandonment using 2σ threshold',
    inputSchema: detectAnomaliesSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeDetectAnomalies,
  },
  {
    name: 'generateReport',
    description:
      'Generate a comprehensive daily digest or weekly report with AI narrative summary and recommendations',
    inputSchema: generateReportSchema,
    category: 'analysis',
    riskLevel: 'medium',
    execute: executeGenerateReport,
  },
  {
    name: 'compareTimePeriods',
    description:
      'Compare current period metrics against the previous equivalent period: revenue, orders, and AOV changes',
    inputSchema: compareTimePeriodsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeCompareTimePeriods,
  },
  {
    name: 'getInsights',
    description:
      'Get a comprehensive business snapshot: revenue, top products, customer metrics, abandoned carts, and anomalies',
    inputSchema: getInsightsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetInsights,
  },
  {
    name: 'queryTrafficOverview',
    description:
      'Get website traffic overview from Google Analytics 4: sessions, users, pageviews, bounce rate, with daily breakdown',
    inputSchema: queryTrafficOverviewSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryTrafficOverview,
  },
  {
    name: 'queryTrafficSources',
    description:
      'Get traffic source/medium breakdown from Google Analytics 4: sessions, users, bounce rate, avg session duration per source',
    inputSchema: queryTrafficSourcesSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryTrafficSources,
  },
  {
    name: 'queryTopPages',
    description:
      'Get top pages by engagement from Google Analytics 4: pageviews, time on page, bounce rate, entrances per page',
    inputSchema: queryTopPagesSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryTopPages,
  },
  {
    name: 'calculateAttribution',
    description:
      'Run multi-touch attribution analysis on order conversions using first-touch, last-touch, linear, time-decay, or position-based models',
    inputSchema: calculateAttributionSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeCalculateAttribution,
  },
  {
    name: 'getChannelPerformance',
    description:
      'Get channel performance with all five attribution models compared side by side: revenue and conversions per channel across first-touch, last-touch, linear, time-decay, and position-based',
    inputSchema: getChannelPerformanceSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetChannelPerformance,
  },
]
