// src/lib/agents/marketing/tools.ts
// Marketing Agent tool definitions

import { z } from 'zod'
import type { AgentToolConfig, AgentExecutionContext } from '../base-agent'

// ---- Tool: createAdCampaign ----

const createAdCampaignSchema = z.object({
  storeId: z.string().describe('The store ID'),
  platform: z.enum(['meta', 'google']).describe('Ad platform to create campaign on'),
  name: z.string().describe('Campaign name'),
  objective: z.string().describe('Campaign objective (e.g., conversions, traffic, awareness)'),
  dailyBudget: z.number().describe('Daily budget in store currency'),
  startDate: z.string().describe('Campaign start date (ISO 8601)'),
  endDate: z.string().optional().describe('Campaign end date (ISO 8601)'),
  targeting: z.record(z.unknown()).optional().describe('Audience targeting parameters'),
  keywords: z.array(z.string()).optional().describe('Keywords for Google Ads campaigns'),
  headlines: z.array(z.string()).optional().describe('Ad headlines for Google Ads'),
  descriptions: z.array(z.string()).optional().describe('Ad descriptions for Google Ads'),
  finalUrl: z.string().optional().describe('Landing page URL for Google Ads'),
})

async function executeCreateAdCampaign(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const {
    storeId,
    platform,
    name,
    objective,
    dailyBudget,
    startDate,
    endDate,
    targeting,
    keywords,
    headlines,
    descriptions,
    finalUrl,
  } = createAdCampaignSchema.parse(args)

  try {
    if (platform === 'meta') {
      const { createCampaign } = await import('./meta-ads')
      const campaign = await createCampaign(storeId, {
        name,
        objective: objective as 'OUTCOME_AWARENESS' | 'OUTCOME_TRAFFIC' | 'OUTCOME_ENGAGEMENT' | 'OUTCOME_SALES',
        dailyBudget,
        startTime: startDate,
        endTime: endDate,
        targeting,
      })

      return {
        success: true,
        data: campaign,
        summary: `Created Meta ad campaign "${name}" with ${dailyBudget}/day budget, objective: ${objective}`,
        relatedEntityType: 'ad_campaign',
        relatedEntityId: campaign.campaignId,
      }
    } else {
      const { createSearchCampaign } = await import('./google-ads')
      const campaign = await createSearchCampaign(storeId, {
        name,
        dailyBudget,
        startDate,
        endDate,
        keywords: (keywords || []).map((k: string) => ({ text: k, matchType: 'BROAD' as const })),
        headlines: headlines || [],
        descriptions: descriptions || [],
        finalUrl: finalUrl || '',
      })

      return {
        success: true,
        data: campaign,
        summary: `Created Google Ads campaign "${name}" with ${dailyBudget}/day budget, objective: ${objective}`,
        relatedEntityType: 'ad_campaign',
        relatedEntityId: campaign.campaignId,
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('not connected') || msg.includes('MODULE_NOT_FOUND') || msg.includes('Cannot find module')) {
      return {
        success: false,
        summary: `${platform === 'meta' ? 'Meta Ads' : 'Google Ads'} account not connected. Please connect your ${platform === 'meta' ? 'Meta Business' : 'Google Ads'} account in Settings → Marketing.`,
      }
    }
    return { success: false, summary: `Failed to create ${platform} campaign: ${msg}` }
  }
}

// ---- Tool: pauseAdCampaign ----

const pauseAdCampaignSchema = z.object({
  storeId: z.string().describe('The store ID'),
  platform: z.enum(['meta', 'google']).describe('Ad platform'),
  campaignId: z.string().describe('The campaign ID to pause or resume'),
  action: z.enum(['pause', 'resume']).describe('Whether to pause or resume the campaign'),
})

async function executePauseAdCampaign(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, platform, campaignId, action } = pauseAdCampaignSchema.parse(args)

  try {
    if (platform === 'meta') {
      const metaStatus = action === 'pause' ? 'PAUSED' as const : 'ACTIVE' as const
      const { updateCampaignStatus } = await import('./meta-ads')
      await updateCampaignStatus(storeId, campaignId, metaStatus)
    } else {
      const googleStatus = action === 'pause' ? 'PAUSED' as const : 'ENABLED' as const
      const { updateCampaignStatus } = await import('./google-ads')
      await updateCampaignStatus(storeId, campaignId, googleStatus)
    }

    return {
      success: true,
      data: { campaignId, action },
      summary: `${action === 'pause' ? 'Paused' : 'Resumed'} ${platform === 'meta' ? 'Meta' : 'Google'} campaign ${campaignId}`,
      relatedEntityType: 'ad_campaign',
      relatedEntityId: campaignId,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('not connected') || msg.includes('MODULE_NOT_FOUND') || msg.includes('Cannot find module')) {
      return {
        success: false,
        summary: `${platform === 'meta' ? 'Meta Ads' : 'Google Ads'} account not connected. Please connect your ${platform === 'meta' ? 'Meta Business' : 'Google Ads'} account in Settings → Marketing.`,
      }
    }
    return { success: false, summary: `Failed to ${action} campaign ${campaignId}: ${msg}` }
  }
}

// ---- Tool: adjustBudget ----

const adjustBudgetSchema = z.object({
  storeId: z.string().describe('The store ID'),
  platform: z.enum(['meta', 'google']).describe('Ad platform'),
  campaignId: z.string().describe('The campaign ID to adjust budget for'),
  newDailyBudget: z.number().describe('New daily budget amount in store currency'),
})

async function executeAdjustBudget(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, platform, campaignId, newDailyBudget } = adjustBudgetSchema.parse(args)

  try {
    // Check total spend limits before adjusting
    const { getBudgetStatus } = await import('./budget-manager')
    const budget = await getBudgetStatus(storeId)

    if (budget.monthlyLimit && budget.currentSpend + newDailyBudget > budget.monthlyLimit) {
      return {
        success: false,
        summary: `Budget adjustment rejected: new daily budget of ${newDailyBudget} would exceed monthly limit of ${budget.monthlyLimit} (current spend: ${budget.currentSpend})`,
      }
    }

    if (platform === 'meta') {
      // Meta API doesn't expose a direct budget update — budget is set at ad set level during creation
      return {
        success: false,
        summary: 'Budget adjustment for Meta campaigns is not yet supported. Please update the budget in Meta Ads Manager.',
      }
    } else {
      const { adjustBudget } = await import('./google-ads')
      await adjustBudget(storeId, campaignId, newDailyBudget)
    }

    return {
      success: true,
      data: { campaignId, newDailyBudget, platform },
      summary: `Adjusted Google Ads campaign ${campaignId} daily budget to ${newDailyBudget}`,
      relatedEntityType: 'ad_campaign',
      relatedEntityId: campaignId,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('not connected') || msg.includes('MODULE_NOT_FOUND') || msg.includes('Cannot find module')) {
      return {
        success: false,
        summary: `${platform === 'meta' ? 'Meta Ads' : 'Google Ads'} account not connected. Please connect your ${platform === 'meta' ? 'Meta Business' : 'Google Ads'} account in Settings → Marketing.`,
      }
    }
    return { success: false, summary: `Failed to adjust budget for campaign ${campaignId}: ${msg}` }
  }
}

// ---- Tool: generateAdCreative ----

const generateAdCreativeSchema = z.object({
  storeId: z.string().describe('The store ID'),
  productId: z.string().optional().describe('Product ID to generate creative for'),
  productTitle: z.string().describe('Product title'),
  productDescription: z.string().describe('Product description'),
  productPrice: z.number().describe('Product price'),
  currency: z.string().describe('Currency code (e.g., INR, USD)'),
  platform: z.enum(['meta', 'google']).describe('Target ad platform'),
  format: z.string().describe('Ad format (e.g., single_image, carousel, responsive_search, responsive_display)'),
  tone: z.string().optional().describe('Tone of the ad copy (e.g., urgent, aspirational, informative)'),
  targetAudience: z.string().optional().describe('Description of the target audience'),
})

async function executeGenerateAdCreative(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const {
    storeId,
    productId,
    productTitle,
    productDescription,
    productPrice,
    currency,
    platform,
    format,
    tone,
    targetAudience,
  } = generateAdCreativeSchema.parse(args)

  try {
    const { generateAdCreative } = await import('./content-generator')
    const creative = await generateAdCreative({
      storeId,
      productId,
      productTitle,
      productDescription,
      productPrice,
      currency,
      platform: platform as 'meta' | 'google',
      format: format as 'single_image' | 'carousel' | 'video' | 'search_text',
      tone,
      targetAudience,
    })

    return {
      success: true,
      data: creative,
      summary: `Generated ${format} ad creative for "${productTitle}" on ${platform === 'meta' ? 'Meta' : 'Google'} (${tone || 'default'} tone)`,
      relatedEntityType: productId ? 'product' : undefined,
      relatedEntityId: productId,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to generate ad creative: ${msg}` }
  }
}

// ---- Tool: getAdPerformance ----

const getAdPerformanceSchema = z.object({
  storeId: z.string().describe('The store ID'),
  platform: z.enum(['meta', 'google']).describe('Ad platform'),
  campaignId: z.string().optional().describe('Specific campaign ID, or omit for all campaigns'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period for performance data'),
})

async function executeGetAdPerformance(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, platform, campaignId, period } = getAdPerformanceSchema.parse(args)

  try {
    if (platform === 'meta') {
      const { getCampaignInsights } = await import('./meta-ads')
      if (!campaignId) {
        return { success: false, summary: 'Campaign ID is required for Meta Ads performance data' }
      }
      const metrics = await getCampaignInsights(storeId, campaignId)

      return {
        success: true,
        data: metrics,
        summary: `Retrieved Meta Ads performance for ${period}: ${metrics.impressions ?? 0} impressions, ${metrics.clicks ?? 0} clicks, ${metrics.conversions ?? 0} conversions, ROAS ${metrics.roas?.toFixed(2) ?? 'N/A'}`,
        relatedEntityType: 'ad_campaign',
        relatedEntityId: campaignId,
      }
    } else {
      const { getCampaignInsights } = await import('./google-ads')
      if (!campaignId) {
        return { success: false, summary: 'Campaign ID is required for Google Ads performance data' }
      }
      const metrics = await getCampaignInsights(storeId, campaignId)

      return {
        success: true,
        data: metrics,
        summary: `Retrieved Google Ads performance for ${period}: ${metrics.impressions ?? 0} impressions, ${metrics.clicks ?? 0} clicks, ${metrics.conversions ?? 0} conversions, ROAS ${metrics.roas?.toFixed(2) ?? 'N/A'}`,
        relatedEntityType: 'ad_campaign',
        relatedEntityId: campaignId,
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('not connected') || msg.includes('MODULE_NOT_FOUND') || msg.includes('Cannot find module')) {
      return {
        success: false,
        summary: `${platform === 'meta' ? 'Meta Ads' : 'Google Ads'} account not connected. Please connect your ${platform === 'meta' ? 'Meta Business' : 'Google Ads'} account in Settings → Marketing.`,
      }
    }
    return { success: false, summary: `Failed to get ${platform} ad performance: ${msg}` }
  }
}

// ---- Tool: createSocialPost ----

const createSocialPostSchema = z.object({
  storeId: z.string().describe('The store ID'),
  platform: z.enum(['instagram', 'facebook']).describe('Social media platform'),
  content: z.string().describe('Post content/caption'),
  imageUrl: z.string().optional().describe('Image URL to include in the post'),
  scheduledTime: z.string().optional().describe('ISO 8601 datetime to schedule the post for'),
  generateContent: z.boolean().optional().describe('If true, use AI to enhance/generate the content'),
})

async function executeCreateSocialPost(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, platform, content, imageUrl, scheduledTime, generateContent } =
    createSocialPostSchema.parse(args)

  try {
    let finalContent = content

    if (generateContent) {
      const { generateSocialPost } = await import('./content-generator')
      const result = await generateSocialPost({
        storeId,
        platform,
        postType: 'product_showcase',
        productTitle: content,
      })
      finalContent = result.caption
    }

    const { createPost } = await import('./meta-ads')
    const post = await createPost(storeId, {
      message: finalContent,
      imageUrl,
      scheduledTime,
    })

    const scheduleInfo = scheduledTime
      ? ` scheduled for ${new Date(scheduledTime).toLocaleString()}`
      : ' (publishing now)'

    return {
      success: true,
      data: { ...post, content: finalContent },
      summary: `Created ${platform} post${scheduleInfo}${generateContent ? ' (AI-enhanced content)' : ''}`,
      relatedEntityType: 'social_post',
      relatedEntityId: post.postId,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('not connected') || msg.includes('MODULE_NOT_FOUND') || msg.includes('Cannot find module')) {
      return {
        success: false,
        summary: `Meta Business account not connected. Please connect your Meta Business account in Settings → Marketing to post on ${platform}.`,
      }
    }
    return { success: false, summary: `Failed to create ${platform} post: ${msg}` }
  }
}

// ---- Tool: getAudienceInsights ----

const getAudienceInsightsSchema = z.object({
  storeId: z.string().describe('The store ID'),
  platform: z.enum(['meta', 'google']).describe('Ad platform to get audience insights from'),
})

async function executeGetAudienceInsights(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, platform } = getAudienceInsightsSchema.parse(args)

  try {
    if (platform === 'meta') {
      const { getAudienceSuggestions } = await import('./meta-ads')
      const suggestions = await getAudienceSuggestions(storeId)

      return {
        success: true,
        data: suggestions,
        summary: `Retrieved Meta audience suggestions with targeting options available`,
      }
    } else {
      const { getKeywordSuggestions } = await import('./google-ads')
      const suggestions = await getKeywordSuggestions(storeId, { productTitle: 'general' })

      return {
        success: true,
        data: suggestions,
        summary: `Retrieved Google Ads keyword suggestions for audience targeting`,
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('not connected') || msg.includes('MODULE_NOT_FOUND') || msg.includes('Cannot find module')) {
      return {
        success: false,
        summary: `${platform === 'meta' ? 'Meta Ads' : 'Google Ads'} account not connected. Please connect your ${platform === 'meta' ? 'Meta Business' : 'Google Ads'} account in Settings → Marketing.`,
      }
    }
    return { success: false, summary: `Failed to get ${platform} audience insights: ${msg}` }
  }
}

// ---- Tool: getBudgetStatus ----

const getBudgetStatusSchema = z.object({
  storeId: z.string().describe('The store ID'),
})

async function executeGetBudgetStatus(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId } = getBudgetStatusSchema.parse(args)

  try {
    const { getBudgetStatus } = await import('./budget-manager')
    const budget = await getBudgetStatus(storeId)

    const utilizationPercent = budget.monthlyLimit
      ? Math.round((budget.currentSpend / budget.monthlyLimit) * 1000) / 10
      : null

    return {
      success: true,
      data: { ...budget, utilizationPercent },
      summary: `Marketing budget: ${budget.currentSpend} ${budget.currency} spent of ${budget.monthlyLimit || 'unlimited'} limit${utilizationPercent !== null ? ` (${utilizationPercent}% utilized)` : ''}, warning: ${budget.warningLevel}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to get budget status: ${msg}` }
  }
}

// ---- Tool: getMarketingROAS ----

const getMarketingROASSchema = z.object({
  storeId: z.string().describe('The store ID'),
  period: z.enum(['7d', '30d', '90d']).describe('Time period for ROAS analysis'),
})

async function executeGetMarketingROAS(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, period } = getMarketingROASSchema.parse(args)

  try {
    const { getOverallROAS } = await import('./budget-manager')
    const analysis = await getOverallROAS(storeId, period)

    return {
      success: true,
      data: analysis,
      summary: `ROAS analysis (${period}): overall ROAS ${analysis.overallROAS?.toFixed(2) ?? 'N/A'}, total spend ${analysis.totalSpend ?? 0}, total revenue from ads ${analysis.totalRevenue ?? 0}${analysis.topCampaigns?.[0] ? `, best performer: campaign ${analysis.topCampaigns[0].campaignId} (ROAS ${analysis.topCampaigns[0].roas.toFixed(2)})` : ''}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to get ROAS analysis: ${msg}` }
  }
}

// ---- Tool: getUpcomingSeasonalEvents ----

const getUpcomingSeasonalEventsSchema = z.object({
  daysAhead: z.number().describe('Number of days ahead to look for upcoming events (e.g., 30, 60, 90)'),
})

async function executeGetUpcomingSeasonalEvents(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { daysAhead } = getUpcomingSeasonalEventsSchema.parse(args)

  try {
    const { getUpcomingEvents } = await import('./seasonal-campaigns')
    const events = getUpcomingEvents(daysAhead)

    if (events.length === 0) {
      return {
        success: true,
        data: { events: [], count: 0 },
        summary: `No seasonal events found in the next ${daysAhead} days`,
      }
    }

    const eventSummaries = events.map((e) => `${e.name} (in ${e.daysUntil} days, ${e.nextOccurrence})`).join(', ')

    return {
      success: true,
      data: { events, count: events.length },
      summary: `Found ${events.length} upcoming events in next ${daysAhead} days: ${eventSummaries}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to get upcoming events: ${msg}` }
  }
}

// ---- Tool: generateSeasonalCampaign ----

const generateSeasonalCampaignSchema = z.object({
  storeId: z.string().describe('The store ID'),
  eventId: z.string().describe('The seasonal event ID (e.g., diwali, black-friday, christmas)'),
})

async function executeGenerateSeasonalCampaign(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { storeId, eventId } = generateSeasonalCampaignSchema.parse(args)

  try {
    const { generateCampaignPlan } = await import('./seasonal-campaigns')
    const plan = await generateCampaignPlan(storeId, eventId)

    return {
      success: true,
      data: plan,
      summary: `Generated ${plan.phases.length}-phase campaign plan for ${plan.eventName}: estimated budget ${plan.totalEstimatedBudget.min}-${plan.totalEstimatedBudget.max} ${plan.totalEstimatedBudget.currency}, expected ROAS ${plan.expectedROAS.min.toFixed(1)}-${plan.expectedROAS.max.toFixed(1)}x`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to generate seasonal campaign plan: ${msg}` }
  }
}

// ---- Tool: getSeasonalCalendar ----

const getSeasonalCalendarSchema = z.object({
  month: z.number().min(1).max(12).optional().describe('Month number (1-12) to filter events, or omit for full year calendar'),
})

async function executeGetSeasonalCalendar(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const { month } = getSeasonalCalendarSchema.parse(args)

  try {
    const { getSeasonalCalendar } = await import('./seasonal-campaigns')
    const events = getSeasonalCalendar(month)

    const monthLabel = month
      ? new Date(2026, month - 1, 1).toLocaleString('en', { month: 'long' })
      : 'full year'

    const eventNames = events.map((e) => `${e.name} (${e.region}, ${e.category})`).join(', ')

    return {
      success: true,
      data: { events, count: events.length, period: monthLabel },
      summary: `Seasonal calendar for ${monthLabel}: ${events.length} events — ${eventNames}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to get seasonal calendar: ${msg}` }
  }
}

// ---- Tool: trackConversion ----

const trackConversionSchema = z.object({
  storeId: z.string().describe('The store ID'),
  eventName: z.enum(['Purchase', 'AddToCart', 'InitiateCheckout', 'ViewContent', 'Lead', 'CompleteRegistration']).describe('The conversion event type'),
  email: z.string().optional().describe('Customer email (will be hashed before sending)'),
  phone: z.string().optional().describe('Customer phone number (will be hashed before sending)'),
  clientIpAddress: z.string().optional().describe('Client IP address'),
  clientUserAgent: z.string().optional().describe('Client user agent string'),
  fbc: z.string().optional().describe('Meta click ID from _fbc cookie'),
  fbp: z.string().optional().describe('Meta browser ID from _fbp cookie'),
  currency: z.string().optional().describe('Currency code (e.g., INR, USD)'),
  value: z.number().optional().describe('Monetary value of the event'),
  contentIds: z.array(z.string()).optional().describe('Product/content IDs involved'),
  contentType: z.string().optional().describe('Content type (e.g., product)'),
  numItems: z.number().optional().describe('Number of items'),
  orderId: z.string().optional().describe('Order ID for purchase events'),
  eventSourceUrl: z.string().optional().describe('URL where the event occurred'),
})

async function executeTrackConversion(
  args: Record<string, unknown>,
  _context: AgentExecutionContext
) {
  const {
    storeId,
    eventName,
    email,
    phone,
    clientIpAddress,
    clientUserAgent,
    fbc,
    fbp,
    currency,
    value,
    contentIds,
    contentType,
    numItems,
    orderId,
    eventSourceUrl,
  } = trackConversionSchema.parse(args)

  try {
    const { sendConversionEvent, hashUserData } = await import('./meta-capi')

    // Build user_data with hashed PII
    const userData: Record<string, unknown> = {}
    if (email) userData.em = [hashUserData(email)]
    if (phone) userData.ph = [hashUserData(phone)]
    if (clientIpAddress) userData.client_ip_address = clientIpAddress
    if (clientUserAgent) userData.client_user_agent = clientUserAgent
    if (fbc) userData.fbc = fbc
    if (fbp) userData.fbp = fbp

    // Build custom_data
    const customData: Record<string, unknown> = {}
    if (currency) customData.currency = currency
    if (value !== undefined) customData.value = value
    if (contentIds) customData.content_ids = contentIds
    if (contentType) customData.content_type = contentType
    if (numItems !== undefined) customData.num_items = numItems
    if (orderId) customData.order_id = orderId

    const result = await sendConversionEvent(storeId, {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      user_data: userData as import('./meta-capi').ConversionEvent['user_data'],
      custom_data: Object.keys(customData).length > 0 ? customData as import('./meta-capi').ConversionEvent['custom_data'] : undefined,
      event_source_url: eventSourceUrl,
      action_source: 'website',
      event_id: orderId ? `${eventName.toLowerCase()}_${orderId}` : `${eventName.toLowerCase()}_${Date.now()}`,
    })

    return {
      success: true,
      data: { eventsReceived: result.events_received, fbtrace_id: result.fbtrace_id },
      summary: `Sent ${eventName} conversion event to Meta CAPI (${result.events_received} event received)${orderId ? ` for order ${orderId}` : ''}${value ? ` — value: ${currency || ''} ${value}` : ''}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('not connected') || msg.includes('Pixel ID not configured')) {
      return {
        success: false,
        summary: 'Meta account not connected or Pixel ID not configured. Please connect your Meta Business account and configure your Pixel in Settings > Connections.',
      }
    }
    return { success: false, summary: `Failed to send ${eventName} conversion event: ${msg}` }
  }
}

// ---- Export all tools ----

export const marketingTools: AgentToolConfig[] = [
  {
    name: 'createAdCampaign',
    description: 'Create an ad campaign on Meta (Facebook/Instagram) or Google Ads with budget, targeting, and creative configuration',
    inputSchema: createAdCampaignSchema,
    category: 'campaign',
    riskLevel: 'high',
    execute: executeCreateAdCampaign,
  },
  {
    name: 'pauseAdCampaign',
    description: 'Pause or resume an existing ad campaign on Meta or Google Ads',
    inputSchema: pauseAdCampaignSchema,
    category: 'campaign',
    riskLevel: 'medium',
    execute: executePauseAdCampaign,
  },
  {
    name: 'adjustBudget',
    description: 'Adjust the daily budget for an ad campaign, with spend limit validation',
    inputSchema: adjustBudgetSchema,
    category: 'campaign',
    riskLevel: 'high',
    execute: executeAdjustBudget,
  },
  {
    name: 'generateAdCreative',
    description: 'Generate AI-powered ad copy including headlines, descriptions, and CTAs tailored for the target platform and audience',
    inputSchema: generateAdCreativeSchema,
    category: 'campaign',
    riskLevel: 'low',
    execute: executeGenerateAdCreative,
  },
  {
    name: 'getAdPerformance',
    description: 'Get performance metrics for ad campaigns including impressions, clicks, conversions, spend, and ROAS',
    inputSchema: getAdPerformanceSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetAdPerformance,
  },
  {
    name: 'createSocialPost',
    description: 'Create or schedule a social media post on Instagram or Facebook, with optional AI content generation',
    inputSchema: createSocialPostSchema,
    category: 'communication',
    riskLevel: 'medium',
    execute: executeCreateSocialPost,
  },
  {
    name: 'getAudienceInsights',
    description: 'Get audience demographics, interests, and targeting suggestions from Meta or Google Ads',
    inputSchema: getAudienceInsightsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetAudienceInsights,
  },
  {
    name: 'getBudgetStatus',
    description: 'Get current marketing budget status including spend, limits, utilization percentage, and active campaign count',
    inputSchema: getBudgetStatusSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetBudgetStatus,
  },
  {
    name: 'getMarketingROAS',
    description: 'Get return on ad spend analysis with per-campaign breakdown, revenue attribution, and top performers',
    inputSchema: getMarketingROASSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetMarketingROAS,
  },
  {
    name: 'getUpcomingSeasonalEvents',
    description: 'Get upcoming seasonal events (Indian festivals, global holidays, sales events) with campaign suggestions and recommended channels',
    inputSchema: getUpcomingSeasonalEventsSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetUpcomingSeasonalEvents,
  },
  {
    name: 'generateSeasonalCampaign',
    description: 'AI-generate a full multi-phase campaign plan for a seasonal event including email, social, WhatsApp content, budget allocation, and timeline',
    inputSchema: generateSeasonalCampaignSchema,
    category: 'campaign',
    riskLevel: 'low',
    execute: executeGenerateSeasonalCampaign,
  },
  {
    name: 'getSeasonalCalendar',
    description: 'Get the full seasonal marketing calendar with Indian festivals, global holidays, and sale events, optionally filtered by month',
    inputSchema: getSeasonalCalendarSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeGetSeasonalCalendar,
  },
  {
    name: 'trackConversion',
    description: 'Send a server-side conversion event (Purchase, AddToCart, ViewContent, etc.) to Meta Conversions API for accurate attribution tracking',
    inputSchema: trackConversionSchema,
    category: 'analysis',
    riskLevel: 'low',
    execute: executeTrackConversion,
  },
]
