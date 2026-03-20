// src/lib/agents/support/channels.ts
// Channel routing for incoming customer messages

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { ConversationChannel } from '@/lib/agents/types'

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
}

/**
 * Route an incoming customer message through the appropriate channel.
 * Finds or creates a conversation, saves the message, and returns an agent response.
 *
 * TODO: Integrate real SupportAgent execution once agent orchestration is wired up.
 */
export async function routeIncomingMessage(
  params: RouteMessageParams
): Promise<RouteMessageResult> {
  const { channel, storeId, message, channelIdentifier, customerId, conversationId } = params
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

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
    metadata: { channel, channelIdentifier },
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

  // 4. TODO: Execute SupportAgent with real AI response
  // When the agent orchestration layer is ready, replace the placeholder below with:
  //
  // const result = await supportAgent.execute({
  //   storeId,
  //   agentType: 'support',
  //   source: 'chat',
  //   context: { conversationId: convoId, message, channel },
  //   messages: [{ role: 'user', content: message }],
  // })
  // const agentResponse = result.actions[0]?.details?.response as string ?? '...'

  const agentResponse =
    'Thank you for reaching out! Our support agent is processing your query and will get back to you shortly.'

  // 5. Save agent response as a conversation message
  const { error: agentMsgError } = await supabase.from('conversation_messages').insert({
    conversation_id: convoId,
    role: 'agent',
    content: agentResponse,
    metadata: { channel, automated: true },
  })

  if (agentMsgError) {
    // Non-fatal — we still have the response; log and continue
    console.error('Failed to save agent response message:', agentMsgError.message)
  }

  return { conversationId: convoId!, response: agentResponse }
}
