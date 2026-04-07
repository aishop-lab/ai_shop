import type { AgentType, AutonomyLevel, AgentAction, ActionCategory } from '@/lib/agents/types'

// All 37 sub-agent IDs as a union type
export type SubAgentId =
  // PRISM (Marketing) - 8
  | 'campaign-architect' | 'social-composer' | 'visual-crafter' | 'reel-director'
  | 'copysmith' | 'ad-pilot' | 'seo-scout' | 'influencer-finder'
  // FORGE (Sales) - 7
  | 'cart-whisperer' | 'price-strategist' | 'deal-engineer' | 'upsell-agent'
  | 'checkout-doctor' | 'loyalty-architect' | 'lead-scorer'
  // SENTINEL (Support) - 7
  | 'chat-responder' | 'email-handler' | 'whatsapp-agent' | 'returns-manager'
  | 'review-curator' | 'escalation-detector' | 'faq-builder'
  // PULSE (Analytics) - 8
  | 'revenue-tracker' | 'traffic-analyst' | 'customer-profiler' | 'product-ranker'
  | 'funnel-analyst' | 'competitor-watcher' | 'anomaly-sentinel' | 'report-writer'
  // CIPHER (Technical) - 7
  | 'seo-engineer' | 'speed-demon' | 'uptime-guardian' | 'security-scanner'
  | 'image-optimizer' | 'integration-doctor' | 'backup-manager'

export type SubAgentCategory = 'data-only' | 'llm-only' | 'llm-api' | 'llm-new-api'

export interface StoreContext {
  storeId: string
  storeName: string
  storeSlug: string
  category: string
  description: string
  brandVibe: string
  primaryColor: string
  currency: string
  autonomyLevel: AutonomyLevel
  // Lazy-loaded data (call only when needed)
  products: () => Promise<ProductSummary[]>
  orders: () => Promise<OrderSummary[]>
  customers: () => Promise<CustomerSummary[]>
  recentActions: () => Promise<AgentAction[]>
}

export interface ProductSummary {
  id: string
  title: string
  price: number
  inventory: number
  status: string
  category: string | null
  created_at: string
}

export interface OrderSummary {
  id: string
  order_number: string
  total_amount: number
  order_status: string
  payment_status: string
  customer_name: string | null
  created_at: string
}

export interface CustomerSummary {
  id: string
  name: string | null
  email: string
  total_orders: number
  total_spent: number
  created_at: string
}

export interface SubAgentDefinition {
  id: SubAgentId
  codename: string
  chief: AgentType
  role: string
  description: string
  category: SubAgentCategory
  systemPrompt: (ctx: StoreContext) => string
  tools?: Record<string, unknown>           // AI SDK tool definitions (added per phase)
  queryFn?: (ctx: StoreContext, params: Record<string, unknown>) => Promise<unknown>
  autonomyRules: {
    autonomous: string[]                    // Action types auto-executed
    needsChiefApproval: string[]            // Needs Chief OK
    needsMerchantApproval: string[]         // Always needs Merchant OK
  }
}

export interface SubAgentTask {
  instruction: string
  params?: Record<string, unknown>
  triggerType?: 'manual' | 'event' | 'cron' | 'cross-agent'
  context?: Record<string, unknown>
}

export interface SubAgentResult {
  subAgentId: SubAgentId
  chief: AgentType
  output: unknown
  actions: SubAgentActionResult[]
  tokensInput: number
  tokensOutput: number
  durationMs: number
  requiresApproval: boolean
  approvalId?: string
}

export interface SubAgentActionResult {
  actionType: string
  actionCategory: ActionCategory
  summary: string
  details: Record<string, unknown>
  status: 'completed' | 'requires_approval' | 'failed'
}
