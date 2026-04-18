// Sub-Agent Executor — Core engine that runs any sub-agent
// Takes a sub-agent ID, store ID, and task → executes and logs the result

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateText, type ToolSet } from 'ai'
import { geminiFlash } from '@/lib/ai/provider'
import { getSubAgent } from './registry'
import { loadStoreContext } from './context'
import type { SubAgentId, SubAgentTask, SubAgentResult, SubAgentDefinition, StoreContext } from './types'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'
import { getMemories } from '@/lib/agents/memory'

// Cost per token (Gemini 2.0 Flash approximate pricing)
const INPUT_COST_PER_TOKEN = 0.000000075  // $0.075 per 1M tokens
const OUTPUT_COST_PER_TOKEN = 0.0000003   // $0.30 per 1M tokens

// ---------------------------------------------------------------------------
// Execute a sub-agent
// ---------------------------------------------------------------------------

export async function executeSubAgent(
  subAgentId: SubAgentId,
  storeId: string,
  task: SubAgentTask
): Promise<SubAgentResult> {
  const startTime = Date.now()

  // 1. Look up sub-agent definition
  const subAgent = getSubAgent(subAgentId)
  if (!subAgent) {
    throw new Error(`Unknown sub-agent: ${subAgentId}. Check registry.`)
  }

  // 2. Check if Chief is enabled
  const chiefState = await getChiefState(storeId, subAgent.chief)
  if (!chiefState || !chiefState.is_enabled) {
    return {
      subAgentId,
      chief: subAgent.chief,
      output: null,
      actions: [],
      tokensInput: 0,
      tokensOutput: 0,
      durationMs: Date.now() - startTime,
      requiresApproval: false,
    }
  }

  // 3. Load store context
  const context = await loadStoreContext(storeId, chiefState.autonomy_level)

  // 4. Execute based on category
  let result: SubAgentResult

  try {
    switch (subAgent.category) {
      case 'data-only':
        result = await executeDataOnly(subAgent, context, task, startTime)
        break
      case 'llm-only':
        result = await executeLLM(subAgent, context, task, startTime, false)
        break
      case 'llm-api':
      case 'llm-new-api':
        result = await executeLLM(subAgent, context, task, startTime, true)
        break
      default:
        throw new Error(`Unknown sub-agent category: ${subAgent.category}`)
    }
  } catch (error) {
    // Log the error
    await logSubAgentAction(storeId, subAgent, {
      actionType: 'execution_error',
      actionCategory: 'maintenance',
      summary: `${subAgent.codename} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : String(error) },
      status: 'failed',
    })

    // Update Chief error count
    await incrementChiefErrorCount(storeId, subAgent.chief)

    return {
      subAgentId,
      chief: subAgent.chief,
      output: null,
      actions: [{
        actionType: 'execution_error',
        actionCategory: 'maintenance',
        summary: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        status: 'failed',
      }],
      tokensInput: 0,
      tokensOutput: 0,
      durationMs: Date.now() - startTime,
      requiresApproval: false,
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Data-only execution (no LLM, just query function)
// ---------------------------------------------------------------------------

async function executeDataOnly(
  subAgent: SubAgentDefinition,
  context: StoreContext,
  task: SubAgentTask,
  startTime: number
): Promise<SubAgentResult> {
  if (!subAgent.queryFn) {
    throw new Error(`Data-only sub-agent ${subAgent.id} has no queryFn defined`)
  }

  const output = await subAgent.queryFn(context, task.params || {})

  // Log the action
  await logSubAgentAction(context.storeId, subAgent, {
    actionType: 'data_query',
    actionCategory: 'analysis',
    summary: `${subAgent.codename} executed: ${task.instruction}`,
    details: { params: task.params, resultSummary: summarizeOutput(output) },
    status: 'completed',
  })

  return {
    subAgentId: subAgent.id,
    chief: subAgent.chief,
    output,
    actions: [{
      actionType: 'data_query',
      actionCategory: 'analysis',
      summary: `${subAgent.codename}: ${task.instruction}`,
      details: { resultSummary: summarizeOutput(output) },
      status: 'completed',
    }],
    tokensInput: 0,
    tokensOutput: 0,
    durationMs: Date.now() - startTime,
    requiresApproval: false,
  }
}

// ---------------------------------------------------------------------------
// LLM execution (with or without tools)
// ---------------------------------------------------------------------------

async function executeLLM(
  subAgent: SubAgentDefinition,
  context: StoreContext,
  task: SubAgentTask,
  startTime: number,
  useTools: boolean
): Promise<SubAgentResult> {
  let systemPrompt = subAgent.systemPrompt(context)

  // Inject agent memories (learned preferences, feedback, patterns)
  try {
    const memories = await getMemories({
      store_id: context.storeId,
      agent_type: subAgent.chief,
      min_confidence: 0.5,
      limit: 20,
    })
    if (memories.length > 0) {
      const memoryBlock = memories
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
        .map((m) => {
          const val = m.memory_value as Record<string, unknown>
          const lesson = val?.lesson || val?.value || JSON.stringify(val)
          return `- [${m.memory_type}] ${lesson}`
        })
        .join('\n')
      systemPrompt += `\n\n## Learned Preferences & Feedback\nThe following are patterns learned from past merchant feedback, approvals, and rejections. Respect these when making decisions:\n${memoryBlock}`
    }
  } catch {
    // Non-critical — proceed without memories
  }

  // Build the prompt with task instruction + any additional context
  let userPrompt = task.instruction
  if (task.context) {
    userPrompt += `\n\nAdditional context:\n${JSON.stringify(task.context, null, 2)}`
  }

  // Determine if this action needs approval BEFORE execution
  const actionType = inferActionType(subAgent, task)
  const requiresApproval = checkApprovalNeeded(subAgent, actionType, context.autonomyLevel)

  // If action requires approval, create approval request and DON'T execute tools
  if (requiresApproval) {
    // Run LLM without tools to get the recommendation/plan only
    const planResult = await generateText({
      model: geminiFlash,
      system: systemPrompt + '\n\nIMPORTANT: This action requires approval. Describe what you would do and why, but do NOT execute any actions. Present your plan for review.',
      prompt: userPrompt,
    })

    const tokensIn = planResult.usage.inputTokens || 0
    const tokensOut = planResult.usage.outputTokens || 0
    const estimatedCost = (tokensIn * INPUT_COST_PER_TOKEN) + (tokensOut * OUTPUT_COST_PER_TOKEN)

    const approvalId = await createApprovalRequest(context.storeId, subAgent, {
      actionType,
      summary: `${subAgent.codename}: ${task.instruction}`,
      details: { output: planResult.text, task: task.instruction },
    })

    await logSubAgentAction(context.storeId, subAgent, {
      actionType,
      actionCategory: inferActionCategory(subAgent),
      summary: `${subAgent.codename}: ${task.instruction}`,
      details: {
        output: planResult.text,
        requiresApproval: true,
        approvalId,
      },
      status: 'requires_approval',
      tokensInput: tokensIn,
      tokensOutput: tokensOut,
      estimatedCost,
    })

    await updateChiefStats(context.storeId, subAgent.chief, true)

    return {
      subAgentId: subAgent.id,
      chief: subAgent.chief,
      output: planResult.text,
      actions: [{
        actionType,
        actionCategory: inferActionCategory(subAgent),
        summary: `${subAgent.codename}: ${task.instruction}`,
        details: { output: planResult.text },
        status: 'requires_approval',
      }],
      tokensInput: tokensIn,
      tokensOutput: tokensOut,
      durationMs: Date.now() - startTime,
      requiresApproval: true,
      approvalId,
    }
  }

  // Build generateText options — with or without tools
  const hasTools = useTools && subAgent.tools && Object.keys(subAgent.tools).length > 0
  const toolCallActions: Array<{ tool: string; args: unknown; result: unknown }> = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateOptions: Record<string, any> = {
    model: geminiFlash,
    system: systemPrompt,
    prompt: userPrompt,
  }

  if (hasTools) {
    generateOptions.tools = subAgent.tools as ToolSet
    generateOptions.maxSteps = 5  // Allow up to 5 tool-calling steps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generateOptions.onStepFinish = (step: any) => {
      // Track tool calls for logging
      if (step.toolCalls) {
        for (const tc of step.toolCalls) {
          toolCallActions.push({
            tool: tc.toolName,
            args: tc.args ?? null,
            result: step.toolResults?.find((r: { toolCallId: string }) => r.toolCallId === tc.toolCallId)?.output ?? null,
          })
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llmResult = await generateText(generateOptions as any)

  const tokensIn = llmResult.usage.inputTokens || 0
  const tokensOut = llmResult.usage.outputTokens || 0
  const estimatedCost = (tokensIn * INPUT_COST_PER_TOKEN) + (tokensOut * OUTPUT_COST_PER_TOKEN)

  // Build detailed output including tool results
  const output = {
    text: llmResult.text,
    toolCalls: toolCallActions.length > 0 ? toolCallActions : undefined,
    stepsCompleted: llmResult.steps?.length ?? 1,
  }

  await logSubAgentAction(context.storeId, subAgent, {
    actionType,
    actionCategory: inferActionCategory(subAgent),
    summary: `${subAgent.codename}: ${task.instruction}`,
    details: {
      output: llmResult.text,
      toolCalls: toolCallActions,
      stepsCompleted: output.stepsCompleted,
      requiresApproval: false,
    },
    status: 'completed',
    tokensInput: tokensIn,
    tokensOutput: tokensOut,
    estimatedCost,
  })

  // Update Chief stats
  await updateChiefStats(context.storeId, subAgent.chief, false)

  return {
    subAgentId: subAgent.id,
    chief: subAgent.chief,
    output,
    actions: [{
      actionType,
      actionCategory: inferActionCategory(subAgent),
      summary: `${subAgent.codename}: ${task.instruction}`,
      details: { output: llmResult.text, toolCalls: toolCallActions },
      status: 'completed',
    }],
    tokensInput: tokensIn,
    tokensOutput: tokensOut,
    durationMs: Date.now() - startTime,
    requiresApproval: false,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getChiefState(storeId: string, chief: AgentType) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('agent_states')
    .select('is_enabled, autonomy_level, status, error_count')
    .eq('store_id', storeId)
    .eq('agent_type', chief)
    .single()
  return data as { is_enabled: boolean; autonomy_level: AutonomyLevel; status: string; error_count: number } | null
}

function inferActionType(subAgent: SubAgentDefinition, task: SubAgentTask): string {
  // Check if the task instruction matches any known action types
  const instruction = task.instruction.toLowerCase()

  // Check autonomous actions first
  for (const actionType of subAgent.autonomyRules.autonomous) {
    if (instruction.includes(actionType.replace(/_/g, ' '))) return actionType
  }

  // Check chief approval actions
  for (const actionType of subAgent.autonomyRules.needsChiefApproval) {
    if (instruction.includes(actionType.replace(/_/g, ' '))) return actionType
  }

  // Check merchant approval actions
  for (const actionType of subAgent.autonomyRules.needsMerchantApproval) {
    if (instruction.includes(actionType.replace(/_/g, ' '))) return actionType
  }

  // Default to the first autonomous action or a generic type
  return subAgent.autonomyRules.autonomous[0] || 'general_task'
}

function inferActionCategory(subAgent: SubAgentDefinition): 'communication' | 'campaign' | 'optimization' | 'analysis' | 'maintenance' {
  const chiefCategories: Record<AgentType, 'communication' | 'campaign' | 'optimization' | 'analysis' | 'maintenance'> = {
    marketing: 'campaign',
    sales: 'optimization',
    support: 'communication',
    analytics: 'analysis',
    technical: 'maintenance',
  }
  return chiefCategories[subAgent.chief]
}

function checkApprovalNeeded(
  subAgent: SubAgentDefinition,
  actionType: string,
  autonomyLevel: AutonomyLevel
): boolean {
  // Merchant-level approval always needed regardless of autonomy
  if (subAgent.autonomyRules.needsMerchantApproval.includes(actionType)) {
    return true
  }

  // Chief-level approval depends on autonomy setting
  if (subAgent.autonomyRules.needsChiefApproval.includes(actionType)) {
    // Level 4-5: Chief auto-approves
    // Level 1-3: Needs explicit approval
    return autonomyLevel < 4
  }

  // Autonomous actions never need approval
  return false
}

async function logSubAgentAction(
  storeId: string,
  subAgent: SubAgentDefinition,
  action: {
    actionType: string
    actionCategory: string
    summary: string
    details: Record<string, unknown>
    status: string
    tokensInput?: number
    tokensOutput?: number
    estimatedCost?: number
  }
) {
  const supabase = getSupabaseAdmin()
  await supabase.from('agent_actions').insert({
    store_id: storeId,
    agent_type: subAgent.chief,
    sub_agent_type: subAgent.id,
    action_type: action.actionType,
    action_category: action.actionCategory,
    summary: action.summary,
    details: action.details,
    status: action.status,
    execution_mode: action.status === 'requires_approval' ? 'approved' : 'auto',
    started_at: new Date().toISOString(),
    completed_at: action.status === 'completed' ? new Date().toISOString() : null,
    tokens_input: action.tokensInput ?? 0,
    tokens_output: action.tokensOutput ?? 0,
    estimated_cost_usd: action.estimatedCost ?? 0,
    api_costs: {},
  })
}

async function createApprovalRequest(
  storeId: string,
  subAgent: SubAgentDefinition,
  action: { actionType: string; summary: string; details: Record<string, unknown> }
): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase.from('agent_approvals').insert({
    store_id: storeId,
    agent_type: subAgent.chief,
    sub_agent_type: subAgent.id,
    action_type: action.actionType,
    summary: action.summary,
    reasoning: `${subAgent.codename} requires approval for this action.`,
    details: action.details,
    priority: 'normal',
    status: 'pending',
  }).select('id').single()

  return data?.id || ''
}

async function updateChiefStats(storeId: string, chief: AgentType, hasApproval: boolean) {
  const supabase = getSupabaseAdmin()
  const updates: Record<string, unknown> = {
    last_action_at: new Date().toISOString(),
    status: hasApproval ? 'waiting_approval' : 'idle',
  }

  // Just update status and last_action_at
  await supabase
    .from('agent_states')
    .update(updates)
    .eq('store_id', storeId)
    .eq('agent_type', chief)
}

async function incrementChiefErrorCount(storeId: string, chief: AgentType) {
  const supabase = getSupabaseAdmin()
  await supabase
    .from('agent_states')
    .update({
      status: 'error',
      last_error: 'Sub-agent execution failed',
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', storeId)
    .eq('agent_type', chief)
}

function summarizeOutput(output: unknown): string {
  if (output === null || output === undefined) return 'No output'
  if (typeof output === 'string') return output.substring(0, 200)
  if (typeof output === 'number') return String(output)
  if (Array.isArray(output)) return `Array with ${output.length} items`
  if (typeof output === 'object') return `Object with ${Object.keys(output).length} keys`
  return String(output).substring(0, 200)
}
