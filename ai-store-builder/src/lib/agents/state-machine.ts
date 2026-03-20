// src/lib/agents/state-machine.ts
// Agent state machine: validates and applies status transitions

import type { AgentStatus, AgentEvent } from './types'

const TRANSITIONS: Record<AgentStatus, Partial<Record<AgentEvent, AgentStatus>>> = {
  idle: {
    start_execution: 'running',
    pause: 'paused',
  },
  running: {
    request_approval: 'waiting_approval',
    execution_complete: 'idle',
    execution_error: 'error',
    pause: 'paused',
  },
  waiting_approval: {
    approval_resolved: 'running',
    execution_complete: 'idle',
    pause: 'paused',
    reset: 'idle',
  },
  paused: {
    resume: 'idle',
    reset: 'idle',
  },
  error: {
    reset: 'idle',
    start_execution: 'running',
  },
}

export interface TransitionResult {
  success: boolean
  fromStatus: AgentStatus
  toStatus: AgentStatus
  event: AgentEvent
  error?: string
}

export function transitionState(currentStatus: AgentStatus, event: AgentEvent): TransitionResult {
  const validTransitions = TRANSITIONS[currentStatus]
  const nextStatus = validTransitions?.[event]

  if (!nextStatus) {
    return {
      success: false,
      fromStatus: currentStatus,
      toStatus: currentStatus,
      event,
      error: `Invalid transition: cannot apply event '${event}' in status '${currentStatus}'`,
    }
  }

  return {
    success: true,
    fromStatus: currentStatus,
    toStatus: nextStatus,
    event,
  }
}

export function canTransition(currentStatus: AgentStatus, event: AgentEvent): boolean {
  return TRANSITIONS[currentStatus]?.[event] !== undefined
}

export function getValidEvents(currentStatus: AgentStatus): AgentEvent[] {
  const transitions = TRANSITIONS[currentStatus]
  return transitions ? (Object.keys(transitions) as AgentEvent[]) : []
}
