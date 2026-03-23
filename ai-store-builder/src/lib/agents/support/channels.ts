// src/lib/agents/support/channels.ts
// Channel routing for incoming customer messages

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { ConversationChannel } from '@/lib/agents/types'
import { detectLanguage } from './language-detector'
import { supportAgent } from './agent'
import { logger } from '@/lib/logger'

export interface RouteMessageParams {
  channel: ConversationChannel
  storeId: string
  message: string
  channelIdentifier: string // session ID, email address, or phone number
  customerId?: string
  conversationId?: string // existing conversation to continue
}

export interface RouteMessageResult {
  conversationId: string
  response: string
  language?: string
}

/**
 * Route an incoming customer message through the appropriate channel.
 * Finds or creates a conversation, saves the message, invokes the Support Agent,
 * and returns the response.
 */
export async function routeIncomingMessage(
  params: RouteMessageParams
): Promise<RouteMessageResult> {
  const { channel, storeId, message, channelIdentifier, customerId, conversationId } = params
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  // Detect language for context
  const languageDetection = detectLanguage(message)

  // 1. Find or create conversation
  let convoId = conversationId

  if (convoId) {
    // Verify conversation belongs to this store
    const { data: existing, error } = await supabase
      .from('customer_conversations')
      .select('id, status')
      .eq('id', convoId)
      .eq('store_id', storeId)
      .single()

    if (error || !existing) {
      // Conversation not found or wrong store — create a new one
      convoId = undefined
    }
  }

  if (!convoId) {
    // Try to find an open conversation for this channel identifier
    const { data: existingConvo } = await supabase
      .from('customer_conversations')
      .select('id, status')
      .eq('store_id', storeId)
      .eq('channel', channel)
      .eq('channel_identifier', channelIdentifier)
      .in('status', ['open', 'waiting_customer'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingConvo) {
      convoId = existingConvo.id
    } else {
      // Create a new conversation
      const { data: newConvo, error: createError } = await supabase
        .from('customer_conversations')
        .insert({
          store_id: storeId,
          customer_id: customerId ?? null,
          channel,
          channel_identifier: channelIdentifier,
          status: 'open',
          assigned_to: 'agent',
          last_message_at: now,
          message_count: 0,
        })
        .select('id')
        .single()

      if (createError || !newConvo) {
        throw new Error(`Failed to create conversation: ${createError?.message}`)
      }

      convoId = newConvo.id
    }
  }

  // 2. Insert customer message
  const { error: msgError } = await supabase.from('conversation_messages').insert({
    conversation_id: convoId,
    role: 'customer',
    content: message,
    metadata: { channel, channelIdentifier, language: languageDetection.detected },
  })

  if (msgError) {
    throw new Error(`Failed to save customer message: ${msgError.message}`)
  }

  // 3. Update conversation stats — try RPC increment, fall back to read-increment-write
  const rpcResult = await supabase.rpc('increment_conversation_message_count', {
    convo_id: convoId,
  })

  if (rpcResult.error) {
    // RPC not yet created — fall back to manual increment
    const { data: convoData } = await supabase
      .from('customer_conversations')
      .select('message_count')
      .eq('id', convoId)
      .single()

    await supabase
      .from('customer_conversations')
      .update({
        last_message_at: now,
        message_count: (convoData?.message_count ?? 0) + 1,
      })
      .eq('id', convoId)
  } else {
    await supabase
      .from('customer_conversations')
      .update({ last_message_at: now })
      .eq('id', convoId)
  }

  // 4. Load previous conversation messages for context
  const { data: previousMessages } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('conversation_id', convoId)
    .order('created_at', { ascending: true })
    .limit(20) // Keep context window manageable

  const aiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const msg of previousMessages ?? []) {
    aiMessages.push({
      role: msg.role === 'customer' ? 'user' : 'assistant',
      content: msg.content,
    })
  }

  // 5. Execute Support Agent with real AI response
  let agentResponse: string = ''

  try {
    const result = await supportAgent.execute({
      storeId,
      agentType: 'support',
      source: 'chat',
      context: {
        conversationId: convoId,
        channel,
        language: languageDetection.detected,
      },
      messages: aiMessages,
    })

    // Extract the response text from the agent result
    // The agent may have used the sendReply tool, or we take the last action summary
    const replyAction = result.actions.find(a => a.actionType === 'sendReply')
    if (replyAction?.details?.args) {
      const args = replyAction.details.args as Record<string, unknown>
      agentResponse = (args.message as string) ?? ''
    }

    if (!agentResponse) {
      // Fall back to any action summary or a generic response
      agentResponse = result.actions[0]?.summary ?? generateFallbackResponse(languageDetection.detected)
    }
  } catch (error) {
    logger.error('[channels] Support agent execution failed', error instanceof Error ? error : undefined)
    agentResponse = generateFallbackResponse(languageDetection.detected)
  }

  // 6. Save agent response as a conversation message
  const { error: agentMsgError } = await supabase.from('conversation_messages').insert({
    conversation_id: convoId,
    role: 'agent',
    content: agentResponse,
    metadata: { channel, automated: true, language: languageDetection.detected },
  })

  if (agentMsgError) {
    // Non-fatal — we still have the response; log and continue
    logger.error(`Failed to save agent response message: ${agentMsgError.message}`)
  }

  return {
    conversationId: convoId!,
    response: agentResponse,
    language: languageDetection.detected,
  }
}

/**
 * Generate a fallback response when the agent fails, in the detected language.
 */
function generateFallbackResponse(language: string): string {
  switch (language) {
    case 'hi':
      return 'धन्यवाद! हमारी सहायता टीम आपकी बात पर काम कर रही है और जल्द ही आपसे संपर्क करेगी।'
    case 'hinglish':
      return 'Thank you! Humari support team aapki query pe kaam kar rahi hai aur jald hi aapko reply karegi.'
    default:
      return 'Thank you for reaching out! Our support team is looking into your query and will get back to you shortly.'
  }
}
