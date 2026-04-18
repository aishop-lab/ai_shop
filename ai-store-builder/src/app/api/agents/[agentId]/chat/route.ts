// src/app/api/agents/[agentId]/chat/route.ts
import { NextRequest } from 'next/server'
import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { getTextModel } from '@/lib/ai/provider'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, jsonError } from '@/lib/agents/auth'
import { AGENT_DISPLAY_NAMES, AGENT_DESCRIPTIONS } from '@/lib/agents/constants'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'
import { routeToSubAgent } from '@/lib/agents/sub-agents/router'
import { getSubAgent, getSubAgentsForChief } from '@/lib/agents/sub-agents/registry'
import { executeSubAgent } from '@/lib/agents/sub-agents/executor'
import { AGENT_INTROS } from '@/components/platform/onboarding/agent-intro-data'
import type { StoreContext } from '@/lib/agents/sub-agents/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_MESSAGES = 30
const MAX_MESSAGE_LENGTH = 4000

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * POST /api/agents/[agentId]/chat
 * Streaming chat with a specific agent.
 * Body: { messages: Array<{ role: string; content: string }> }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  // Fetch agent state to get agent_type and config
  const admin = getSupabaseAdmin()
  const { data: agent, error: agentError } = await admin
    .from('agent_states')
    .select('agent_type, config, autonomy_level, is_enabled')
    .eq('id', agentId)
    .eq('store_id', storeId)
    .single()

  if (agentError || !agent) {
    return jsonError('Agent not found', 404)
  }

  if (!agent.is_enabled) {
    return jsonError('Agent is disabled', 400)
  }

  const validAgentTypes: AgentType[] = ['marketing', 'sales', 'support', 'analytics', 'technical']
  if (!validAgentTypes.includes(agent.agent_type as AgentType)) {
    return jsonError(`Invalid agent type: ${agent.agent_type}`, 400)
  }
  const agentType = agent.agent_type as AgentType

  let body: { messages: Array<{ role: string; content: string }> }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return jsonError('messages array is required', 400)
  }

  // Cap messages
  const trimmedMessages = body.messages.slice(-MAX_MESSAGES)

  // Validate last message
  const lastMessage = trimmedMessages[trimmedMessages.length - 1]
  if (
    lastMessage &&
    typeof lastMessage.content === 'string' &&
    lastMessage.content.length > MAX_MESSAGE_LENGTH
  ) {
    return jsonError('Message too long. Keep messages under 4000 characters.', 400)
  }

  // Fetch store info for context (blueprint needed for sub-agent system prompts)
  const { data: store } = await admin
    .from('stores')
    .select('name, slug, blueprint')
    .eq('id', storeId)
    .single()

  // Fetch recent memories for context
  const { data: memories } = await admin
    .from('agent_memory')
    .select('memory_key, memory_value')
    .eq('store_id', storeId)
    .eq('agent_type', agentType)
    .order('updated_at', { ascending: false })
    .limit(10)

  const memoryContext =
    memories && memories.length > 0
      ? `\n\nRelevant memories:\n${memories.map((m) => `- ${m.memory_key}: ${JSON.stringify(m.memory_value)}`).join('\n')}`
      : ''

  // ---------------------------------------------------------------------------
  // Sub-agent routing — determine which specialist handles this message
  // ---------------------------------------------------------------------------
  const lastUserMessage =
    [...trimmedMessages].reverse().find((m) => m.role === 'user')?.content ?? ''

  const subAgentId = routeToSubAgent(agentType, lastUserMessage)
  const subAgent = getSubAgent(subAgentId)

  // Build a minimal StoreContext so we can call the sub-agent's systemPrompt
  const rawBlueprint = store?.blueprint
  const blueprint: Record<string, unknown> = (typeof rawBlueprint === 'object' && rawBlueprint !== null) ? rawBlueprint as Record<string, unknown> : {}
  const bpStr = (key: string, fallback: string) => typeof blueprint[key] === 'string' ? blueprint[key] : fallback
  const location = (typeof blueprint.location === 'object' && blueprint.location !== null) ? blueprint.location as Record<string, unknown> : {}
  const storeContext: StoreContext = {
    storeId,
    storeName: store?.name ?? 'My Store',
    storeSlug: typeof store?.slug === 'string' ? store.slug : '',
    category: bpStr('business_type', bpStr('category', 'General')),
    description: bpStr('description', ''),
    brandVibe: bpStr('brand_vibe', 'modern'),
    primaryColor: bpStr('primary_color', '#6366f1'),
    currency: typeof location.currency === 'string' ? location.currency : 'INR',
    autonomyLevel: (agent.autonomy_level as AutonomyLevel) ?? 3,
    // Lazy-loaded data — stubs for chat context (not needed for system prompt)
    products: async () => [],
    orders: async () => [],
    customers: async () => [],
    recentActions: async () => [],
  }

  // Get all sub-agents for this Chief (used by delegation tools)
  const chiefSubAgents = getSubAgentsForChief(agentType)
  const chiefIntro = AGENT_INTROS[agentType]

  // Build the delegation instructions block
  const delegationInstructions = `
You have a team of specialist sub-agents. When a request needs specialized work (e.g., writing copy, analyzing data, recovering carts), delegate to the appropriate sub-agent using the delegate_to_sub_agent tool. You can also list your team with list_my_sub_agents.

Your sub-agents will execute the task and return results. Present their results to the merchant in a clear, conversational way.

Your department: ${chiefIntro.codename} — ${chiefIntro.tagline}
Available specialists: ${chiefSubAgents.map((s) => `${s.codename} (${s.id})`).join(', ')}`

  // Build the base system prompt
  const baseSystemPrompt = `You are the ${AGENT_DISPLAY_NAMES[agentType]} for the store "${store?.name || 'Unknown'}".
${AGENT_DESCRIPTIONS[agentType]}.

CRITICAL CONTEXT — use these values when calling tools:
- store_id: "${storeId}"
- store_name: "${store?.name || 'Unknown'}"
- store_slug: "${store?.slug || ''}"
- currency: "${storeContext.currency}"

Your autonomy level is ${agent.autonomy_level}/5. You are having a conversation with the store merchant.
Be concise, helpful, and action-oriented. When the merchant asks you to do something, USE YOUR TOOLS to actually do it — don't just describe what you would do. Call tools directly to fetch data, send emails, create campaigns, etc.
If a tool requires merchant approval, explain what you want to do and ask for confirmation.
${delegationInstructions}`

  // Enhance system prompt with sub-agent identity and specialized instructions
  let systemPrompt = baseSystemPrompt
  if (subAgent) {
    const subAgentSystemPrompt = subAgent.systemPrompt(storeContext)
    systemPrompt = `${baseSystemPrompt}

---
You are currently operating as ${subAgent.codename} (${subAgent.role}), a specialist within the ${AGENT_DISPLAY_NAMES[agentType]} department.

${subAgentSystemPrompt}
---
${memoryContext}`
  } else {
    systemPrompt = `${baseSystemPrompt}${memoryContext}`
  }

  // Collect sub-agent tools if defined
  const subAgentTools =
    subAgent?.tools && Object.keys(subAgent.tools).length > 0
      ? (subAgent.tools as Parameters<typeof streamText>[0]['tools'])
      : undefined

  // ---------------------------------------------------------------------------
  // Delegation tools — allow the Chief to delegate to specialist sub-agents
  // ---------------------------------------------------------------------------
  const delegationTools = {
    delegate_to_sub_agent: tool({
      description:
        'Delegate a specific task to one of your specialist sub-agents. Use this when the user\'s request requires specialized expertise.',
      inputSchema: z.object({
        sub_agent_id: z.string().describe('The sub-agent ID to delegate to (e.g. "cart-whisperer", "copysmith")'),
        instruction: z.string().describe('What to ask the sub-agent to do — be specific and actionable'),
      }),
      execute: async ({ sub_agent_id, instruction }) => {
        try {
          const result = await executeSubAgent(
            sub_agent_id as Parameters<typeof executeSubAgent>[0],
            storeId,
            { instruction }
          )
          return {
            success: true,
            sub_agent_id,
            output: result.output,
            requires_approval: result.requiresApproval,
            approval_id: result.approvalId,
            duration_ms: result.durationMs,
          }
        } catch (err) {
          return {
            success: false,
            sub_agent_id,
            error: err instanceof Error ? err.message : 'Unknown error during delegation',
          }
        }
      },
    }),

    list_my_sub_agents: tool({
      description: 'List all specialist sub-agents available in your department.',
      inputSchema: z.object({}),
      execute: async () => {
        return chiefSubAgents.map((s) => ({
          id: s.id,
          codename: s.codename,
          role: s.role,
          description: s.description,
          category: s.category,
        }))
      },
    }),
  }

  // Log the chat interaction (fire-and-forget — don't block streaming)
  if (subAgent) {
    admin
      .from('agent_actions')
      .insert({
        store_id: storeId,
        agent_type: agentType,
        sub_agent_type: subAgentId,
        action_type: 'chat_message',
        action_category: 'communication',
        summary: `${subAgent.codename}: Chat message routed from ${AGENT_DISPLAY_NAMES[agentType]}`,
        details: {
          message_preview: lastUserMessage.substring(0, 200),
          sub_agent_id: subAgentId,
          sub_agent_codename: subAgent.codename,
        },
        status: 'completed',
        execution_mode: 'auto',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        tokens_input: 0,
        tokens_output: 0,
        estimated_cost_usd: 0,
        api_costs: {},
      })
      .then(undefined, () => {
        // Non-critical — logging failure must not break streaming
      })
  }

  // Merge sub-agent tools with delegation tools
  const allTools = {
    ...delegationTools,
    ...(subAgentTools ?? {}),
  }

  // Stream the response
  const result = streamText({
    model: getTextModel(),
    system: systemPrompt,
    messages: trimmedMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    tools: allTools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
