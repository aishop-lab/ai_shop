// src/lib/agents/index.ts
// Barrel export for agent infrastructure

// Types
export * from './types'

// Constants
export * from './constants'

// Core
export * from './state-machine'
export * from './db'
export * from './cost-tracker'
export * from './model-router'
export * from './tool-registry'
export * from './base-agent'

// Operational
export * from './memory'
export * from './scheduler'

// Orchestrator — export explicitly to avoid AgentTrigger conflict with types.ts
// (orchestrator defines AgentTrigger with snake_case DB-oriented fields,
//  types.ts defines AgentTrigger with camelCase execution-oriented fields)
export {
  dispatchTrigger,
  resolveConflicts,
  crossAgentNotify,
  getPendingNotifications,
  getTriggerRouting,
  registerTriggerRoute,
} from './orchestrator'

// Orchestrator-specific types (renamed to avoid clash with types.ts AgentTrigger)
export type {
  AgentTrigger as OrchestratorTrigger,
  ConflictResult,
  DispatchResult,
  CrossAgentNotification,
} from './orchestrator'
