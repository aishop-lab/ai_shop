// src/components/platform/onboarding/agent-intro-data.ts
import type { AgentType } from '@/lib/agents/types'

export interface AgentIntro {
  codename: string
  tagline: string
  intro: string
}

export const AGENT_INTRO_ORDER: AgentType[] = [
  'support',
  'sales',
  'analytics',
  'marketing',
  'technical',
]

export const AGENT_INTROS: Record<AgentType, AgentIntro> = {
  support: {
    codename: 'SENTINEL',
    tagline: 'Your customers, always heard',
    intro: 'I handle inquiries across chat, email, and WhatsApp — resolving issues before they escalate. Your customers get instant, human-quality responses 24/7.',
  },
  sales: {
    codename: 'FORGE',
    tagline: 'Turn browsers into buyers',
    intro: 'I recover abandoned carts, create targeted discounts, and optimize your checkout flow. Every visitor is a potential sale — I make sure fewer slip away.',
  },
  analytics: {
    codename: 'PULSE',
    tagline: "Your store's vital signs",
    intro: "I monitor traffic, revenue, and trends in real-time. When something spikes or drops, you'll know before it matters. Weekly reports, anomaly alerts, growth insights — all automatic.",
  },
  marketing: {
    codename: 'PRISM',
    tagline: 'Amplify your brand',
    intro: "I craft campaigns, manage your social presence, and find the channels that bring customers to your door. Give me a budget and a goal — I'll figure out the rest.",
  },
  technical: {
    codename: 'CIPHER',
    tagline: 'Silent guardian of your store',
    intro: "I optimize your SEO, fix performance issues, manage structured data, and keep your site healthy. You'll never think about technical debt — because I already handled it.",
  },
}
