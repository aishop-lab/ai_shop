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
  } = args as z.infer<typeof createAdCampaignSchema>

  try {
    if (platform === 'meta') {
      const { createCampaign } = await import('./meta-ads')
      const campaign = await createCampaign(storeId, {
        name,
        objective,
        dailyBudget,
        startDate,
        endDate,
        targeting,
      })

      return {
        success: true,
        data: campaign,
        summary: `Created Meta ad campaign "${name}" with ${dailyBudget}/day budget, objective: ${objective}`,
        relatedEntityType: 'ad_campaign',
        relatedEntityId: campaign.id,
      }
    } else {
      const { createCampaign } = await import('./google-ads')
      const campaign = await createCampaign(storeId, {
        name,
        objective,
        dailyBudget,
        startDate,
        endDate,
        keywords,
        headlines,
        descriptions,
        finalUrl,
      })

      return {
        success: true,
        data: campaign,
        summary: `Created Google Ads campaign "${name}" with ${dailyBudget}/day budget, objective: ${objective}`,
        relatedEntityType: 'ad_campaign',
        relatedEntityId: campaign.id,
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
  const { storeId, platform, campaignId, action } = args as z.infer<typeof pauseAdCampaignSchema>

  try {
    if (platform === 'meta') {
      const { updateCampaignStatus } = await import('./meta-ads')
      await updateCampaignStatus(storeId, campaignId, action)
    } else {
      const { updateCampaignStatus } = await import('./google-ads')
      await updateCampaignStatus(storeId, campaignId, action)
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
  const { storeId, platform, campaignId, newDailyBudget } = args as z.infer<typeof adjustBudgetSchema>

  try {
    // Check total spend limits before adjusting
    const { getBudget } = await import('./budget-manager')
    const budget = await getBudget(storeId)

    if (budget.monthlyLimit && budget.currentSpend + newDailyBudget > budget.monthlyLimit) {
      return {
        success: false,
        summary: `Budget adjustment rejected: new daily budget of ${newDailyBudget} would exceed monthly limit of ${budget.monthlyLimit} (current spend: ${budget.currentSpend})`,
      }
    }

    if (platform === 'meta') {
      const { updateCampaignBudget } = await import('./meta-ads')
      await updateCampaignBudget(storeId, campaignId, newDailyBudget)
    } else {
      const { updateCampaignBudget } = await import('./google-ads')
      await updateCampaignBudget(storeId, campaignId, newDailyBudget)
    }

    return {
      success: true,
      data: { campaignId, newDailyBudget, platform },
      summary: `Adjusted ${platform === 'meta' ? 'Meta' : 'Google'} campaign ${campaignId} daily budget to ${newDailyBudget}`,
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
  } = args as z.infer<typeof generateAdCreativeSchema>

  try {
    const { generateCreative } = await import('./content-generator')
    const creative = await generateCreative({
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
  const { storeId, platform, campaignId, period } = args as z.infer<typeof getAdPerformanceSchema>

  try {
    if (platform === 'meta') {
      const { getPerformance } = await import('./meta-ads')
      const metrics = await getPerformance(storeId, { campaignId, period })

      return {
        success: true,
        data: metrics,
        summary: `Retrieved Meta Ads performance for ${period}: ${metrics.impressions ?? 0} impressions, ${metrics.clicks ?? 0} clicks, ${metrics.conversions ?? 0} conversions, ROAS ${metrics.roas?.toFixed(2) ?? 'N/A'}`,
        relatedEntityType: campaignId ? 'ad_campaign' : undefined,
        relatedEntityId: campaignId,
      }
    } else {
      const { getPerformance } = await import('./google-ads')
      const metrics = await getPerformance(storeId, { campaignId, period })

      return {
        success: true,
        data: metrics,
        summary: `Retrieved Google Ads performance for ${period}: ${metrics.impressions ?? 0} impressions, ${metrics.clicks ?? 0} clicks, ${metrics.conversions ?? 0} conversions, ROAS ${metrics.roas?.toFixed(2) ?? 'N/A'}`,
        relatedEntityType: campaignId ? 'ad_campaign' : undefined,
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
    args as z.infer<typeof createSocialPostSchema>

  try {
    let finalContent = content

    if (generateContent) {
      const { generateSocialContent } = await import('./content-generator')
      finalContent = await generateSocialContent({
        storeId,
        platform,
        baseContent: content,
      })
    }

    const { createPost } = await import('./meta-ads')
    const post = await createPost(storeId, {
      platform,
      content: finalContent,
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
      relatedEntityId: post.id,
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
  const { storeId, platform } = args as z.infer<typeof getAudienceInsightsSchema>

  try {
    if (platform === 'meta') {
      const { getAudienceInsights } = await import('./meta-ads')
      const insights = await getAudienceInsights(storeId)

      return {
        success: true,
        data: insights,
        summary: `Retrieved Meta audience insights: ${insights.totalReach ?? 0} total reach, top demographics and interests available`,
      }
    } else {
      const { getAudienceInsights } = await import('./google-ads')
      const insights = await getAudienceInsights(storeId)

      return {
        success: true,
        data: insights,
        summary: `Retrieved Google Ads audience insights: keyword suggestions and affinity segments available`,
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
  const { storeId } = args as z.infer<typeof getBudgetStatusSchema>

  try {
    const { getBudget } = await import('./budget-manager')
    const budget = await getBudget(storeId)

    const utilizationPercent = budget.monthlyLimit
      ? Math.round((budget.currentSpend / budget.monthlyLimit) * 1000) / 10
      : null

    return {
      success: true,
      data: { ...budget, utilizationPercent },
      summary: `Marketing budget: ${budget.currentSpend} spent of ${budget.monthlyLimit ?? 'unlimited'} limit${utilizationPercent !== null ? ` (${utilizationPercent}% utilized)` : ''}, active campaigns: ${budget.activeCampaigns ?? 0}`,
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
  const { storeId, period } = args as z.infer<typeof getMarketingROASSchema>

  try {
    const { getROASAnalysis } = await import('./budget-manager')
    const analysis = await getROASAnalysis(storeId, period)

    return {
      success: true,
      data: analysis,
      summary: `ROAS analysis (${period}): overall ROAS ${analysis.overallROAS?.toFixed(2) ?? 'N/A'}, total spend ${analysis.totalSpend ?? 0}, total revenue from ads ${analysis.totalRevenue ?? 0}${analysis.topCampaign ? `, best performer: "${analysis.topCampaign}"` : ''}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, summary: `Failed to get ROAS analysis: ${msg}` }
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
]
