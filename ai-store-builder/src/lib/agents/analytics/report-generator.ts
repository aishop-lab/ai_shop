// src/lib/agents/analytics/report-generator.ts
// Generates daily digest and weekly reports with LLM narrative

import { generateText } from 'ai'
import { getModelForTier } from '../model-router'
import { trackUsage } from '../cost-tracker'
import { logAgentAction } from '../db'
import {
  queryRevenue,
  queryOrders,
  queryTopProducts,
  queryCustomerMetrics,
  queryAbandonedCartMetrics,
  compareTimePeriods,
  getDateRange,
} from './queries'
import { detectAnomalies } from './anomaly-detection'

export type ReportType = 'daily_digest' | 'weekly_report'

export interface Report {
  type: ReportType
  storeId: string
  period: string
  generatedAt: string
  metrics: {
    revenue: { total: number; change: number }
    orders: { total: number; change: number }
    avgOrderValue: { total: number; change: number }
    customers: { new: number; active: number; repeat: number }
    abandonedCarts: { total: number; recoveryRate: number }
  }
  topProducts: { id: string; name: string; units: number; revenue: number }[]
  anomalies: { metric: string; message: string; severity: string }[]
  narrative: string
  recommendations: string[]
}

export async function generateReport(
  storeId: string,
  type: ReportType
): Promise<Report> {
  const isWeekly = type === 'weekly_report'
  const currentRange = getDateRange('7d')

  // Previous period for comparison
  const prevFrom = new Date(currentRange.from)
  prevFrom.setDate(prevFrom.getDate() - 7)
  const previousRange = { from: prevFrom.toISOString(), to: currentRange.from }

  // Gather all data in parallel
  const [revenue, orders, topProducts, customers, cartMetrics, comparison, anomalies] =
    await Promise.all([
      queryRevenue(storeId, currentRange),
      queryOrders(storeId, currentRange),
      queryTopProducts(storeId, currentRange, 5),
      queryCustomerMetrics(storeId, currentRange),
      queryAbandonedCartMetrics(storeId, currentRange),
      compareTimePeriods(storeId, currentRange, previousRange),
      detectAnomalies(storeId),
    ])

  // Build data context for LLM
  const dataContext = JSON.stringify(
    {
      period: isWeekly ? 'Last 7 days' : 'Today (with 7-day context)',
      revenue: {
        current: revenue.total,
        previous: comparison.previous.revenue,
        change: comparison.changes.revenue,
      },
      orders: {
        current: orders.total,
        previous: comparison.previous.orders,
        change: comparison.changes.orders,
      },
      avgOrderValue: { current: revenue.avgOrderValue, change: comparison.changes.aov },
      topProducts,
      customers,
      abandonedCarts: cartMetrics,
      anomalies: anomalies.map((a) => ({
        metric: a.metric,
        message: a.message,
        severity: a.severity,
      })),
    },
    null,
    2
  )

  // Generate narrative with LLM
  const model = getModelForTier('fast')
  const result = await generateText({
    model,
    system: `You are a business intelligence analyst writing a ${isWeekly ? 'weekly' : 'daily'} report for an e-commerce store owner. Be concise, actionable, and data-driven. Write in plain language — the merchant is not a data scientist. Use Indian Rupee (₹) for currency. Format numbers with Indian notation (e.g., ₹4,72,500 not ₹472,500). Keep the narrative to 3-5 sentences. Provide 2-4 specific, actionable recommendations.`,
    prompt: `Generate a ${isWeekly ? 'weekly' : 'daily'} business report based on this data:\n\n${dataContext}\n\nRespond in JSON format:\n{"narrative": "...", "recommendations": ["...", "..."]}`,
  })

  // Track usage
  await trackUsage({
    storeId,
    agentType: 'analytics',
    modelUsed: 'gemini-2.0-flash',
    tokensInput: result.usage?.inputTokens || 0,
    tokensOutput: result.usage?.outputTokens || 0,
  })

  // Parse LLM response
  let narrative = 'Report generated successfully.'
  let recommendations: string[] = []
  try {
    const text = result.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    const parsed = JSON.parse(text)
    narrative = parsed.narrative || narrative
    recommendations = parsed.recommendations || []
  } catch {
    narrative = result.text
  }

  const report: Report = {
    type,
    storeId,
    period: isWeekly ? 'Last 7 days' : 'Last 24 hours',
    generatedAt: new Date().toISOString(),
    metrics: {
      revenue: { total: revenue.total, change: comparison.changes.revenue },
      orders: { total: orders.total, change: comparison.changes.orders },
      avgOrderValue: { total: revenue.avgOrderValue, change: comparison.changes.aov },
      customers: {
        new: customers.newCustomers,
        active: customers.activeCustomers,
        repeat: customers.repeatCustomers,
      },
      abandonedCarts: {
        total: cartMetrics.total,
        recoveryRate: cartMetrics.recoveryRate,
      },
    },
    topProducts,
    anomalies: anomalies.map((a) => ({
      metric: a.metric,
      message: a.message,
      severity: a.severity,
    })),
    narrative,
    recommendations,
  }

  // Log the action
  await logAgentAction({
    storeId,
    agentType: 'analytics',
    actionType: type,
    actionCategory: 'analysis',
    summary: `Generated ${isWeekly ? 'weekly' : 'daily'} report: ₹${revenue.total.toLocaleString('en-IN')} revenue, ${orders.total} orders`,
    details: { report },
    executionMode: 'auto',
    modelUsed: 'gemini-2.0-flash',
    tokensInput: result.usage?.inputTokens || 0,
    tokensOutput: result.usage?.outputTokens || 0,
  })

  return report
}
