# Phase 5: Analytics Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Analytics Agent that proactively queries store data (revenue, orders, products, customers), detects anomalies via statistical deviation, generates daily/weekly reports, and surfaces AI-curated insights — replacing the mock analytics page with real data.

**Architecture:** `AnalyticsAgent extends BaseAgent` following the Sales/Support agent pattern. Eight tools query Supabase data with date ranges and aggregation. An anomaly detection module compares metrics against rolling averages (2σ threshold). A report generator queries data, feeds it to the LLM for narrative summary, and delivers via dashboard + optional email. The analytics page is rewired from mock data to real Supabase queries. Two new cron jobs trigger daily digest and weekly report generation.

**Tech Stack:** Next.js 16.1, Supabase PostgreSQL (service role), Vercel AI SDK (`generateText`), Zod validation, Resend email delivery, Recharts visualization

**Spec:** `docs/PRD.md` — Phase 5 (lines 2715-2745)

---

## File Structure

### New Files
```
src/lib/agents/analytics/
├── agent.ts              — AnalyticsAgent class extending BaseAgent, system prompt, tool registration
├── tools.ts              — 8 agent tools (queryRevenue, queryOrders, queryProducts, queryCustomers, etc.)
├── queries.ts            — Optimized Supabase queries with date ranges, grouping, and aggregation
├── anomaly-detection.ts  — detectAnomalies(): rolling average + std dev, 2σ threshold, multi-metric
├── report-generator.ts   — generateReport(): queries data, LLM narrative, structured output

src/app/api/agents/analytics/
├── insights/route.ts     — GET: fetch real analytics insights for a store
├── report/route.ts       — POST: trigger report generation on demand

src/app/api/cron/
├── daily-digest/route.ts — Cron: daily digest for all stores with analytics agent enabled
├── weekly-report/route.ts — Cron: weekly report for all stores with analytics agent enabled
```

### Modified Files
```
src/app/(platform)/platform/analytics/page.tsx  — Replace mock data with real Supabase queries + agent insights
src/app/api/agents/execute/route.ts             — Add daily_digest and weekly_report tasks to TASK_AGENT_MAP
vercel.json                                      — Add daily digest (8 AM IST) and weekly report (Monday 9 AM IST) crons
```

---

### Task 1: Analytics Data Queries

**Files:**
- Create: `src/lib/agents/analytics/queries.ts`

This module provides all Supabase query functions that both the agent tools and the analytics page will use. Pure data layer — no AI/LLM calls.

- [ ] **Step 1: Create the queries module with revenue query**

```typescript
// src/lib/agents/analytics/queries.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export type DateRange = {
  from: string  // ISO date
  to: string    // ISO date
}

export type GroupBy = 'day' | 'week' | 'month'

export function getDateRange(period: '7d' | '30d' | '90d' | 'custom', custom?: DateRange): DateRange {
  const to = new Date().toISOString()
  const from = new Date()
  switch (period) {
    case '7d': from.setDate(from.getDate() - 7); break
    case '30d': from.setDate(from.getDate() - 30); break
    case '90d': from.setDate(from.getDate() - 90); break
    case 'custom': return custom!
  }
  return { from: from.toISOString(), to }
}

export async function queryRevenue(storeId: string, range: DateRange) {
  const supabase = getSupabaseAdmin()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('total, created_at, status')
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)
    .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])

  if (error) throw new Error(`Revenue query failed: ${error.message}`)

  const total = (orders || []).reduce((sum, o) => sum + (o.total || 0), 0)
  const count = (orders || []).length
  const avgOrderValue = count > 0 ? total / count : 0

  // Group by day
  const byDay: Record<string, number> = {}
  for (const order of orders || []) {
    const day = new Date(order.created_at).toISOString().split('T')[0]
    byDay[day] = (byDay[day] || 0) + (order.total || 0)
  }

  return { total, count, avgOrderValue, byDay }
}
```

- [ ] **Step 2: Add order, product, and customer query functions**

Add `queryOrders`, `queryTopProducts`, `queryCustomerMetrics`, `queryAbandonedCartMetrics` to the same file. Each returns structured data with date-grouped breakdowns.

```typescript
export async function queryOrders(storeId: string, range: DateRange) {
  const supabase = getSupabaseAdmin()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, total, created_at')
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (error) throw new Error(`Orders query failed: ${error.message}`)

  const byStatus: Record<string, number> = {}
  for (const order of orders || []) {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1
  }

  return { total: (orders || []).length, byStatus }
}

export async function queryTopProducts(storeId: string, range: DateRange, limit = 10) {
  const supabase = getSupabaseAdmin()
  const { data: items, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, price, orders!inner(store_id, created_at, status)')
    .eq('orders.store_id', storeId)
    .gte('orders.created_at', range.from)
    .lte('orders.created_at', range.to)
    .in('orders.status', ['confirmed', 'processing', 'shipped', 'delivered'])

  if (error) throw new Error(`Top products query failed: ${error.message}`)

  // Aggregate by product
  const productMap: Record<string, { units: number; revenue: number }> = {}
  for (const item of items || []) {
    const pid = item.product_id
    if (!productMap[pid]) productMap[pid] = { units: 0, revenue: 0 }
    productMap[pid].units += item.quantity || 1
    productMap[pid].revenue += (item.price || 0) * (item.quantity || 1)
  }

  // Fetch product names
  const productIds = Object.keys(productMap)
  if (productIds.length === 0) return []

  const { data: products } = await supabase
    .from('products')
    .select('id, title')
    .in('id', productIds)

  const nameMap: Record<string, string> = {}
  for (const p of products || []) nameMap[p.id] = p.title

  return Object.entries(productMap)
    .map(([id, stats]) => ({ id, name: nameMap[id] || 'Unknown', ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export async function queryCustomerMetrics(storeId: string, range: DateRange) {
  const supabase = getSupabaseAdmin()

  // Total customers
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)

  // New customers in period
  const { count: newCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  // Repeat purchasers (customers with >1 order in period)
  const { data: orderCounts } = await supabase
    .from('orders')
    .select('customer_id')
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)
    .not('customer_id', 'is', null)

  const customerOrderMap: Record<string, number> = {}
  for (const o of orderCounts || []) {
    if (o.customer_id) {
      customerOrderMap[o.customer_id] = (customerOrderMap[o.customer_id] || 0) + 1
    }
  }
  const repeatCustomers = Object.values(customerOrderMap).filter(c => c > 1).length

  return {
    totalCustomers: totalCustomers || 0,
    newCustomers: newCustomers || 0,
    repeatCustomers,
    activeCustomers: Object.keys(customerOrderMap).length,
  }
}

export async function queryAbandonedCartMetrics(storeId: string, range: DateRange) {
  const supabase = getSupabaseAdmin()
  const { data: carts, error } = await supabase
    .from('abandoned_carts')
    .select('subtotal, recovery_status, created_at')
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (error) throw new Error(`Abandoned cart query failed: ${error.message}`)

  const total = (carts || []).length
  const recovered = (carts || []).filter(c => c.recovery_status === 'recovered').length
  const totalValue = (carts || []).reduce((sum, c) => sum + (c.subtotal || 0), 0)
  const recoveryRate = total > 0 ? recovered / total : 0

  return { total, recovered, totalValue, recoveryRate }
}

export async function compareTimePeriods(storeId: string, currentRange: DateRange, previousRange: DateRange) {
  const [current, previous] = await Promise.all([
    queryRevenue(storeId, currentRange),
    queryRevenue(storeId, previousRange),
  ])

  const revenueChange = previous.total > 0 ? ((current.total - previous.total) / previous.total) * 100 : 0
  const orderChange = previous.count > 0 ? ((current.count - previous.count) / previous.count) * 100 : 0
  const aovChange = previous.avgOrderValue > 0 ? ((current.avgOrderValue - previous.avgOrderValue) / previous.avgOrderValue) * 100 : 0

  return {
    current: { revenue: current.total, orders: current.count, aov: current.avgOrderValue },
    previous: { revenue: previous.total, orders: previous.count, aov: previous.avgOrderValue },
    changes: {
      revenue: Math.round(revenueChange * 10) / 10,
      orders: Math.round(orderChange * 10) / 10,
      aov: Math.round(aovChange * 10) / 10,
    },
  }
}
```

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```
git add src/lib/agents/analytics/queries.ts
git commit -m "feat(analytics): add data query layer with revenue, orders, products, customers"
```

---

### Task 2: Anomaly Detection

**Files:**
- Create: `src/lib/agents/analytics/anomaly-detection.ts`

Statistical deviation detection using rolling averages. Compares recent data against a baseline window using 2σ (standard deviation) threshold.

- [ ] **Step 1: Create anomaly detection module**

```typescript
// src/lib/agents/analytics/anomaly-detection.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export type AnomalyMetric = 'revenue' | 'order_count' | 'avg_order_value' | 'cart_abandonment' | 'new_customers'

export type Anomaly = {
  metric: AnomalyMetric
  severity: 'warning' | 'critical'
  direction: 'up' | 'down'
  currentValue: number
  expectedValue: number
  deviation: number     // number of standard deviations
  percentChange: number
  message: string
}

/**
 * Detect anomalies by comparing recent data against a rolling baseline.
 *
 * Algorithm:
 * 1. Collect daily metric values for the baseline window (default: 30 days)
 * 2. Compute mean and standard deviation of the baseline
 * 3. Compare the most recent period (default: 1 day) against baseline
 * 4. Flag deviations > 2σ as warnings, > 3σ as critical
 */
export async function detectAnomalies(
  storeId: string,
  options?: {
    metrics?: AnomalyMetric[]
    baselineDays?: number
    recentDays?: number
    threshold?: number
  }
): Promise<Anomaly[]> {
  const metrics = options?.metrics || ['revenue', 'order_count', 'avg_order_value', 'cart_abandonment']
  const baselineDays = options?.baselineDays || 30
  const recentDays = options?.recentDays || 1
  const threshold = options?.threshold || 2

  const anomalies: Anomaly[] = []
  const supabase = getSupabaseAdmin()

  const now = new Date()
  const recentStart = new Date(now)
  recentStart.setDate(recentStart.getDate() - recentDays)
  const baselineStart = new Date(recentStart)
  baselineStart.setDate(baselineStart.getDate() - baselineDays)

  for (const metric of metrics) {
    try {
      const { baseline, recent } = await getMetricData(
        supabase, storeId, metric,
        baselineStart.toISOString(), recentStart.toISOString(), now.toISOString()
      )

      if (baseline.length < 7) continue // Not enough data for meaningful detection

      const mean = baseline.reduce((sum, v) => sum + v, 0) / baseline.length
      const variance = baseline.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / baseline.length
      const stdDev = Math.sqrt(variance)

      if (stdDev === 0) continue // No variation in baseline

      const recentAvg = recent.length > 0 ? recent.reduce((sum, v) => sum + v, 0) / recent.length : 0
      const deviation = Math.abs(recentAvg - mean) / stdDev
      const percentChange = mean > 0 ? ((recentAvg - mean) / mean) * 100 : 0

      if (deviation >= threshold) {
        const direction = recentAvg > mean ? 'up' : 'down'
        const severity = deviation >= 3 ? 'critical' : 'warning'

        anomalies.push({
          metric,
          severity,
          direction,
          currentValue: Math.round(recentAvg * 100) / 100,
          expectedValue: Math.round(mean * 100) / 100,
          deviation: Math.round(deviation * 100) / 100,
          percentChange: Math.round(percentChange * 10) / 10,
          message: buildAnomalyMessage(metric, direction, percentChange, severity),
        })
      }
    } catch {
      // Skip metrics that fail to query
      continue
    }
  }

  return anomalies.sort((a, b) => b.deviation - a.deviation)
}

function buildAnomalyMessage(
  metric: AnomalyMetric,
  direction: 'up' | 'down',
  percentChange: number,
  severity: 'warning' | 'critical'
): string {
  const metricLabels: Record<AnomalyMetric, string> = {
    revenue: 'Revenue',
    order_count: 'Order count',
    avg_order_value: 'Average order value',
    cart_abandonment: 'Cart abandonment rate',
    new_customers: 'New customer signups',
  }
  const label = metricLabels[metric]
  const change = Math.abs(percentChange).toFixed(1)
  const arrow = direction === 'up' ? 'increased' : 'decreased'
  const urgency = severity === 'critical' ? 'Significant anomaly' : 'Unusual pattern'

  return `${urgency}: ${label} ${arrow} by ${change}% compared to the 30-day average`
}

async function getMetricData(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  storeId: string,
  metric: AnomalyMetric,
  baselineFrom: string,
  baselineTo: string,
  recentTo: string
): Promise<{ baseline: number[]; recent: number[] }> {
  switch (metric) {
    case 'revenue':
    case 'order_count':
    case 'avg_order_value': {
      const { data: orders } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('store_id', storeId)
        .gte('created_at', baselineFrom)
        .lte('created_at', recentTo)
        .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])

      // Group by day
      const dailyData: Record<string, number[]> = {}
      for (const order of orders || []) {
        const day = new Date(order.created_at).toISOString().split('T')[0]
        if (!dailyData[day]) dailyData[day] = []
        dailyData[day].push(order.total || 0)
      }

      const baseline: number[] = []
      const recent: number[] = []

      for (const [day, values] of Object.entries(dailyData)) {
        const dayDate = new Date(day)
        let val: number
        if (metric === 'revenue') val = values.reduce((s, v) => s + v, 0)
        else if (metric === 'order_count') val = values.length
        else val = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0

        if (dayDate < new Date(baselineTo)) baseline.push(val)
        else recent.push(val)
      }

      return { baseline, recent }
    }

    case 'cart_abandonment': {
      const { data: carts } = await supabase
        .from('abandoned_carts')
        .select('created_at, recovery_status')
        .eq('store_id', storeId)
        .gte('created_at', baselineFrom)
        .lte('created_at', recentTo)

      const dailyCounts: Record<string, number> = {}
      for (const cart of carts || []) {
        const day = new Date(cart.created_at).toISOString().split('T')[0]
        dailyCounts[day] = (dailyCounts[day] || 0) + 1
      }

      const baseline: number[] = []
      const recent: number[] = []
      for (const [day, count] of Object.entries(dailyCounts)) {
        if (new Date(day) < new Date(baselineTo)) baseline.push(count)
        else recent.push(count)
      }
      return { baseline, recent }
    }

    case 'new_customers': {
      const { data: customers } = await supabase
        .from('customers')
        .select('created_at')
        .eq('store_id', storeId)
        .gte('created_at', baselineFrom)
        .lte('created_at', recentTo)

      const dailyCounts: Record<string, number> = {}
      for (const c of customers || []) {
        const day = new Date(c.created_at).toISOString().split('T')[0]
        dailyCounts[day] = (dailyCounts[day] || 0) + 1
      }

      const baseline: number[] = []
      const recent: number[] = []
      for (const [day, count] of Object.entries(dailyCounts)) {
        if (new Date(day) < new Date(baselineTo)) baseline.push(count)
        else recent.push(count)
      }
      return { baseline, recent }
    }
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```
git add src/lib/agents/analytics/anomaly-detection.ts
git commit -m "feat(analytics): add anomaly detection with rolling average + 2σ threshold"
```

---

### Task 3: Report Generator

**Files:**
- Create: `src/lib/agents/analytics/report-generator.ts`

Queries data, feeds to LLM for narrative interpretation, outputs structured report.

- [ ] **Step 1: Create report generator**

```typescript
// src/lib/agents/analytics/report-generator.ts
import { generateText } from 'ai'
import { getModelForTier } from '../model-router'
import { trackUsage } from '../cost-tracker'
import { logAgentAction } from '../db'
import {
  queryRevenue, queryOrders, queryTopProducts,
  queryCustomerMetrics, queryAbandonedCartMetrics,
  compareTimePeriods, getDateRange,
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
  const period = isWeekly ? '7d' : '7d' // Daily digest still shows 7-day context
  const currentRange = getDateRange(period as '7d')

  // Previous period for comparison
  const prevFrom = new Date(currentRange.from)
  const prevTo = new Date(currentRange.from)
  if (isWeekly) {
    prevFrom.setDate(prevFrom.getDate() - 7)
  } else {
    prevFrom.setDate(prevFrom.getDate() - 7)
  }
  const previousRange = { from: prevFrom.toISOString(), to: prevTo.toISOString() }

  // Gather all data in parallel
  const [revenue, orders, topProducts, customers, cartMetrics, comparison, anomalies] = await Promise.all([
    queryRevenue(storeId, currentRange),
    queryOrders(storeId, currentRange),
    queryTopProducts(storeId, currentRange, 5),
    queryCustomerMetrics(storeId, currentRange),
    queryAbandonedCartMetrics(storeId, currentRange),
    compareTimePeriods(storeId, currentRange, previousRange),
    detectAnomalies(storeId),
  ])

  // Build data context for LLM
  const dataContext = JSON.stringify({
    period: isWeekly ? 'Last 7 days' : 'Today (with 7-day context)',
    revenue: { current: revenue.total, previous: comparison.previous.revenue, change: comparison.changes.revenue },
    orders: { current: orders.total, previous: comparison.previous.orders, change: comparison.changes.orders },
    avgOrderValue: { current: revenue.avgOrderValue, change: comparison.changes.aov },
    topProducts,
    customers,
    abandonedCarts: cartMetrics,
    anomalies: anomalies.map(a => ({ metric: a.metric, message: a.message, severity: a.severity })),
  }, null, 2)

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
    const text = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
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
    anomalies: anomalies.map(a => ({ metric: a.metric, message: a.message, severity: a.severity })),
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
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```
git add src/lib/agents/analytics/report-generator.ts
git commit -m "feat(analytics): add report generator with LLM narrative and recommendations"
```

---

### Task 4: Analytics Agent Tools

**Files:**
- Create: `src/lib/agents/analytics/tools.ts`

Eight tools the LLM can invoke: queryRevenue, queryOrders, queryProducts, queryCustomers, detectAnomalies, generateReport, compareTimePeriods, getInsights.

- [ ] **Step 1: Create tools file**

```typescript
// src/lib/agents/analytics/tools.ts
import { z } from 'zod'
import type { AgentToolConfig, AgentExecutionContext } from '../base-agent'
import {
  queryRevenue, queryOrders, queryTopProducts,
  queryCustomerMetrics, queryAbandonedCartMetrics,
  compareTimePeriods, getDateRange,
} from './queries'
import { detectAnomalies as runAnomalyDetection } from './anomaly-detection'
import { generateReport as runReportGeneration } from './report-generator'

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

  const statusSummary = Object.entries(data.byStatus).map(([s, c]) => `${s}: ${c}`).join(', ')
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

  const topNames = data.slice(0, 3).map(p => p.name).join(', ')
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

  const critical = anomalies.filter(a => a.severity === 'critical').length
  const warnings = anomalies.filter(a => a.severity === 'warning').length
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
  const currentRange = getDateRange(currentPeriod as '7d')

  // Calculate previous period
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

// ---- Export all tools ----

export const analyticsTools: AgentToolConfig[] = [
  {
    name: 'queryRevenue',
    description: 'Query revenue metrics for a time period: total revenue, order count, average order value, daily breakdown',
    inputSchema: queryRevenueSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryRevenue,
  },
  {
    name: 'queryOrders',
    description: 'Query order metrics: total count and status breakdown (confirmed, processing, shipped, delivered, cancelled)',
    inputSchema: queryOrdersSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryOrders,
  },
  {
    name: 'queryProducts',
    description: 'Get top-selling products ranked by revenue with units sold and revenue per product',
    inputSchema: queryProductsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryProducts,
  },
  {
    name: 'queryCustomers',
    description: 'Query customer metrics: total, new, repeat purchasers, and active customers for a period',
    inputSchema: queryCustomersSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeQueryCustomers,
  },
  {
    name: 'detectAnomalies',
    description: 'Detect statistical anomalies across revenue, orders, average order value, and cart abandonment using 2σ threshold',
    inputSchema: detectAnomaliesSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeDetectAnomalies,
  },
  {
    name: 'generateReport',
    description: 'Generate a comprehensive daily digest or weekly report with AI narrative summary and recommendations',
    inputSchema: generateReportSchema,
    category: 'analysis',
    riskLevel: 'medium',
    execute: executeGenerateReport,
  },
  {
    name: 'compareTimePeriods',
    description: 'Compare current period metrics against the previous equivalent period: revenue, orders, and AOV changes',
    inputSchema: compareTimePeriodsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeCompareTimePeriods,
  },
  {
    name: 'getInsights',
    description: 'Get a comprehensive business snapshot: revenue, top products, customer metrics, abandoned carts, and anomalies',
    inputSchema: getInsightsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetInsights,
  },
]
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```
git add src/lib/agents/analytics/tools.ts
git commit -m "feat(analytics): add 8 agent tools wrapping data queries and anomaly detection"
```

---

### Task 5: Analytics Agent Class

**Files:**
- Create: `src/lib/agents/analytics/agent.ts`

The agent class extending BaseAgent with system prompt and tool registration.

- [ ] **Step 1: Create the AnalyticsAgent class**

```typescript
// src/lib/agents/analytics/agent.ts
// Analytics Agent — surfaces insights, detects anomalies, generates reports

import { BaseAgent } from '../base-agent'
import type { AgentToolConfig } from '../base-agent'
import type { AgentType, AgentState, AgentTrigger } from '../types'
import { registerTools } from '../tool-registry'
import { analyticsTools } from './tools'

export class AnalyticsAgent extends BaseAgent {
  readonly agentType: AgentType = 'analytics'
  readonly displayName = 'Analytics Agent'

  constructor() {
    super()
    registerTools(
      analyticsTools.map(t => ({
        name: t.name,
        description: t.description,
        agentType: 'analytics' as AgentType,
        requiresApproval: (autonomyLevel) => {
          // Report generation requires approval at low autonomy
          if (t.name === 'generateReport') return autonomyLevel < 3
          // All analytics tools are read-only analysis, low risk
          return autonomyLevel < 2
        },
        riskLevel: t.riskLevel,
      }))
    )
  }

  buildSystemPrompt(state: AgentState, trigger: AgentTrigger): string {
    return `You are the Analytics Agent for an e-commerce store.

Your mission: Proactively surface business insights, detect anomalies, and generate reports that help the merchant understand their business without opening a spreadsheet.

Current Configuration:
- Autonomy Level: ${state.autonomy_level} (1=observer, 5=full auto)
- Status: ${state.status}

Key Rules:
- Always use Indian Rupee (₹) with Indian number formatting (e.g., ₹4,72,500)
- When detecting anomalies, explain in plain language what changed and why it matters
- Reports should be concise and actionable — the merchant is busy
- Focus on what's changed, what's unusual, and what the merchant should do about it
- Never make claims without data backing them up
- Compare against previous periods to show trends
- Highlight top-performing and underperforming products
- Flag abandoned cart opportunities with estimated recoverable revenue

Available Actions:
- Query revenue, orders, products, and customer metrics for any time period
- Detect statistical anomalies across key business metrics
- Generate daily digest or weekly report with AI narrative
- Compare time periods to identify trends
- Get comprehensive business snapshots

${trigger.taskType ? `Current Task: ${trigger.taskType}` : ''}
${trigger.context ? `Context: ${JSON.stringify(trigger.context)}` : ''}`
  }

  getTools(): AgentToolConfig[] {
    return analyticsTools
  }
}

// Singleton instance
export const analyticsAgent = new AnalyticsAgent()
```

- [ ] **Step 2: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```
git add src/lib/agents/analytics/agent.ts
git commit -m "feat(analytics): add AnalyticsAgent class with system prompt and tool registration"
```

---

### Task 6: Cron Routes for Daily Digest and Weekly Report

**Files:**
- Create: `src/app/api/cron/daily-digest/route.ts`
- Create: `src/app/api/cron/weekly-report/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create daily digest cron route**

```typescript
// src/app/api/cron/daily-digest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateReport } from '@/lib/agents/analytics/report-generator'
import { logAgentAction } from '@/lib/agents/db'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  // Find all stores with analytics agent enabled
  const { data: agents, error } = await supabase
    .from('agent_states')
    .select('store_id')
    .eq('agent_type', 'analytics')
    .eq('is_enabled', true)
    .neq('status', 'paused')

  if (error || !agents?.length) {
    return NextResponse.json({ ok: true, stores: 0, message: 'No enabled analytics agents' })
  }

  const results: { storeId: string; success: boolean; error?: string }[] = []

  for (const agent of agents) {
    try {
      await generateReport(agent.store_id, 'daily_digest')
      results.push({ storeId: agent.store_id, success: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ storeId: agent.store_id, success: false, error: msg })
    }
  }

  const succeeded = results.filter(r => r.success).length
  console.log(`[Daily Digest] Processed ${agents.length} stores: ${succeeded} succeeded`)

  return NextResponse.json({ ok: true, stores: agents.length, succeeded, results })
}
```

- [ ] **Step 2: Create weekly report cron route**

```typescript
// src/app/api/cron/weekly-report/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateReport } from '@/lib/agents/analytics/report-generator'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const { data: agents, error } = await supabase
    .from('agent_states')
    .select('store_id')
    .eq('agent_type', 'analytics')
    .eq('is_enabled', true)
    .neq('status', 'paused')

  if (error || !agents?.length) {
    return NextResponse.json({ ok: true, stores: 0, message: 'No enabled analytics agents' })
  }

  const results: { storeId: string; success: boolean; error?: string }[] = []

  for (const agent of agents) {
    try {
      await generateReport(agent.store_id, 'weekly_report')
      results.push({ storeId: agent.store_id, success: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ storeId: agent.store_id, success: false, error: msg })
    }
  }

  const succeeded = results.filter(r => r.success).length
  console.log(`[Weekly Report] Processed ${agents.length} stores: ${succeeded} succeeded`)

  return NextResponse.json({ ok: true, stores: agents.length, succeeded, results })
}
```

- [ ] **Step 3: Add cron schedules to vercel.json**

Add two new cron entries:
- Daily digest: `"0 2 * * *"` (2:30 AM UTC = 8:00 AM IST)
- Weekly report: `"30 3 * * 1"` (3:30 AM UTC Monday = 9:00 AM IST Monday)

- [ ] **Step 4: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```
git add src/app/api/cron/daily-digest/route.ts src/app/api/cron/weekly-report/route.ts vercel.json
git commit -m "feat(analytics): add daily digest and weekly report cron routes"
```

---

### Task 7: Analytics Insights API Route

**Files:**
- Create: `src/app/api/agents/analytics/insights/route.ts`
- Create: `src/app/api/agents/analytics/report/route.ts`

API routes for the analytics page to fetch real data and trigger reports on demand.

- [ ] **Step 1: Create insights API route**

```typescript
// src/app/api/agents/analytics/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import {
  queryRevenue, queryOrders, queryTopProducts,
  queryCustomerMetrics, queryAbandonedCartMetrics,
  compareTimePeriods, getDateRange,
} from '@/lib/agents/analytics/queries'
import { detectAnomalies } from '@/lib/agents/analytics/anomaly-detection'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Auth: get store ID from authenticated user
  const url = new URL(request.url)
  const period = (url.searchParams.get('period') || '7d') as '7d' | '30d' | '90d'

  // Try cookie auth first, then bearer token
  let userId: string | null = null
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const supabase = getSupabaseAdmin()
    const { data: { user } } = await supabase.auth.getUser(token)
    userId = user?.id || null
  } else {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's store
  const admin = getSupabaseAdmin()
  const { data: store } = await admin
    .from('stores')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const storeId = store.id
  const currentRange = getDateRange(period)

  // Previous period for comparison
  const durationDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const prevFrom = new Date(currentRange.from)
  prevFrom.setDate(prevFrom.getDate() - durationDays)
  const previousRange = { from: prevFrom.toISOString(), to: currentRange.from }

  try {
    const [revenue, orders, topProducts, customers, carts, comparison, anomalies] = await Promise.all([
      queryRevenue(storeId, currentRange),
      queryOrders(storeId, currentRange),
      queryTopProducts(storeId, currentRange, 5),
      queryCustomerMetrics(storeId, currentRange),
      queryAbandonedCartMetrics(storeId, currentRange),
      compareTimePeriods(storeId, currentRange, previousRange),
      detectAnomalies(storeId),
    ])

    // Also fetch recent analytics agent insights from agent_actions
    const { data: insights } = await admin
      .from('agent_actions')
      .select('id, summary, details, created_at')
      .eq('store_id', storeId)
      .eq('agent_type', 'analytics')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      period,
      revenue,
      orders,
      topProducts,
      customers,
      carts,
      comparison,
      anomalies,
      insights: insights || [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create report trigger API route**

```typescript
// src/app/api/agents/analytics/report/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateReport } from '@/lib/agents/analytics/report-generator'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  // Auth
  let userId: string | null = null
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const supabase = getSupabaseAdmin()
    const { data: { user } } = await supabase.auth.getUser(token)
    userId = user?.id || null
  } else {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: store } = await admin
    .from('stores')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const body = await request.json()
  const type = body.type === 'weekly_report' ? 'weekly_report' : 'daily_digest'

  try {
    const report = await generateReport(store.id, type)
    return NextResponse.json({ ok: true, report })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```
git add src/app/api/agents/analytics/insights/route.ts src/app/api/agents/analytics/report/route.ts
git commit -m "feat(analytics): add insights and report API routes"
```

---

### Task 8: Replace Mock Analytics Page with Real Data

**Files:**
- Modify: `src/app/(platform)/platform/analytics/page.tsx`

Replace all mock arrays with API calls to `/api/agents/analytics/insights`. Keep the existing Recharts charts and UI components but wire them to real data with loading/error states.

- [ ] **Step 1: Rewrite analytics page with data fetching**

Replace the entire page to:
1. Use `useEffect` + `fetch` to load from `/api/agents/analytics/insights?period=7d`
2. Support period switcher (7d / 30d / 90d)
3. Show loading skeletons while fetching
4. Wire `METRICS` array to real `comparison.changes` data
5. Wire `REVENUE_DATA` chart to real `revenue.byDay` data
6. Wire `ORDER_STATUS_DATA` to real `orders.byStatus` data
7. Wire `INSIGHTS` to real `anomalies` + `insights` from agent_actions
8. Add "Generate Report" button that POSTs to `/api/agents/analytics/report`

Keep: all existing chart components (`AnalyticsMetricCard`, `InsightCard`, `RevenueTooltip`, `OrderTooltip`), Recharts imports, CSS variable theming, AgentBadge.

- [ ] **Step 2: Verify the page builds**

Run: `npx next build` (or `npx tsc --noEmit`)

- [ ] **Step 3: Commit**

```
git add src/app/(platform)/platform/analytics/page.tsx
git commit -m "feat(analytics): wire analytics page to real data with period switcher and report generation"
```

---

### Task 9: Wire Crons and Execute Route

**Files:**
- Modify: `src/app/api/agents/execute/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Add analytics tasks to TASK_AGENT_MAP in execute route**

Add `daily_digest: 'analytics'` and `weekly_report: 'analytics'` to the task map, plus handler cases in the switch.

- [ ] **Step 2: Update vercel.json with new cron schedules**

```json
{
  "path": "/api/cron/daily-digest",
  "schedule": "30 2 * * *"
},
{
  "path": "/api/cron/weekly-report",
  "schedule": "30 3 * * 1"
}
```

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```
git add src/app/api/agents/execute/route.ts vercel.json
git commit -m "feat(analytics): wire daily digest and weekly report cron schedules"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `queries.ts` | Data query layer (revenue, orders, products, customers, carts, comparisons) |
| 2 | `anomaly-detection.ts` | Statistical anomaly detection (rolling avg, 2σ threshold) |
| 3 | `report-generator.ts` | LLM-powered report generation with narrative and recommendations |
| 4 | `tools.ts` | 8 agent tools wrapping queries, anomalies, reports |
| 5 | `agent.ts` | AnalyticsAgent class extending BaseAgent |
| 6 | Cron routes + `vercel.json` | Daily digest and weekly report cron jobs |
| 7 | API routes | `/api/agents/analytics/insights` and `/report` endpoints |
| 8 | Analytics page | Replace mock data with real Supabase queries |
| 9 | Execute route + vercel.json | Wire cron schedules |
