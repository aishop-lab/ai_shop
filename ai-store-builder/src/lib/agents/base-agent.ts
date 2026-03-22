// src/lib/agents/base-agent.ts
import { generateText, stepCountIs, tool } from 'ai'
import type { Tool } from '@ai-sdk/provider-utils'
import { z } from 'zod'
import type {
  AgentType,
  AgentState,
  AgentTrigger,
  AgentResult,
  AgentActionResult,
  ModelTier,
  ActionCategory,
  AutonomyLevel,
} from './types'
import { transitionState } from './state-machine'
import {
  getAgentState,
  updateAgentStatus,
  logAgentAction,
  createApproval,
  incrementAgentCounters,
} from './db'
import { selectModel, getModelForTier } from './model-router'
import { trackUsage, checkBudget } from './cost-tracker'
import { checkToolPermission } from './tool-registry'
import { logger } from '@/lib/logger'

export interface AgentToolConfig {
  name: string
  description: string
  inputSchema: z.ZodType
  category: ActionCategory
  riskLevel: 'low' | 'medium' | 'high'
  execute: (args: Record<string, unknown>, context: AgentExecutionContext) => Promise<{
    success: boolean
    data?: unknown
    summary: string
    relatedEntityType?: string
    relatedEntityId?: string
  }>
}

export interface AgentExecutionContext {
  storeId: string
  agentType: AgentType
  autonomyLevel: AutonomyLevel
  state: AgentState
}

export abstract class BaseAgent {
  abstract readonly agentType: AgentType
  abstract readonly displayName: string

  abstract buildSystemPrompt(state: AgentState, trigger: AgentTrigger): string
  abstract getTools(): AgentToolConfig[]

  /** Override in subclasses that need async context (e.g. loading knowledge base from DB) */
  async buildSystemPromptAsync(state: AgentState, trigger: AgentTrigger): Promise<string> {
    return this.buildSystemPrompt(state, trigger)
  }

  async execute(trigger: AgentTrigger): Promise<AgentResult> {
    const startTime = Date.now()
    const actions: AgentActionResult[] = []

    // 1. Load agent state
    const state = await getAgentState(trigger.storeId, this.agentType)
    if (!state) {
      logger.warn(`[${this.agentType}] No agent state found for store ${trigger.storeId}`)
      return this.skippedResult(startTime)
    }

    // 2. Check if agent is enabled and not paused
    if (!state.is_enabled || state.status === 'paused') {
      return this.skippedResult(startTime)
    }

    // 3. Check budget
    const budget = await checkBudget(trigger.storeId)
    if (budget.isExhausted) {
      logger.warn(`[${this.agentType}] Budget exhausted for store ${trigger.storeId}`)
      return this.skippedResult(startTime)
    }

    // 4. Transition to running
    const transition = transitionState(state.status, 'start_execution')
    if (!transition.success) {
      logger.warn(`[${this.agentType}] Cannot start: ${transition.error}`)
      return this.skippedResult(startTime)
    }
    await updateAgentStatus(trigger.storeId, this.agentType, 'running')

    try {
      // 5. Select model
      const modelConfig = await selectModel(trigger.storeId, {
        requestedTier: (trigger.complexity as ModelTier) || 'fast',
        agentType: this.agentType,
      })
      const model = getModelForTier(modelConfig.tier)

      // 6. Build system prompt (async variant loads richer context like knowledge bases)
      const systemPrompt = await this.buildSystemPromptAsync(state, trigger)

      // 7. Wrap tools with approval checking
      const wrappedTools = this.wrapToolsWithApproval(
        this.getTools(),
        state.autonomy_level,
        trigger.storeId,
        actions,
        state
      )

      // 8. Call LLM with tool loop
      const messages = trigger.messages || [{ role: 'user' as const, content: 'Execute your scheduled task.' }]

      const result = await generateText({
        model,
        system: systemPrompt,
        messages,
        tools: wrappedTools,
        stopWhen: stepCountIs(10),
      })

      // 9. Track costs
      const tokensInput = result.usage?.inputTokens || 0
      const tokensOutput = result.usage?.outputTokens || 0

      await trackUsage({
        storeId: trigger.storeId,
        agentType: this.agentType,
        modelUsed: modelConfig.modelId,
        tokensInput,
        tokensOutput,
      })

      // 10. Update state back to idle
      await updateAgentStatus(trigger.storeId, this.agentType, 'idle')
      await incrementAgentCounters(trigger.storeId, this.agentType, {
        total_actions: actions.length,
      })

      // 11. Update last_action_at
      if (actions.length > 0) {
        const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
        await getSupabaseAdmin()
          .from('agent_states')
          .update({ last_action_at: new Date().toISOString() })
          .eq('store_id', trigger.storeId)
          .eq('agent_type', this.agentType)
      }

      return {
        skipped: false,
        actions,
        tokensInput,
        tokensOutput,
        modelUsed: modelConfig.modelId,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`[${this.agentType}] Execution error: ${errorMsg}`)

      await updateAgentStatus(trigger.storeId, this.agentType, 'error', {
        last_error: errorMsg,
        error_count: (state.error_count || 0) + 1,
      })

      return {
        skipped: false,
        actions,
        tokensInput: 0,
        tokensOutput: 0,
        modelUsed: '',
        durationMs: Date.now() - startTime,
      }
    }
  }

  private wrapToolsWithApproval(
    agentTools: AgentToolConfig[],
    autonomyLevel: AutonomyLevel,
    storeId: string,
    actionsCollector: AgentActionResult[],
    cachedState: AgentState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Record<string, Tool<any, any>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped: Record<string, Tool<any, any>> = {}

    for (const agentTool of agentTools) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wrapped[agentTool.name] = tool({
        description: agentTool.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: agentTool.inputSchema as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: async (args: any) => {
          const permission = checkToolPermission(
            this.agentType,
            agentTool.name,
            autonomyLevel,
            args
          )

          if (!permission.allowed) {
            return { success: false, error: 'Tool not allowed for this agent' }
          }

          const context: AgentExecutionContext = {
            storeId,
            agentType: this.agentType,
            autonomyLevel,
            state: cachedState,
          }

          if (permission.requiresApproval) {
            const approvalId = await createApproval({
              storeId,
              agentType: this.agentType,
              actionType: agentTool.name,
              summary: `${this.displayName} wants to execute: ${agentTool.name}`,
              reasoning: `Tool "${agentTool.name}" requires approval at autonomy level ${autonomyLevel}`,
              details: args,
            })

            await logAgentAction({
              storeId,
              agentType: this.agentType,
              actionType: agentTool.name,
              actionCategory: agentTool.category,
              summary: `Requested approval: ${agentTool.name}`,
              details: args,
              status: 'requires_approval',
              executionMode: 'approved',
              approvalId: approvalId || undefined,
            })

            await incrementAgentCounters(storeId, this.agentType, {
              total_approvals_requested: 1,
            })

            actionsCollector.push({
              actionType: agentTool.name,
              actionCategory: agentTool.category,
              summary: `Requested approval: ${agentTool.name}`,
              details: args,
              status: 'requires_approval',
              executionMode: 'approved',
            })

            return {
              success: true,
              requiresApproval: true,
              message: 'Action submitted for merchant approval',
              approvalId,
            }
          }

          // Auto-execute
          const result = await agentTool.execute(args, context)

          await logAgentAction({
            storeId,
            agentType: this.agentType,
            actionType: agentTool.name,
            actionCategory: agentTool.category,
            summary: result.summary,
            details: { args, result: result.data },
            status: result.success ? 'completed' : 'failed',
            executionMode: 'auto',
            relatedEntityType: result.relatedEntityType,
            relatedEntityId: result.relatedEntityId,
          })

          actionsCollector.push({
            actionType: agentTool.name,
            actionCategory: agentTool.category,
            summary: result.summary,
            details: { args, result: result.data },
            status: result.success ? 'completed' : 'failed',
            executionMode: 'auto',
            relatedEntityType: result.relatedEntityType,
            relatedEntityId: result.relatedEntityId,
          })

          return result
        },
      })
    }

    return wrapped
  }

  private skippedResult(startTime: number): AgentResult {
    return {
      skipped: true,
      actions: [],
      tokensInput: 0,
      tokensOutput: 0,
      modelUsed: '',
      durationMs: Date.now() - startTime,
    }
  }
}
