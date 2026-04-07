// src/lib/agents/analytics/anomaly-detection.ts
// Statistical anomaly detection using rolling baseline with standard deviation thresholds

import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnomalyMetric =
  | 'revenue'
  | 'order_count'
  | 'avg_order_value'
  | 'cart_abandonment'
  | 'new_customers'

export type Anomaly = {
  metric: AnomalyMetric
  severity: 'warning' | 'critical'
  direction: 'up' | 'down'
  currentValue: number
  expectedValue: number
  deviation: number // number of standard deviations
  percentChange: number
  message: string // human-readable plain language message
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_METRICS: AnomalyMetric[] = [
  'revenue',
  'order_count',
  'avg_order_value',
  'cart_abandonment',
  'new_customers',
]

const VALID_ORDER_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered']
const MIN_BASELINE_DAYS = 7
const DEFAULT_BASELINE_DAYS = 30
const DEFAULT_RECENT_DAYS = 1
const DEFAULT_THRESHOLD = 2 // standard deviations for warning
const CRITICAL_MULTIPLIER = 1.5 // 3σ when threshold is 2σ

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `\u20B9${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function metricLabel(metric: AnomalyMetric): string {
  const labels: Record<AnomalyMetric, string> = {
    revenue: 'Revenue',
    order_count: 'Order count',
    avg_order_value: 'Average order value',
    cart_abandonment: 'Cart abandonment',
    new_customers: 'New customer signups',
  }
  return labels[metric]
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function stddev(values: number[], avg: number): number {
  if (values.length === 0) return 0
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function buildMessage(
  metric: AnomalyMetric,
  direction: 'up' | 'down',
  severity: 'warning' | 'critical',
  currentValue: number,
  expectedValue: number,
  percentChange: number
): string {
  const isCurrency = metric === 'revenue' || metric === 'avg_order_value'
  const current = isCurrency ? formatCurrency(currentValue) : currentValue.toLocaleString('en-IN')
  const expected = isCurrency ? formatCurrency(expectedValue) : expectedValue.toLocaleString('en-IN')
  const pct = Math.abs(percentChange).toFixed(1)
  const label = metricLabel(metric)
  const severityWord = severity === 'critical' ? 'Significant' : 'Unusual'
  const directionWord = direction === 'up' ? 'increase' : 'decrease'

  return `${severityWord} ${directionWord} in ${label.toLowerCase()}: ${current} vs expected ${expected} (${direction === 'up' ? '+' : '-'}${pct}%)`
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Returns a date string in YYYY-MM-DD format for a given offset from today */
function dateOffset(daysAgo: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Metric fetchers — each returns an array of daily values
// ---------------------------------------------------------------------------

type DailyValues = number[]

async function fetchRevenue(
  storeId: string,
  fromDate: string,
  toDate: string
): Promise<DailyValues> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .eq('store_id', storeId)
    .in('status', VALID_ORDER_STATUSES)
    .gte('created_at', `${fromDate}T00:00:00Z`)
    .lt('created_at', `${toDate}T00:00:00Z`)

  if (error) throw new Error(`Failed to fetch revenue: ${error.message}`)

  return aggregateByDay(
    (data ?? []).map((r) => ({
      date: r.created_at,
      value: Number(r.total_amount) || 0,
    })),
    fromDate,
    toDate,
    'sum'
  )
}

async function fetchOrderCount(
  storeId: string,
  fromDate: string,
  toDate: string
): Promise<DailyValues> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('orders')
    .select('created_at')
    .eq('store_id', storeId)
    .in('status', VALID_ORDER_STATUSES)
    .gte('created_at', `${fromDate}T00:00:00Z`)
    .lt('created_at', `${toDate}T00:00:00Z`)

  if (error) throw new Error(`Failed to fetch order count: ${error.message}`)

  return aggregateByDay(
    (data ?? []).map((r) => ({ date: r.created_at, value: 1 })),
    fromDate,
    toDate,
    'sum'
  )
}

async function fetchAvgOrderValue(
  storeId: string,
  fromDate: string,
  toDate: string
): Promise<DailyValues> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .eq('store_id', storeId)
    .in('status', VALID_ORDER_STATUSES)
    .gte('created_at', `${fromDate}T00:00:00Z`)
    .lt('created_at', `${toDate}T00:00:00Z`)

  if (error) throw new Error(`Failed to fetch avg order value: ${error.message}`)

  return aggregateByDay(
    (data ?? []).map((r) => ({
      date: r.created_at,
      value: Number(r.total_amount) || 0,
    })),
    fromDate,
    toDate,
    'avg'
  )
}

async function fetchCartAbandonment(
  storeId: string,
  fromDate: string,
  toDate: string
): Promise<DailyValues> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('abandoned_carts')
    .select('created_at')
    .eq('store_id', storeId)
    .gte('created_at', `${fromDate}T00:00:00Z`)
    .lt('created_at', `${toDate}T00:00:00Z`)

  if (error) throw new Error(`Failed to fetch cart abandonment: ${error.message}`)

  return aggregateByDay(
    (data ?? []).map((r) => ({ date: r.created_at, value: 1 })),
    fromDate,
    toDate,
    'sum'
  )
}

async function fetchNewCustomers(
  storeId: string,
  fromDate: string,
  toDate: string
): Promise<DailyValues> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('customers')
    .select('created_at')
    .eq('store_id', storeId)
    .gte('created_at', `${fromDate}T00:00:00Z`)
    .lt('created_at', `${toDate}T00:00:00Z`)

  if (error) throw new Error(`Failed to fetch new customers: ${error.message}`)

  return aggregateByDay(
    (data ?? []).map((r) => ({ date: r.created_at, value: 1 })),
    fromDate,
    toDate,
    'sum'
  )
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

type AggMode = 'sum' | 'avg'

interface DailyRow {
  date: string
  value: number
}

/**
 * Groups rows by calendar day (UTC) and returns one value per day in the
 * [fromDate, toDate) range. Days with no data get 0.
 */
function aggregateByDay(
  rows: DailyRow[],
  fromDate: string,
  toDate: string,
  mode: AggMode
): DailyValues {
  // Bucket rows by YYYY-MM-DD
  const buckets: Record<string, number[]> = {}
  for (const row of rows) {
    const day = row.date.slice(0, 10)
    if (!buckets[day]) buckets[day] = []
    buckets[day].push(row.value)
  }

  // Walk each day in range
  const values: number[] = []
  const cursor = new Date(`${fromDate}T00:00:00Z`)
  const end = new Date(`${toDate}T00:00:00Z`)

  while (cursor < end) {
    const key = cursor.toISOString().slice(0, 10)
    const bucket = buckets[key]
    if (!bucket || bucket.length === 0) {
      values.push(0)
    } else if (mode === 'sum') {
      values.push(bucket.reduce((a, b) => a + b, 0))
    } else {
      // avg
      values.push(bucket.reduce((a, b) => a + b, 0) / bucket.length)
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return values
}

// ---------------------------------------------------------------------------
// Metric fetcher registry
// ---------------------------------------------------------------------------

const METRIC_FETCHERS: Record<
  AnomalyMetric,
  (storeId: string, from: string, to: string) => Promise<DailyValues>
> = {
  revenue: fetchRevenue,
  order_count: fetchOrderCount,
  avg_order_value: fetchAvgOrderValue,
  cart_abandonment: fetchCartAbandonment,
  new_customers: fetchNewCustomers,
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function detectAnomalies(
  storeId: string,
  options?: {
    metrics?: AnomalyMetric[]
    baselineDays?: number
    recentDays?: number
    threshold?: number
  }
): Promise<Anomaly[]> {
  const metrics = options?.metrics ?? ALL_METRICS
  const baselineDays = options?.baselineDays ?? DEFAULT_BASELINE_DAYS
  const recentDays = options?.recentDays ?? DEFAULT_RECENT_DAYS
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD
  const criticalThreshold = threshold * CRITICAL_MULTIPLIER

  // Date boundaries
  // recent window: [recentStart, recentEnd)  — the most recent `recentDays` days
  // baseline window: [baselineStart, recentStart) — the preceding `baselineDays` days
  const recentEnd = dateOffset(0) // today (exclusive upper bound)
  const recentStart = dateOffset(recentDays)
  const baselineStart = dateOffset(recentDays + baselineDays)

  const anomalies: Anomaly[] = []

  // Process each metric in parallel
  const results = await Promise.allSettled(
    metrics.map(async (metric) => {
      const fetcher = METRIC_FETCHERS[metric]

      // Fetch baseline and recent data in parallel
      const [baselineValues, recentValues] = await Promise.all([
        fetcher(storeId, baselineStart, recentStart),
        fetcher(storeId, recentStart, recentEnd),
      ])

      // Skip if insufficient baseline data
      if (baselineValues.length < MIN_BASELINE_DAYS) return null

      const baselineMean = mean(baselineValues)
      const baselineStddev = stddev(baselineValues, baselineMean)

      // Skip if zero standard deviation (no variation)
      if (baselineStddev === 0) return null

      // Compute average of recent period
      const recentMean = mean(recentValues)

      // Calculate deviation in terms of standard deviations
      const deviationValue = (recentMean - baselineMean) / baselineStddev
      const absDeviation = Math.abs(deviationValue)

      // Check against thresholds
      if (absDeviation < threshold) return null

      const direction: 'up' | 'down' = deviationValue > 0 ? 'up' : 'down'
      const severity: 'warning' | 'critical' =
        absDeviation >= criticalThreshold ? 'critical' : 'warning'
      const percentChange =
        baselineMean !== 0
          ? ((recentMean - baselineMean) / baselineMean) * 100
          : recentMean > 0
            ? 100
            : 0

      const anomaly: Anomaly = {
        metric,
        severity,
        direction,
        currentValue: Math.round(recentMean * 100) / 100,
        expectedValue: Math.round(baselineMean * 100) / 100,
        deviation: Math.round(absDeviation * 100) / 100,
        percentChange: Math.round(percentChange * 100) / 100,
        message: buildMessage(
          metric,
          direction,
          severity,
          Math.round(recentMean * 100) / 100,
          Math.round(baselineMean * 100) / 100,
          percentChange
        ),
      }

      return anomaly
    })
  )

  // Collect successful results
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      anomalies.push(result.value)
    }
  }

  // Sort by deviation descending (highest anomalies first)
  anomalies.sort((a, b) => b.deviation - a.deviation)

  return anomalies
}
