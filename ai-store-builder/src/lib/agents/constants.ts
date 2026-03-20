import type { AgentType, AutonomyLevel, AgentStatus, ApprovalPriority, ActionCategory } from './types'

/**
 * AGENT TYPES
 */
export const AGENT_TYPES: AgentType[] = ['marketing', 'sales', 'support', 'analytics', 'technical']

/**
 * AGENT DISPLAY NAMES
 */
export const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  marketing: 'Marketing Agent',
  sales: 'Sales Agent',
  support: 'Support Agent',
  analytics: 'Analytics Agent',
  technical: 'Technical Agent',
}

/**
 * AGENT DESCRIPTIONS
 */
export const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  marketing: 'Manages ad campaigns, social media, and brand presence',
  sales: 'Recovers abandoned carts, creates discounts, and drives revenue',
  support: 'Handles customer inquiries across chat, email, and WhatsApp',
  analytics: 'Surfaces insights, detects anomalies, and generates reports',
  technical: 'Optimizes SEO, performance, structured data, and site health',
}

/**
 * AGENT COLORS (Tailwind classes)
 */
export const AGENT_COLORS: Record<AgentType, { bg: string; text: string; dot: string; border: string }> = {
  marketing: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
    border: 'border-purple-500/20',
  },
  sales: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/20',
  },
  support: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    border: 'border-blue-500/20',
  },
  analytics: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    border: 'border-amber-500/20',
  },
  technical: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    dot: 'bg-cyan-400',
    border: 'border-cyan-500/20',
  },
}

/**
 * AGENT ICONS (Lucide icon names)
 */
export const AGENT_ICONS: Record<AgentType, string> = {
  marketing: 'megaphone',
  sales: 'trending-up',
  support: 'headphones',
  analytics: 'bar-chart-3',
  technical: 'settings',
}

/**
 * STATUS COLORS
 */
export const STATUS_COLORS = {
  idle: {
    dot: 'bg-zinc-500',
    text: 'text-zinc-400',
    label: 'Idle',
  },
  running: {
    dot: 'bg-green-400',
    text: 'text-green-400',
    label: 'Active',
  },
  waiting_approval: {
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    label: 'Needs Approval',
  },
  paused: {
    dot: 'bg-zinc-600',
    text: 'text-zinc-500',
    label: 'Paused',
  },
  error: {
    dot: 'bg-red-400',
    text: 'text-red-400',
    label: 'Error',
  },
} as const

/**
 * AUTONOMY LEVELS
 * 1: Observer - No auto-execution
 * 2: Assistant - Suggests actions, needs approval for all
 * 3: Smart Auto - Auto-executes low-risk actions, seeks approval for spending/pricing/refunds
 * 4: Autonomous - Auto-executes most, needs approval for spending/pricing/refunds
 * 5: Full Auto - Auto-executes everything
 */
export const AUTONOMY_LEVELS: Record<AutonomyLevel, { label: string; description: string }> = {
  1: {
    label: 'Observer',
    description: 'Agent only suggests actions and insights. Everything requires your approval.',
  },
  2: {
    label: 'Assistant',
    description: 'Agent suggests and executes analysis. Seeks approval for all operational actions.',
  },
  3: {
    label: 'Smart Auto',
    description: 'Agent auto-executes low-risk actions like communications. Seeks approval for spending, pricing, and refunds.',
  },
  4: {
    label: 'Autonomous',
    description: 'Agent auto-executes most operations. Only seeks approval for spending and refunds.',
  },
  5: {
    label: 'Full Auto',
    description: 'Agent auto-executes everything. You set the rules, it executes without asking.',
  },
}

/**
 * DEFAULT AUTONOMY LEVEL
 */
export const DEFAULT_AUTONOMY_LEVEL: AutonomyLevel = 3

/**
 * APPROVAL PRIORITY ORDER
 */
export const APPROVAL_PRIORITY_ORDER = ['urgent', 'high', 'normal', 'low'] as const

/**
 * ACTION CATEGORY LABELS
 */
export const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  communication: 'Communication',
  campaign: 'Campaign',
  optimization: 'Optimization',
  analysis: 'Analysis',
  maintenance: 'Maintenance',
}

/**
 * MODEL TIERS
 * Defines pricing and model selection by tier
 */
export const MODEL_TIERS = {
  fast: {
    model: 'gemini-2.0-flash',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
  balanced: {
    model: 'gemini-2.0-flash',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
  premium: {
    model: 'claude-sonnet-4',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
} as const

/**
 * DEFAULT BUDGET LIMITS (USD per month)
 * Based on subscription tier
 */
export const DEFAULT_BUDGET_LIMITS = {
  free: 2,
  pro: 20,
  business: 100,
} as const
