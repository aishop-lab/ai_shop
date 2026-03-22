// src/lib/agents/marketing/content-generator.ts
// AI-powered content generator for the Marketing Agent
// Generates ad copy, social media posts, email campaigns, and validates ad policies

import { generateText } from 'ai'
import { getModelForTier } from '../model-router'
import { trackUsage } from '../cost-tracker'
import { logAgentAction } from '../db'

// ============================================
// TYPES
// ============================================

export interface AdCreativeParams {
  storeId: string
  productId?: string
  productTitle: string
  productDescription: string
  productPrice: number
  currency: string
  platform: 'meta' | 'google'
  format: 'single_image' | 'carousel' | 'video' | 'search_text'
  tone?: string
  targetAudience?: string
}

export interface AdCreativeResult {
  headlines: string[]
  descriptions: string[]
  callToAction: string
  imageSuggestions: string[]
  hashtags: string[]
}

export interface SocialPostParams {
  storeId: string
  platform: 'instagram' | 'facebook'
  postType: 'product_showcase' | 'promotion' | 'behind_the_scenes' | 'announcement' | 'engagement'
  productTitle?: string
  productDescription?: string
  productPrice?: number
  currency?: string
  promotionDetails?: string
  tone?: string
  brandVoice?: string
}

export interface SocialPostResult {
  caption: string
  hashtags: string[]
  bestPostingTime: string
  imageSuggestions: string[]
}

export interface EmailCampaignParams {
  storeId: string
  campaignType: 'product_launch' | 'seasonal_sale' | 'newsletter' | 'flash_sale' | 'loyalty_reward'
  products: Array<{ title: string; price: number; description: string }>
  discountPercent?: number
  tone?: string
}

export interface EmailCampaignResult {
  subject: string
  previewText: string
  headline: string
  body: string
  ctaText: string
}

export interface AdPolicyCheckParams {
  platform: 'meta' | 'google'
  headlines: string[]
  descriptions: string[]
}

export interface AdPolicyIssue {
  field: string
  issue: string
  severity: 'error' | 'warning'
}

export interface AdPolicyResult {
  passed: boolean
  issues: AdPolicyIssue[]
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TONE = 'professional, compelling, clear'

// Platform-specific character limits
const AD_LIMITS = {
  meta: {
    headline: 40,
    description: 125,
  },
  google: {
    headline: 30,
    description: 90,
  },
} as const

// Prohibited content categories for ad policy checks
const PROHIBITED_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(guaranteed|guarantee)\b/i, category: 'Misleading claims' },
  { pattern: /\b(miracle|revolutionary cure)\b/i, category: 'Exaggerated health claims' },
  { pattern: /\b(get rich|make money fast|earn \$?\d+k?)\b/i, category: 'Misleading financial claims' },
  { pattern: /\b(FREE!!+|ACT NOW!!+|LIMITED TIME!!+)\b/, category: 'Excessive capitalization/punctuation' },
  { pattern: /[!]{3,}/, category: 'Excessive punctuation' },
  { pattern: /[A-Z\s]{15,}/, category: 'Excessive capitalization' },
  { pattern: /\b(before\s+and\s+after)\b/i, category: 'Before/after claims (restricted on Meta)' },
  { pattern: /\b(click\s+here|click\s+this)\b/i, category: 'Generic CTA (low quality)' },
]

// ============================================
// HELPERS
// ============================================

function formatCurrency(price: number, currency: string): string {
  if (currency === 'INR') {
    return `₹${price.toLocaleString('en-IN')}`
  }
  return `${currency} ${price.toLocaleString('en-US')}`
}

function parseJsonFromLlm<T>(text: string, fallback: T): T {
  try {
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}

// ============================================
// 1. GENERATE AD CREATIVE
// ============================================

export async function generateAdCreative(params: AdCreativeParams): Promise<AdCreativeResult> {
  const {
    storeId,
    productTitle,
    productDescription,
    productPrice,
    currency,
    platform,
    format,
    tone = DEFAULT_TONE,
    targetAudience,
  } = params

  const limits = AD_LIMITS[platform]
  const formattedPrice = formatCurrency(productPrice, currency)

  const platformLabel = platform === 'meta' ? 'Meta (Facebook/Instagram)' : 'Google Ads'
  const formatInstructions = getFormatInstructions(format, platform)

  const model = getModelForTier('fast')
  const result = await generateText({
    model,
    system: `You are an expert e-commerce advertising copywriter specializing in ${platformLabel} ads. You write for merchants in India and globally. Your copy is ${tone}. Always respect character limits strictly — every headline and description MUST fit within the specified limits. Never use misleading claims or prohibited ad content.`,
    prompt: `Generate ad creative for this product:

Product: ${productTitle}
Description: ${productDescription}
Price: ${formattedPrice}
Platform: ${platformLabel}
Ad Format: ${format}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

Character limits:
- Headlines: max ${limits.headline} characters each
- Descriptions: max ${limits.description} characters each

${formatInstructions}

Respond in JSON format:
{
  "headlines": ["headline1", "headline2", "headline3", "headline4", "headline5"],
  "descriptions": ["description1", "description2", "description3"],
  "callToAction": "Shop Now",
  "imageSuggestions": ["suggestion for image 1", "suggestion for image 2", "suggestion for image 3"],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
}

Generate 5 headline variations and 3 description variations. Each headline must be under ${limits.headline} characters. Each description must be under ${limits.description} characters. Provide 3 image composition suggestions and 5 relevant hashtags.`,
  })

  await trackUsage({
    storeId,
    agentType: 'marketing',
    modelUsed: 'gemini-2.0-flash',
    tokensInput: result.usage?.inputTokens || 0,
    tokensOutput: result.usage?.outputTokens || 0,
  })

  const parsed = parseJsonFromLlm<AdCreativeResult>(result.text, {
    headlines: [`${productTitle} — ${formattedPrice}`],
    descriptions: [productDescription.slice(0, limits.description)],
    callToAction: 'Shop Now',
    imageSuggestions: [],
    hashtags: [],
  })

  // Enforce character limits on parsed output
  parsed.headlines = parsed.headlines
    .map((h) => h.slice(0, limits.headline))
    .filter((h) => h.length > 0)
  parsed.descriptions = parsed.descriptions
    .map((d) => d.slice(0, limits.description))
    .filter((d) => d.length > 0)

  await logAgentAction({
    storeId,
    agentType: 'marketing',
    actionType: 'generate_ad_creative',
    actionCategory: 'campaign',
    summary: `Generated ${platform} ${format} ad creative for "${productTitle}"`,
    details: { productTitle, platform, format, headlineCount: parsed.headlines.length, descriptionCount: parsed.descriptions.length },
    status: 'completed',
    executionMode: 'auto',
  })

  return parsed
}

function getFormatInstructions(format: string, platform: string): string {
  switch (format) {
    case 'carousel':
      return 'This is a carousel ad. Generate headlines that work as a sequence telling a story across cards. Image suggestions should describe each card.'
    case 'video':
      return 'This is a video ad. Generate headlines suitable for video overlays — short, punchy, attention-grabbing. Image suggestions should describe key video frames or scenes.'
    case 'search_text':
      return platform === 'google'
        ? 'This is a Google Search text ad. Generate headlines that include the product name or key benefit. Descriptions should include a clear value proposition and call to action. No image suggestions needed for text ads.'
        : 'This is a text-based ad. Keep copy direct and benefit-focused.'
    case 'single_image':
    default:
      return 'This is a single image ad. Generate compelling headlines that pair well with a product photo. Image suggestions should describe ideal product photography setups.'
  }
}

// ============================================
// 2. GENERATE SOCIAL POST
// ============================================

export async function generateSocialPost(params: SocialPostParams): Promise<SocialPostResult> {
  const {
    storeId,
    platform,
    postType,
    productTitle,
    productDescription,
    productPrice,
    currency,
    promotionDetails,
    tone = DEFAULT_TONE,
    brandVoice,
  } = params

  const priceStr = productPrice && currency ? formatCurrency(productPrice, currency) : ''

  const postTypeInstructions = getPostTypeInstructions(postType)

  const model = getModelForTier('fast')
  const result = await generateText({
    model,
    system: `You are a social media marketing expert for e-commerce brands. You create engaging ${platform} content that drives sales and builds community. Your writing style is ${tone}.${brandVoice ? ` Brand voice: ${brandVoice}.` : ''} You understand Indian social media trends and festivals (Diwali, Holi, Navratri, etc.) and incorporate them when relevant. Keep captions concise and engaging — avoid walls of text.`,
    prompt: `Generate a ${platform} post for the following:

Post Type: ${postType}
${productTitle ? `Product: ${productTitle}` : ''}
${productDescription ? `Description: ${productDescription}` : ''}
${priceStr ? `Price: ${priceStr}` : ''}
${promotionDetails ? `Promotion: ${promotionDetails}` : ''}

${postTypeInstructions}

Respond in JSON format:
{
  "caption": "The full post caption with line breaks as \\n",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10"],
  "bestPostingTime": "e.g., Tuesday 11:00 AM IST",
  "imageSuggestions": ["suggestion for image/visual 1", "suggestion for image/visual 2"]
}

Generate up to 10 relevant hashtags mixing popular and niche tags. Suggest the best posting time for ${platform} in IST (Indian Standard Time). Provide 2-3 image/visual suggestions.`,
  })

  await trackUsage({
    storeId,
    agentType: 'marketing',
    modelUsed: 'gemini-2.0-flash',
    tokensInput: result.usage?.inputTokens || 0,
    tokensOutput: result.usage?.outputTokens || 0,
  })

  const parsed = parseJsonFromLlm<SocialPostResult>(result.text, {
    caption: productTitle ? `Check out ${productTitle}! ${priceStr}` : 'New post from our store!',
    hashtags: ['#shopping', '#onlineshopping'],
    bestPostingTime: 'Tuesday 11:00 AM IST',
    imageSuggestions: [],
  })

  await logAgentAction({
    storeId,
    agentType: 'marketing',
    actionType: 'generate_social_post',
    actionCategory: 'campaign',
    summary: `Generated ${platform} ${postType} post${productTitle ? ` for "${productTitle}"` : ''}`,
    details: { platform, postType, productTitle, captionLength: parsed.caption.length, hashtagCount: parsed.hashtags.length },
    status: 'completed',
    executionMode: 'auto',
  })

  return parsed
}

function getPostTypeInstructions(postType: string): string {
  switch (postType) {
    case 'product_showcase':
      return 'Showcase the product with enthusiasm. Highlight key features and benefits. Include the price naturally. End with a call to action to visit the store.'
    case 'promotion':
      return 'Create urgency around the promotion. Highlight the discount or offer clearly. Use action-oriented language. Include clear terms if applicable.'
    case 'behind_the_scenes':
      return 'Create authentic, relatable content showing the human side of the business. Use casual, friendly language. Focus on storytelling.'
    case 'announcement':
      return 'Make the announcement feel exciting and important. Be clear about what is new or changing. Build anticipation.'
    case 'engagement':
      return 'Ask a question or create interactive content. Encourage comments and shares. Keep it fun and relatable. Use polls or "this or that" formats when possible.'
    default:
      return 'Create an engaging, on-brand post that drives interaction.'
  }
}

// ============================================
// 3. GENERATE EMAIL CAMPAIGN CONTENT
// ============================================

export async function generateEmailCampaignContent(
  params: EmailCampaignParams
): Promise<EmailCampaignResult> {
  const { storeId, campaignType, products, discountPercent, tone = DEFAULT_TONE } = params

  const campaignLabel = campaignType.replace(/_/g, ' ')
  const productList = products
    .map((p) => `- ${p.title} (${p.description}) — Price: ${p.price}`)
    .join('\n')

  const model = getModelForTier('fast')
  const result = await generateText({
    model,
    system: `You are an email marketing expert for e-commerce. You write ${tone} emails that drive conversions while staying out of spam folders. Keep subject lines under 50 characters when possible. Write scannable, mobile-friendly email body copy — short paragraphs, clear hierarchy. Understand Indian commerce context (festivals, UPI payments, COD, etc.).`,
    prompt: `Generate marketing email content for a ${campaignLabel} campaign.

Campaign Type: ${campaignType}
${discountPercent ? `Discount: ${discountPercent}% off` : ''}

Products featured:
${productList}

Respond in JSON format:
{
  "subject": "Email subject line (under 50 chars ideally)",
  "previewText": "Preview/preheader text (under 100 chars)",
  "headline": "Main email headline",
  "body": "Email body copy in HTML-safe plain text. Use \\n for line breaks. Keep it concise — 3-5 short paragraphs max.",
  "ctaText": "Call-to-action button text (2-5 words)"
}

Guidelines by campaign type:
${getCampaignGuidelines(campaignType)}`,
  })

  await trackUsage({
    storeId,
    agentType: 'marketing',
    modelUsed: 'gemini-2.0-flash',
    tokensInput: result.usage?.inputTokens || 0,
    tokensOutput: result.usage?.outputTokens || 0,
  })

  const fallbackSubject = discountPercent
    ? `${discountPercent}% Off — ${campaignLabel}`
    : `New: ${products[0]?.title || campaignLabel}`

  const parsed = parseJsonFromLlm<EmailCampaignResult>(result.text, {
    subject: fallbackSubject,
    previewText: `Don't miss our latest ${campaignLabel}`,
    headline: fallbackSubject,
    body: products.map((p) => p.title).join(', '),
    ctaText: 'Shop Now',
  })

  await logAgentAction({
    storeId,
    agentType: 'marketing',
    actionType: 'generate_email_campaign',
    actionCategory: 'communication',
    summary: `Generated ${campaignType} email campaign with ${products.length} products`,
    details: { campaignType, productCount: products.length, discountPercent, subjectLength: parsed.subject.length },
    status: 'completed',
    executionMode: 'auto',
  })

  return parsed
}

function getCampaignGuidelines(campaignType: string): string {
  switch (campaignType) {
    case 'product_launch':
      return 'Build excitement for the new product. Highlight what makes it special. Create a sense of exclusivity — "be the first to get it."'
    case 'seasonal_sale':
      return 'Tie the sale to the season or festival. Create urgency with a deadline. Highlight the best deals upfront.'
    case 'newsletter':
      return 'Be informative and valuable — not just promotional. Include a mix of new products, tips, and brand story. Keep it warm and personal.'
    case 'flash_sale':
      return 'Maximum urgency — limited time, limited stock. Use countdown language. Lead with the biggest discount. Keep copy extremely short and punchy.'
    case 'loyalty_reward':
      return 'Make the customer feel special and appreciated. Highlight their exclusive reward. Use warm, personal language — "as a valued customer" or "because you have been with us."'
    default:
      return 'Write compelling, conversion-focused email copy.'
  }
}

// ============================================
// 4. CHECK AD POLICY
// ============================================

export async function checkAdPolicy(params: AdPolicyCheckParams): Promise<AdPolicyResult> {
  const { platform, headlines, descriptions } = params
  const issues: AdPolicyIssue[] = []
  const limits = AD_LIMITS[platform]

  // Check headline character limits
  headlines.forEach((headline, index) => {
    if (headline.length > limits.headline) {
      issues.push({
        field: `headlines[${index}]`,
        issue: `Headline exceeds ${limits.headline} character limit (${headline.length} chars): "${headline}"`,
        severity: 'error',
      })
    }
    if (headline.length === 0) {
      issues.push({
        field: `headlines[${index}]`,
        issue: 'Headline is empty',
        severity: 'error',
      })
    }
  })

  // Check description character limits
  descriptions.forEach((description, index) => {
    if (description.length > limits.description) {
      issues.push({
        field: `descriptions[${index}]`,
        issue: `Description exceeds ${limits.description} character limit (${description.length} chars)`,
        severity: 'error',
      })
    }
    if (description.length === 0) {
      issues.push({
        field: `descriptions[${index}]`,
        issue: 'Description is empty',
        severity: 'error',
      })
    }
  })

  // Check prohibited content patterns
  const allTexts = [
    ...headlines.map((h, i) => ({ text: h, field: `headlines[${i}]` })),
    ...descriptions.map((d, i) => ({ text: d, field: `descriptions[${i}]` })),
  ]

  for (const { text, field } of allTexts) {
    for (const { pattern, category } of PROHIBITED_PATTERNS) {
      if (pattern.test(text)) {
        // "Before and after" is only restricted on Meta
        if (category.includes('Before/after') && platform !== 'meta') continue

        issues.push({
          field,
          issue: `Potential policy violation: ${category}`,
          severity: category.includes('Excessive') ? 'warning' : 'error',
        })
      }
    }
  }

  // Platform-specific checks
  if (platform === 'meta') {
    checkMetaPolicies(allTexts, issues)
  } else {
    checkGooglePolicies(allTexts, issues)
  }

  // Minimum content checks
  if (headlines.length === 0) {
    issues.push({
      field: 'headlines',
      issue: 'At least one headline is required',
      severity: 'error',
    })
  }

  if (descriptions.length === 0) {
    issues.push({
      field: 'descriptions',
      issue: 'At least one description is required',
      severity: 'error',
    })
  }

  return {
    passed: issues.every((issue) => issue.severity !== 'error'),
    issues,
  }
}

function checkMetaPolicies(
  texts: Array<{ text: string; field: string }>,
  issues: AdPolicyIssue[]
): void {
  for (const { text, field } of texts) {
    // Meta restricts personal attributes — "you" + assumption language
    if (/\b(are you|do you suffer|your body|your weight|your age)\b/i.test(text)) {
      issues.push({
        field,
        issue: 'May violate Meta personal attributes policy — avoid assumptions about personal characteristics',
        severity: 'warning',
      })
    }

    // Meta restricts certain health/body claims
    if (/\b(lose weight|weight loss|fat burn|belly fat)\b/i.test(text)) {
      issues.push({
        field,
        issue: 'Health and body-related claims are restricted on Meta',
        severity: 'error',
      })
    }

    // Meta requires proper grammar and formatting
    if (/(.)\1{4,}/.test(text)) {
      issues.push({
        field,
        issue: 'Repeated characters detected — Meta may reject poorly formatted ads',
        severity: 'warning',
      })
    }
  }
}

function checkGooglePolicies(
  texts: Array<{ text: string; field: string }>,
  issues: AdPolicyIssue[]
): void {
  for (const { text, field } of texts) {
    // Google restricts superlatives without third-party verification
    if (/\b(best|#1|number one|top rated)\b/i.test(text)) {
      issues.push({
        field,
        issue: 'Superlative claims ("best", "#1") require third-party verification on Google Ads',
        severity: 'warning',
      })
    }

    // Google restricts phone numbers in ad copy
    if (/(\+?\d[\d\s-]{7,}\d)/.test(text)) {
      issues.push({
        field,
        issue: 'Phone numbers in ad copy are not allowed on Google Ads — use call extensions instead',
        severity: 'error',
      })
    }

    // Google restricts all caps for emphasis
    if (/\b[A-Z]{5,}\b/.test(text) && !/\b(BOGO|SALE|COD|UPI|EMI|GST)\b/.test(text)) {
      issues.push({
        field,
        issue: 'Excessive capitalization — Google may reject ads with unnecessary all-caps words',
        severity: 'warning',
      })
    }
  }
}
