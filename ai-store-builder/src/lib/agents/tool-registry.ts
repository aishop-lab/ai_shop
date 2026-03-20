import type { AgentType, AgentToolDefinition, AutonomyLevel } from './types'

const registry = new Map<string, AgentToolDefinition>()

export function registerTool(definition: AgentToolDefinition): void {
  const key = `${definition.agentType}:${definition.name}`
  registry.set(key, definition)
}

export function registerTools(definitions: AgentToolDefinition[]): void {
  for (const def of definitions) {
    registerTool(def)
  }
}

export function getToolsForAgent(agentType: AgentType): AgentToolDefinition[] {
  const tools: AgentToolDefinition[] = []
  for (const [key, def] of registry.entries()) {
    if (def.agentType === agentType) {
      tools.push(def)
    }
  }
  return tools
}

export function checkToolPermission(
  agentType: AgentType,
  toolName: string,
  autonomyLevel: AutonomyLevel,
  args: Record<string, unknown> = {}
): { allowed: boolean; requiresApproval: boolean } {
  const key = `${agentType}:${toolName}`
  const def = registry.get(key)

  if (!def) {
    return { allowed: false, requiresApproval: false }
  }

  if (autonomyLevel === 1) {
    return { allowed: true, requiresApproval: true }
  }

  if (autonomyLevel === 5) {
    return { allowed: true, requiresApproval: false }
  }

  if (def.requiresApproval(autonomyLevel, args)) {
    return { allowed: true, requiresApproval: true }
  }

  switch (def.riskLevel) {
    case 'low':
      return { allowed: true, requiresApproval: autonomyLevel < 3 }
    case 'medium':
      return { allowed: true, requiresApproval: autonomyLevel < 4 }
    case 'high':
      return { allowed: true, requiresApproval: true }
    default:
      return { allowed: true, requiresApproval: true }
  }
}

export function getToolDefinition(agentType: AgentType, toolName: string): AgentToolDefinition | undefined {
  return registry.get(`${agentType}:${toolName}`)
}

export function getRegisteredToolCount(): Record<AgentType, number> {
  const counts: Record<AgentType, number> = {
    marketing: 0,
    sales: 0,
    support: 0,
    analytics: 0,
    technical: 0,
  }
  for (const def of registry.values()) {
    counts[def.agentType] = (counts[def.agentType] || 0) + 1
  }
  return counts
}
