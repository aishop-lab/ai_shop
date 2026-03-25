import type { AgentType } from '@/lib/agents/types'
import type { SubAgentDefinition, SubAgentId } from '../types'

import { PRISM_SUB_AGENTS } from './prism'
import { FORGE_SUB_AGENTS } from './forge'
import { SENTINEL_SUB_AGENTS } from './sentinel'
import { PULSE_SUB_AGENTS } from './pulse'
import { CIPHER_SUB_AGENTS } from './cipher'

// Flat array of all 37 sub-agents
export const ALL_SUB_AGENTS: SubAgentDefinition[] = [
  ...PRISM_SUB_AGENTS,
  ...FORGE_SUB_AGENTS,
  ...SENTINEL_SUB_AGENTS,
  ...PULSE_SUB_AGENTS,
  ...CIPHER_SUB_AGENTS,
]

// Sub-agents grouped by their chief agent
export const SUB_AGENTS_BY_CHIEF: Record<AgentType, SubAgentDefinition[]> = {
  marketing: PRISM_SUB_AGENTS,
  sales: FORGE_SUB_AGENTS,
  support: SENTINEL_SUB_AGENTS,
  analytics: PULSE_SUB_AGENTS,
  technical: CIPHER_SUB_AGENTS,
}

// Look up a single sub-agent by its ID
export function getSubAgent(id: SubAgentId): SubAgentDefinition | undefined {
  return ALL_SUB_AGENTS.find((agent) => agent.id === id)
}

// Get all sub-agents belonging to a specific chief
export function getSubAgentsForChief(chief: AgentType): SubAgentDefinition[] {
  return SUB_AGENTS_BY_CHIEF[chief] ?? []
}
