// src/lib/agents/marketing/budget-manager.ts
// Budget management and ROAS tracking for the Marketing Agent.
// Enforces spending limits and tracks return on ad spend across platforms.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const log = logger.child({ traceId: `marketing:budget` })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketingBudget {
  storeId: string
  monthlyLimit: number // in store currency
  currentSpend: number
  remainingBudget: number
  dailyAverage: number
  projectedMonthlySpend: number
  isOverBudget: boolean
  warningLevel: 'none' | 'approaching' | 'exceeded'
  currency: string
}

export interface CampaignROAS {
  campaignId: string
  platform: 'meta' | 'google'
  totalSpend: number
  totalRevenue: number
  roas: number // revenue / spend
  conversions: number
  costPerConversion: number
  status: 'profitable' | 'break_even' | 'unprofitable'
}

export interface SpendRecord {
  id?: string
  storeId: string
  platform: 'meta' | 'google'
  campaignId: string
  amount: number
  currency: string
  date: string
  type: 'ad_spend' | 'boost' | 'promotion'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WARNING_THRESHOLD = 0.8 // 80% of budget
const DEFAULT_MONTHLY_LIMIT = 10000 // default budget in store currency

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getDaysElapsedInMonth(date: Date): number {
  return date.getDate()
}

function getMonthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function getPeriodStart(period: '7d' | '30d' | '90d'): string {
  const now = new Date()
  const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90
  now.setDate(now.getDate() - daysBack)
  return now.toISOString()
}

function classifyROAS(roas: number): 'profitable' | 'break_even' | 'unprofitable' {
  if (roas > 1.2) return 'profitable'
  if (roas >= 0.8) return 'break_even'
  return 'unprofitable'
}

async function getStoreCurrency(storeId: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('stores')
    .select('blueprint')
    .eq('id', storeId)
    .single()

  return data?.blueprint?.location?.currency || 'INR'
}

async function getStoreBudgetSettings(storeId: string): Promise<{
  monthlyLimit: number
  currency: string
}> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('stores')
    .select('settings, blueprint')
    .eq('id', storeId)
    .single()

  const settings = data?.settings || {}
  const currency = data?.blueprint?.location?.currency || 'INR'
  const monthlyLimit = (settings as Record<string, unknown>).marketing_budget_monthly as number || DEFAULT_MONTHLY_LIMIT

  return { monthlyLimit, currency }
}

// ---------------------------------------------------------------------------
// getBudgetStatus
// ---------------------------------------------------------------------------

export async function getBudgetStatus(storeId: string): Promise<MarketingBudget> {
  const { monthlyLimit, currency } = await getStoreBudgetSettings(storeId)
  const supabase = getSupabaseAdmin()
  const monthStart = getMonthStart()

  // Sum all marketing spend records for the current month from agent_actions
  const { data: actions, error } = await supabase
    .from('agent_actions')
    .select('details')
    .eq('store_id', storeId)
    .eq('agent_type', 'marketing')
    .eq('action_category', 'campaign')
    .gte('created_at', monthStart)

  if (error) {
    log.error('Failed to fetch marketing spend actions', new Error(error.message), { storeId })
    throw new Error(`Failed to fetch budget status: ${error.message}`)
  }

  const currentSpend = (actions || []).reduce((sum, action) => {
    const details = action.details as Record<string, unknown>
    const amount = typeof details?.spend_amount === 'number' ? details.spend_amount : 0
    return sum + amount
  }, 0)

  const now = new Date()
  const daysElapsed = getDaysElapsedInMonth(now)
  const daysInMonth = getDaysInMonth(now)
  const dailyAverage = daysElapsed > 0 ? currentSpend / daysElapsed : 0
  const projectedMonthlySpend = dailyAverage * daysInMonth
  const remainingBudget = Math.max(0, monthlyLimit - currentSpend)
  const spendRatio = monthlyLimit > 0 ? currentSpend / monthlyLimit : 0

  let warningLevel: 'none' | 'approaching' | 'exceeded' = 'none'
  if (spendRatio >= 1) {
    warningLevel = 'exceeded'
  } else if (spendRatio >= WARNING_THRESHOLD) {
    warningLevel = 'approaching'
  }

  return {
    storeId,
    monthlyLimit,
    currentSpend,
    remainingBudget,
    dailyAverage,
    projectedMonthlySpend,
    isOverBudget: spendRatio >= 1,
    warningLevel,
    currency,
  }
}

// ---------------------------------------------------------------------------
// checkSpendAllowance
// ---------------------------------------------------------------------------

export async function checkSpendAllowance(
  storeId: string,
  proposedAmount: number
): Promise<{
  allowed: boolean
  remainingBudget: number
  reason?: string
}> {
  const budget = await getBudgetStatus(storeId)

  if (budget.isOverBudget) {
    log.warn('Spend rejected: budget exceeded', {
      storeId,
      proposedAmount,
      currentSpend: budget.currentSpend,
      monthlyLimit: budget.monthlyLimit,
    })
    return {
      allowed: false,
      remainingBudget: 0,
      reason: `Monthly marketing budget of ${budget.currency} ${budget.monthlyLimit} has been exceeded. Current spend: ${budget.currency} ${budget.currentSpend.toFixed(2)}.`,
    }
  }

  if (proposedAmount > budget.remainingBudget) {
    log.warn('Spend rejected: would exceed budget', {
      storeId,
      proposedAmount,
      remainingBudget: budget.remainingBudget,
    })
    return {
      allowed: false,
      remainingBudget: budget.remainingBudget,
      reason: `Proposed spend of ${budget.currency} ${proposedAmount} exceeds remaining budget of ${budget.currency} ${budget.remainingBudget.toFixed(2)}.`,
    }
  }

  if (budget.warningLevel === 'approaching') {
    log.info('Spend allowed but budget approaching limit', {
      storeId,
      proposedAmount,
      remainingBudget: budget.remainingBudget,
    })
  }

  return {
    allowed: true,
    remainingBudget: budget.remainingBudget - proposedAmount,
  }
}

// ---------------------------------------------------------------------------
// recordSpend
// ---------------------------------------------------------------------------

export async function recordSpend(record: SpendRecord): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('agent_actions')
    .insert({
      store_id: record.storeId,
      agent_type: 'marketing',
      action_type: `${record.type}_${record.platform}`,
      action_category: 'campaign',
      summary: `Recorded ${record.type} of ${record.currency} ${record.amount} on ${record.platform} for campaign ${record.campaignId}`,
      details: {
        spend_amount: record.amount,
        currency: record.currency,
        platform: record.platform,
        campaign_id: record.campaignId,
        spend_type: record.type,
        spend_date: record.date,
      },
      status: 'completed',
      execution_mode: 'auto',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost_usd: 0,
    })

  if (error) {
    log.error('Failed to record marketing spend', new Error(error.message), {
      storeId: record.storeId,
      campaignId: record.campaignId,
      amount: record.amount,
    })
    throw new Error(`Failed to record spend: ${error.message}`)
  }

  log.info('Marketing spend recorded', {
    storeId: record.storeId,
    platform: record.platform,
    campaignId: record.campaignId,
    amount: record.amount,
    currency: record.currency,
  })
}

// ---------------------------------------------------------------------------
// getCampaignROAS
// ---------------------------------------------------------------------------

export async function getCampaignROAS(
  storeId: string,
  campaignId: string,
  platform: 'meta' | 'google'
): Promise<CampaignROAS> {
  const supabase = getSupabaseAdmin()

  // Get total spend for this campaign
  const { data: spendActions, error: spendError } = await supabase
    .from('agent_actions')
    .select('details')
    .eq('store_id', storeId)
    .eq('agent_type', 'marketing')
    .eq('action_category', 'campaign')

  if (spendError) {
    throw new Error(`Failed to fetch campaign spend: ${spendError.message}`)
  }

  const totalSpend = (spendActions || []).reduce((sum, action) => {
    const details = action.details as Record<string, unknown>
    if (details?.campaign_id === campaignId && details?.platform === platform) {
      return sum + (typeof details?.spend_amount === 'number' ? details.spend_amount : 0)
    }
    return sum
  }, 0)

  // Get attributed revenue from orders with matching campaign tracking
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('total_amount, payment_status, metadata')
    .eq('store_id', storeId)
    .eq('payment_status', 'paid')

  if (orderError) {
    throw new Error(`Failed to fetch orders for ROAS: ${orderError.message}`)
  }

  let totalRevenue = 0
  let conversions = 0

  for (const order of orders || []) {
    const metadata = order.metadata as Record<string, unknown> | null
    if (!metadata) continue

    const matchesCampaign =
      metadata.campaign_id === campaignId ||
      (metadata.utm_campaign === campaignId && metadata.utm_source === platform)

    if (matchesCampaign) {
      totalRevenue += order.total_amount || 0
      conversions++
    }
  }

  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const costPerConversion = conversions > 0 ? totalSpend / conversions : 0

  return {
    campaignId,
    platform,
    totalSpend,
    totalRevenue,
    roas,
    conversions,
    costPerConversion,
    status: classifyROAS(roas),
  }
}

// ---------------------------------------------------------------------------
// getOverallROAS
// ---------------------------------------------------------------------------

export async function getOverallROAS(
  storeId: string,
  period: '7d' | '30d' | '90d'
): Promise<{
  totalSpend: number
  totalRevenue: number
  overallROAS: number
  byPlatform: Record<string, { spend: number; revenue: number; roas: number }>
  topCampaigns: CampaignROAS[]
  bottomCampaigns: CampaignROAS[]
}> {
  const supabase = getSupabaseAdmin()
  const periodStart = getPeriodStart(period)

  // Get all marketing spend in the period
  const { data: spendActions, error: spendError } = await supabase
    .from('agent_actions')
    .select('details')
    .eq('store_id', storeId)
    .eq('agent_type', 'marketing')
    .eq('action_category', 'campaign')
    .gte('created_at', periodStart)

  if (spendError) {
    throw new Error(`Failed to fetch marketing spend: ${spendError.message}`)
  }

  // Aggregate spend by platform and campaign
  const platformSpend: Record<string, number> = {}
  const campaignSpend: Record<string, { platform: 'meta' | 'google'; spend: number }> = {}

  for (const action of spendActions || []) {
    const details = action.details as Record<string, unknown>
    const amount = typeof details?.spend_amount === 'number' ? details.spend_amount : 0
    const platform = details?.platform as string
    const campaignId = details?.campaign_id as string

    if (platform) {
      platformSpend[platform] = (platformSpend[platform] || 0) + amount
    }
    if (campaignId && platform) {
      const key = `${platform}:${campaignId}`
      if (!campaignSpend[key]) {
        campaignSpend[key] = { platform: platform as 'meta' | 'google', spend: 0 }
      }
      campaignSpend[key].spend += amount
    }
  }

  const totalSpend = Object.values(platformSpend).reduce((sum, v) => sum + v, 0)

  // Get orders with marketing attribution in the period
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('total_amount, payment_status, metadata')
    .eq('store_id', storeId)
    .eq('payment_status', 'paid')
    .gte('created_at', periodStart)

  if (orderError) {
    throw new Error(`Failed to fetch orders for ROAS: ${orderError.message}`)
  }

  // Attribute revenue to platforms and campaigns
  const platformRevenue: Record<string, number> = {}
  const campaignRevenue: Record<string, { revenue: number; conversions: number }> = {}
  let totalRevenue = 0

  for (const order of orders || []) {
    const metadata = order.metadata as Record<string, unknown> | null
    if (!metadata) continue

    const utmSource = metadata.utm_source as string | undefined
    const campaignId = (metadata.campaign_id || metadata.utm_campaign) as string | undefined

    if (!utmSource && !campaignId) continue

    const orderTotal = order.total_amount || 0
    totalRevenue += orderTotal

    // Attribute to platform
    const platform = utmSource || (campaignId ? guessplatformFromCampaign(campaignId, campaignSpend) : null)
    if (platform) {
      platformRevenue[platform] = (platformRevenue[platform] || 0) + orderTotal
    }

    // Attribute to campaign
    if (campaignId && platform) {
      const key = `${platform}:${campaignId}`
      if (!campaignRevenue[key]) {
        campaignRevenue[key] = { revenue: 0, conversions: 0 }
      }
      campaignRevenue[key].revenue += orderTotal
      campaignRevenue[key].conversions++
    }
  }

  // Build platform breakdown
  const allPlatforms = new Set([...Object.keys(platformSpend), ...Object.keys(platformRevenue)])
  const byPlatform: Record<string, { spend: number; revenue: number; roas: number }> = {}
  for (const platform of allPlatforms) {
    const spend = platformSpend[platform] || 0
    const revenue = platformRevenue[platform] || 0
    byPlatform[platform] = {
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
    }
  }

  // Build campaign ROAS list
  const allCampaignKeys = new Set([...Object.keys(campaignSpend), ...Object.keys(campaignRevenue)])
  const campaignROASList: CampaignROAS[] = []

  for (const key of allCampaignKeys) {
    const [platform, campaignId] = key.split(':')
    const spend = campaignSpend[key]?.spend || 0
    const rev = campaignRevenue[key]?.revenue || 0
    const conversions = campaignRevenue[key]?.conversions || 0
    const roas = spend > 0 ? rev / spend : 0

    campaignROASList.push({
      campaignId,
      platform: (campaignSpend[key]?.platform || platform) as 'meta' | 'google',
      totalSpend: spend,
      totalRevenue: rev,
      roas,
      conversions,
      costPerConversion: conversions > 0 ? spend / conversions : 0,
      status: classifyROAS(roas),
    })
  }

  // Sort for top and bottom
  const sorted = [...campaignROASList].sort((a, b) => b.roas - a.roas)
  const topCampaigns = sorted.slice(0, 5)
  const bottomCampaigns = sorted.filter(c => c.totalSpend > 0).reverse().slice(0, 5)

  return {
    totalSpend,
    totalRevenue,
    overallROAS: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    byPlatform,
    topCampaigns,
    bottomCampaigns,
  }
}

/**
 * Best-effort guess of platform from campaign key when utm_source is missing
 */
function guessplatformFromCampaign(
  campaignId: string,
  campaignSpend: Record<string, { platform: 'meta' | 'google'; spend: number }>
): string | null {
  for (const [key, value] of Object.entries(campaignSpend)) {
    if (key.endsWith(`:${campaignId}`)) return value.platform
  }
  return null
}

// ---------------------------------------------------------------------------
// setMarketingBudget
// ---------------------------------------------------------------------------

export async function setMarketingBudget(storeId: string, monthlyLimit: number): Promise<void> {
  if (monthlyLimit < 0) {
    throw new Error('Monthly budget limit must be non-negative')
  }

  const supabase = getSupabaseAdmin()

  // Read current settings then merge
  const { data: store, error: fetchError } = await supabase
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch store settings: ${fetchError.message}`)
  }

  const currentSettings = (store?.settings || {}) as Record<string, unknown>
  const updatedSettings = {
    ...currentSettings,
    marketing_budget_monthly: monthlyLimit,
  }

  const { error: updateError } = await supabase
    .from('stores')
    .update({ settings: updatedSettings })
    .eq('id', storeId)

  if (updateError) {
    log.error('Failed to update marketing budget', new Error(updateError.message), { storeId, monthlyLimit })
    throw new Error(`Failed to set marketing budget: ${updateError.message}`)
  }

  log.info('Marketing budget updated', { storeId, monthlyLimit })
}

// ---------------------------------------------------------------------------
// getDailySpendBreakdown
// ---------------------------------------------------------------------------

export async function getDailySpendBreakdown(
  storeId: string,
  days: number
): Promise<Array<{
  date: string
  metaSpend: number
  googleSpend: number
  totalSpend: number
}>> {
  const supabase = getSupabaseAdmin()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: actions, error } = await supabase
    .from('agent_actions')
    .select('details, created_at')
    .eq('store_id', storeId)
    .eq('agent_type', 'marketing')
    .eq('action_category', 'campaign')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch daily spend breakdown: ${error.message}`)
  }

  // Aggregate by day
  const dailyMap: Record<string, { meta: number; google: number }> = {}

  // Pre-fill all days so the output has no gaps
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const key = d.toISOString().split('T')[0]
    dailyMap[key] = { meta: 0, google: 0 }
  }

  for (const action of actions || []) {
    const details = action.details as Record<string, unknown>
    const amount = typeof details?.spend_amount === 'number' ? details.spend_amount : 0
    const platform = details?.platform as string
    const spendDate = (details?.spend_date as string) || action.created_at
    const dayKey = new Date(spendDate).toISOString().split('T')[0]

    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = { meta: 0, google: 0 }
    }

    if (platform === 'meta') {
      dailyMap[dayKey].meta += amount
    } else if (platform === 'google') {
      dailyMap[dayKey].google += amount
    }
  }

  return Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, spend]) => ({
      date,
      metaSpend: spend.meta,
      googleSpend: spend.google,
      totalSpend: spend.meta + spend.google,
    }))
}

// ---------------------------------------------------------------------------
// syncSpendFromPlatforms
// ---------------------------------------------------------------------------

export async function syncSpendFromPlatforms(storeId: string): Promise<{
  metaSpend: number
  googleSpend: number
  syncedRecords: number
}> {
  let metaSpend = 0
  let googleSpend = 0
  let syncedRecords = 0
  const currency = await getStoreCurrency(storeId)

  // Sync Meta Ads spend
  try {
    const { getCampaignInsights: getMetaInsights, listCampaigns: listMetaCampaigns } = await import('./meta-ads')
    const metaCampaigns = await listMetaCampaigns(storeId)

    for (const campaign of metaCampaigns) {
      try {
        const insights = await getMetaInsights(storeId, campaign.id)
        if (insights && typeof insights.spend === 'number' && insights.spend > 0) {
          const today = new Date().toISOString().split('T')[0]

          await recordSpend({
            storeId,
            platform: 'meta',
            campaignId: campaign.id,
            amount: insights.spend,
            currency,
            date: today,
            type: 'ad_spend',
          })

          metaSpend += insights.spend
          syncedRecords++
        }
      } catch (campaignErr) {
        log.warn('Failed to sync Meta campaign spend', {
          storeId,
          campaignId: campaign.id,
          error: campaignErr instanceof Error ? campaignErr.message : String(campaignErr),
        })
      }
    }
  } catch (metaErr) {
    log.warn('Meta Ads sync unavailable or failed', {
      storeId,
      error: metaErr instanceof Error ? metaErr.message : String(metaErr),
    })
  }

  // Sync Google Ads spend
  try {
    const { getCampaignInsights: getGoogleInsights, listCampaigns: listGoogleCampaigns } = await import('./google-ads')
    const googleCampaigns = await listGoogleCampaigns(storeId)

    for (const campaign of googleCampaigns) {
      try {
        const insights = await getGoogleInsights(storeId, campaign.id)
        if (insights && typeof insights.cost === 'number' && insights.cost > 0) {
          const today = new Date().toISOString().split('T')[0]
          const spendAmount = insights.cost / 1_000_000 // cost is in micros

          await recordSpend({
            storeId,
            platform: 'google',
            campaignId: campaign.id,
            amount: spendAmount,
            currency,
            date: today,
            type: 'ad_spend',
          })

          googleSpend += spendAmount
          syncedRecords++
        }
      } catch (campaignErr) {
        log.warn('Failed to sync Google campaign spend', {
          storeId,
          campaignId: campaign.id,
          error: campaignErr instanceof Error ? campaignErr.message : String(campaignErr),
        })
      }
    }
  } catch (googleErr) {
    log.warn('Google Ads sync unavailable or failed', {
      storeId,
      error: googleErr instanceof Error ? googleErr.message : String(googleErr),
    })
  }

  log.info('Platform spend sync completed', {
    storeId,
    metaSpend,
    googleSpend,
    syncedRecords,
  })

  return { metaSpend, googleSpend, syncedRecords }
}
