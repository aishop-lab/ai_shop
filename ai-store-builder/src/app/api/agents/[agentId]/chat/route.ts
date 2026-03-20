// src/app/api/agents/[agentId]/chat/route.ts
import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { getTextModel } from '@/lib/ai/provider'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, jsonError } from '@/lib/agents/auth'
import { AGENT_DISPLAY_NAMES, AGENT_DESCRIPTIONS } from '@/lib/agents/constants'
import type { AgentType } from '@/lib/agents/types'

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

  // Fetch store name for context
  const { data: store } = await admin
    .from('stores')
    .select('name')
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

  const systemPrompt = `You are the ${AGENT_DISPLAY_NAMES[agentType]} for the store "${store?.name || 'Unknown'}".
${AGENT_DESCRIPTIONS[agentType]}.

Your autonomy level is ${agent.autonomy_level}/5. You are having a conversation with the store merchant.
Be concise, helpful, and action-oriented. When the merchant asks you to do something, explain what you would do and whether it requires approval.
${memoryContext}`

  // Stream the response
  const result = streamText({
    model: getTextModel(),
    system: systemPrompt,
    messages: trimmedMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  return result.toUIMessageStreamResponse()
}
