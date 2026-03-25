// Sub-Agent Router — Determines which sub-agent handles a given task
// Uses keyword matching for speed (no LLM call needed for routing)

import { getSubAgentsForChief } from './registry'
import type { SubAgentId } from './types'
import type { AgentType } from '@/lib/agents/types'

// ---------------------------------------------------------------------------
// Keyword-based routing
// ---------------------------------------------------------------------------

// Keywords that map to specific sub-agents (checked in order, first match wins)
const ROUTING_KEYWORDS: Record<SubAgentId, string[]> = {
  // PRISM (Marketing)
  'campaign-architect': ['campaign', 'launch', 'plan campaign', 'marketing strategy', 'seasonal', 'promotion plan'],
  'social-composer': ['social media', 'instagram', 'facebook', 'twitter', 'post', 'caption', 'hashtag', 'schedule post'],
  'visual-crafter': ['design', 'banner', 'graphic', 'image', 'creative', 'visual', 'poster'],
  'reel-director': ['video', 'reel', 'script', 'storyboard', 'short form', 'youtube'],
  'copysmith': ['write', 'copy', 'description', 'tagline', 'blog', 'email copy', 'headline', 'content'],
  'ad-pilot': ['ad', 'google ads', 'meta ads', 'facebook ads', 'advertising', 'ppc', 'budget', 'targeting'],
  'seo-scout': ['keyword', 'seo content', 'search ranking', 'organic traffic', 'search terms'],
  'influencer-finder': ['influencer', 'creator', 'partnership', 'collaboration', 'outreach'],

  // FORGE (Sales)
  'cart-whisperer': ['abandoned cart', 'cart recovery', 'recover', 'left in cart', 'incomplete order'],
  'price-strategist': ['price', 'pricing', 'competitor price', 'price change', 'margin'],
  'deal-engineer': ['discount', 'coupon', 'flash sale', 'bundle', 'deal', 'offer', 'bogo', 'promotion'],
  'upsell-agent': ['upsell', 'cross-sell', 'recommend', 'frequently bought', 'also like', 'suggestion'],
  'checkout-doctor': ['checkout', 'conversion', 'cart drop', 'friction', 'payment failure', 'abandonment rate'],
  'loyalty-architect': ['loyalty', 'reward', 'retention', 'repeat customer', 'win back', 'churn'],
  'lead-scorer': ['lead', 'visitor score', 'intent', 'high value visitor', 'purchase likelihood'],

  // SENTINEL (Support)
  'chat-responder': ['chat', 'live chat', 'customer question', 'help', 'customer message'],
  'email-handler': ['email support', 'customer email', 'ticket', 'inbox', 'reply to email'],
  'whatsapp-agent': ['whatsapp', 'wa message', 'whatsapp notification'],
  'returns-manager': ['return', 'refund', 'exchange', 'damaged', 'wrong item', 'return request'],
  'review-curator': ['review', 'rating', 'feedback', 'testimonial', 'negative review', 'star rating'],
  'escalation-detector': ['escalat', 'angry', 'complaint', 'legal', 'threat', 'frustrated', 'urgent issue'],
  'faq-builder': ['faq', 'frequently asked', 'help article', 'knowledge base', 'common question'],

  // PULSE (Analytics)
  'revenue-tracker': ['revenue', 'sales total', 'income', 'aov', 'average order', 'earnings'],
  'traffic-analyst': ['traffic', 'visitors', 'page views', 'bounce rate', 'sessions', 'source'],
  'customer-profiler': ['customer segment', 'clv', 'lifetime value', 'customer profile', 'cohort'],
  'product-ranker': ['product performance', 'best seller', 'top product', 'worst selling', 'underperforming'],
  'funnel-analyst': ['funnel', 'conversion rate', 'drop off', 'purchase flow', 'cart to checkout'],
  'competitor-watcher': ['competitor', 'market', 'competitive', 'benchmark', 'industry'],
  'anomaly-sentinel': ['anomaly', 'spike', 'drop', 'unusual', 'abnormal', 'alert'],
  'report-writer': ['report', 'summary', 'digest', 'weekly report', 'monthly report', 'overview'],

  // CIPHER (Technical)
  'seo-engineer': ['structured data', 'schema markup', 'meta tag', 'sitemap', 'crawl', 'search console', 'technical seo'],
  'speed-demon': ['speed', 'performance', 'core web vitals', 'page speed', 'lcp', 'cls', 'loading'],
  'uptime-guardian': ['uptime', 'downtime', 'availability', 'site down', 'monitoring', 'health check'],
  'security-scanner': ['security', 'vulnerability', 'ssl', 'xss', 'injection', 'scan'],
  'image-optimizer': ['image optim', 'compress', 'webp', 'image size', 'thumbnail'],
  'integration-doctor': ['integration', 'api health', 'payment gateway', 'webhook', 'third party', 'provider status'],
  'backup-manager': ['backup', 'restore', 'export data', 'data protection', 'disaster recovery'],
}

// ---------------------------------------------------------------------------
// Route a task to the appropriate sub-agent
// ---------------------------------------------------------------------------

/**
 * Route a task to the best sub-agent for a given Chief.
 * Uses keyword matching against the task instruction.
 * Falls back to the first sub-agent in the Chief's list (usually the "architect" or primary role).
 */
export function routeToSubAgent(chief: AgentType, taskInstruction: string): SubAgentId {
  const instruction = taskInstruction.toLowerCase()
  const chiefSubAgents = getSubAgentsForChief(chief)

  // Score each sub-agent by keyword matches
  let bestMatch: SubAgentId | null = null
  let bestScore = 0

  for (const subAgent of chiefSubAgents) {
    const keywords = ROUTING_KEYWORDS[subAgent.id]
    if (!keywords) continue

    let score = 0
    for (const keyword of keywords) {
      if (instruction.includes(keyword.toLowerCase())) {
        // Longer keyword matches are worth more (more specific)
        score += keyword.length
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = subAgent.id
    }
  }

  // Fallback to first sub-agent for this Chief
  if (!bestMatch && chiefSubAgents.length > 0) {
    bestMatch = chiefSubAgents[0].id
  }

  if (!bestMatch) {
    throw new Error(`No sub-agents found for Chief: ${chief}`)
  }

  return bestMatch
}

/**
 * Route a task to the best sub-agent across ALL Chiefs.
 * Used by the Master Orchestrator when the Chief is not specified.
 * Returns both the Chief and the sub-agent ID.
 */
export function routeToSubAgentGlobal(taskInstruction: string): { chief: AgentType; subAgentId: SubAgentId } {
  const instruction = taskInstruction.toLowerCase()

  let bestMatch: { chief: AgentType; subAgentId: SubAgentId } | null = null
  let bestScore = 0

  for (const [subAgentId, keywords] of Object.entries(ROUTING_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (instruction.includes(keyword.toLowerCase())) {
        score += keyword.length
      }
    }

    if (score > bestScore) {
      bestScore = score
      // Look up the Chief for this sub-agent
      const allChiefs: AgentType[] = ['marketing', 'sales', 'support', 'analytics', 'technical']
      for (const chief of allChiefs) {
        const chiefSubAgents = getSubAgentsForChief(chief)
        if (chiefSubAgents.find(s => s.id === subAgentId)) {
          bestMatch = { chief, subAgentId: subAgentId as SubAgentId }
          break
        }
      }
    }
  }

  // Default to analytics/report-writer as a catch-all
  return bestMatch || { chief: 'analytics', subAgentId: 'report-writer' }
}
