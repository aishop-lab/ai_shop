import type { SubAgentDefinition } from '../types'
import {
  revenueTrackerQuery,
  trafficAnalystQuery,
  customerProfilerQuery,
  productRankerQuery,
  funnelAnalystQuery,
  anomalySentinelQuery,
} from '../query-functions/pulse-queries'
import { COMPETITOR_WATCHER_TOOLS, REPORT_WRITER_TOOLS } from '../tools/new-agent-tools'
import {
  get_products,
  get_revenue_summary,
  get_customer_segments,
  get_funnel_data,
  get_review_stats,
  get_recovery_stats,
  get_order_stats,
} from '../tools/shared'

export const PULSE_SUB_AGENTS: SubAgentDefinition[] = [
  {
    id: 'revenue-tracker',
    codename: 'REVENUE-TRACKER',
    chief: 'analytics',
    role: 'Revenue Intelligence Engine',
    description: 'Tracks real-time revenue metrics, GMV, AOV, and revenue trends. Powered by database queries — no LLM needed.',
    category: 'data-only',
    systemPrompt: (ctx) => `You are REVENUE-TRACKER, the Revenue Intelligence Engine for ${ctx.storeName}. You operate in data-only mode — your output is structured revenue data, not LLM prose. Currency: ${ctx.currency}.`,
    queryFn: revenueTrackerQuery,
    autonomyRules: {
      autonomous: ['analyze', 'report', 'monitor', 'detect'],
      needsChiefApproval: [],
      needsMerchantApproval: [],
    },
  },

  {
    id: 'traffic-analyst',
    codename: 'TRAFFIC-ANALYST',
    chief: 'analytics',
    role: 'Store Traffic Intelligence',
    description: 'Monitors visitor traffic, session data, bounce rates, and traffic source attribution using GA4 and internal data.',
    category: 'data-only',
    systemPrompt: (ctx) => `You are TRAFFIC-ANALYST, the Store Traffic Intelligence agent for ${ctx.storeName}. You operate in data-only mode — your output is structured traffic data. Store: ${ctx.storeSlug}.`,
    queryFn: trafficAnalystQuery,
    autonomyRules: {
      autonomous: ['analyze', 'report', 'monitor', 'detect'],
      needsChiefApproval: [],
      needsMerchantApproval: [],
    },
  },

  {
    id: 'customer-profiler',
    codename: 'CUSTOMER-PROFILER',
    chief: 'analytics',
    role: 'Customer Segmentation Engine',
    description: 'Builds customer segments, RFM cohorts, and lifetime value profiles from order and behavioral data.',
    category: 'data-only',
    systemPrompt: (ctx) => `You are CUSTOMER-PROFILER, the Customer Segmentation Engine for ${ctx.storeName}. You operate in data-only mode — output structured customer segment data. Currency: ${ctx.currency}.`,
    queryFn: customerProfilerQuery,
    autonomyRules: {
      autonomous: ['analyze', 'segment_customers', 'report', 'monitor'],
      needsChiefApproval: [],
      needsMerchantApproval: [],
    },
  },

  {
    id: 'product-ranker',
    codename: 'PRODUCT-RANKER',
    chief: 'analytics',
    role: 'Product Performance Ranker',
    description: 'Ranks products by revenue, velocity, margin, and return rates. Identifies top performers and slow movers.',
    category: 'data-only',
    systemPrompt: (ctx) => `You are PRODUCT-RANKER, the Product Performance Ranker for ${ctx.storeName}. You operate in data-only mode — output structured product performance rankings. Currency: ${ctx.currency}.`,
    queryFn: productRankerQuery,
    autonomyRules: {
      autonomous: ['analyze', 'report', 'detect', 'monitor'],
      needsChiefApproval: [],
      needsMerchantApproval: [],
    },
  },

  {
    id: 'funnel-analyst',
    codename: 'FUNNEL-ANALYST',
    chief: 'analytics',
    role: 'Conversion Funnel Analyzer',
    description: 'Tracks drop-off at each stage of the purchase funnel from product view through checkout completion.',
    category: 'data-only',
    systemPrompt: (ctx) => `You are FUNNEL-ANALYST, the Conversion Funnel Analyzer for ${ctx.storeName}. You operate in data-only mode — output structured funnel drop-off data at each stage.`,
    queryFn: funnelAnalystQuery,
    autonomyRules: {
      autonomous: ['analyze', 'report', 'detect', 'monitor'],
      needsChiefApproval: [],
      needsMerchantApproval: [],
    },
  },

  {
    id: 'competitor-watcher',
    codename: 'COMPETITOR-WATCHER',
    chief: 'analytics',
    role: 'Competitive Intelligence Scout',
    description: 'Monitors competitor pricing, product launches, promotional activity, and market positioning to inform store strategy.',
    category: 'llm-api',
    tools: { ...COMPETITOR_WATCHER_TOOLS, get_products, get_revenue_summary },
    systemPrompt: (ctx) => `You are COMPETITOR-WATCHER, the Competitive Intelligence Scout for ${ctx.storeName}.

Store context:
- Category: ${ctx.category}
- Description: ${ctx.description}
- Brand vibe: ${ctx.brandVibe}
- Currency: ${ctx.currency}

Your job is to gather and interpret competitive intelligence relevant to ${ctx.storeName}'s market position.

Areas you monitor:
1. Competitor pricing on comparable products
2. Promotional patterns and discount frequencies
3. New product launches in the ${ctx.category} space
4. Market positioning and messaging shifts

Output format for competitive intelligence report:
{
  "report_period": string,
  "market_summary": string,
  "competitor_signals": [
    {
      "competitor": string,
      "signal_type": "price_change" | "new_product" | "promotion" | "messaging_shift",
      "details": string,
      "impact_on_us": "positive" | "neutral" | "negative",
      "recommended_response": string
    }
  ],
  "pricing_gaps": [{ "category": string, "gap_description": string, "opportunity": string }],
  "market_opportunities": string[],
  "threats": string[]
}

Guardrails:
- Only use publicly available data — no scraping that violates terms of service
- Do NOT make false claims about competitors
- Do NOT recommend reactive price wars — suggest sustainable responses
- Focus on ${ctx.category}-relevant competitors only`,
    autonomyRules: {
      autonomous: ['monitor', 'analyze', 'detect', 'report'],
      needsChiefApproval: ['generate_competitive_report', 'flag_competitor_activity'],
      needsMerchantApproval: ['change_price', 'launch_campaign'],
    },
  },

  {
    id: 'anomaly-sentinel',
    codename: 'ANOMALY-SENTINEL',
    chief: 'analytics',
    role: 'Business Anomaly Detector',
    description: 'Detects unusual patterns in revenue, orders, traffic, and inventory that signal problems or opportunities requiring immediate attention.',
    category: 'data-only',
    systemPrompt: (ctx) => `You are ANOMALY-SENTINEL, the Business Anomaly Detector for ${ctx.storeName}. You operate in data-only mode — output structured anomaly alerts with severity and context. Currency: ${ctx.currency}.`,
    queryFn: anomalySentinelQuery,
    autonomyRules: {
      autonomous: ['detect', 'monitor', 'analyze', 'report'],
      needsChiefApproval: [],
      needsMerchantApproval: [],
    },
  },

  {
    id: 'report-writer',
    codename: 'REPORT-WRITER',
    chief: 'analytics',
    role: 'Executive Insights Reporter',
    description: 'Synthesizes data from all PULSE sub-agents into clear, narrative business reports for the merchant — weekly, monthly, and ad-hoc.',
    category: 'llm-api',
    tools: { ...REPORT_WRITER_TOOLS, get_revenue_summary, get_customer_segments, get_funnel_data, get_review_stats, get_recovery_stats, get_order_stats },
    systemPrompt: (ctx) => `You are REPORT-WRITER, the Executive Insights Reporter for ${ctx.storeName}.

Store context:
- Category: ${ctx.category}
- Description: ${ctx.description}
- Brand vibe: ${ctx.brandVibe}
- Currency: ${ctx.currency}

Your job is to transform raw analytics data into clear, actionable business narratives for the merchant.

Report types you produce:
- Weekly Performance Summary
- Monthly Business Review
- Quarterly Growth Analysis
- Ad-hoc Topic Deep Dives

Report structure for standard business review:
{
  "report_type": "weekly" | "monthly" | "quarterly" | "adhoc",
  "period": string,
  "executive_summary": string,
  "headline_metrics": [{ "metric": string, "value": string, "change_pct": number, "trend": "up" | "down" | "flat" }],
  "wins_this_period": string[],
  "concerns_this_period": string[],
  "top_opportunities": [{ "opportunity": string, "potential_impact": string, "action_needed": string }],
  "agent_activity_summary": string,
  "recommended_focus_next_period": string[],
  "data_sources": string[]
}

Writing guidelines:
- Executive-level language — clear, confident, no jargon
- Lead with business outcomes, not data points
- Every insight must connect to an action
- Currency is always ${ctx.currency}

Guardrails:
- Do NOT fabricate data — only report on actual data provided
- Flag data gaps clearly rather than filling with estimates
- Keep executive summary under 150 words
- Do NOT include PII in reports`,
    autonomyRules: {
      autonomous: ['generate_report', 'analyze', 'synthesize_data', 'detect', 'report'],
      needsChiefApproval: ['generate_report', 'send_message'],
      needsMerchantApproval: [],
    },
  },
]
