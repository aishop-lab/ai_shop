// AI Bot API Endpoint
// Streaming chat endpoint with tool calling for the AI assistant

import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { tool } from '@ai-sdk/provider-utils'
import { getTextModel } from '@/lib/ai/provider'
import { buildSystemPrompt } from '@/lib/ai/bot/system-prompt'
import { botTools, requiresConfirmation } from '@/lib/ai/bot/tools'
import { executeTool } from '@/lib/ai/bot/tool-executor'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { PageContext } from '@/components/dashboard/ai-bot/ai-bot-provider'

export const runtime = 'nodejs'
export const maxDuration = 60

// Limits to prevent abuse
const MAX_MESSAGES = 50
const MAX_MESSAGE_LENGTH = 4000

interface RequestBody {
  messages: UIMessage[]
  storeId: string | null
  storeName: string | null
  context: PageContext
}

// Convert our tool definitions to the format expected by streamText
function createExecutableTools(storeId: string, isConfirmedAction: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {}

  for (const [name, def] of Object.entries(botTools)) {
    tools[name] = tool({
      description: def.description,
      inputSchema: def.inputSchema,
      execute: async (args) => {
        // For destructive tools: if this is NOT a confirmed action,
        // return a pending confirmation result instead of executing
        if (requiresConfirmation(name, args as Record<string, unknown>) && !isConfirmedAction) {
          return {
            success: true,
            requiresConfirmation: true,
            toolName: name,
            toolArgs: args,
            message: `This action requires your confirmation before proceeding.`,
          }
        }

        const result = await executeTool(name, args as Record<string, unknown>, { storeId })
        return result
      },
    })
  }

  return tools
}

export async function POST(req: Request) {
  try {
    // --- Authentication ---
    // Try cookie-based auth first, fall back to Authorization header
    let user: { id: string; email?: string } | null = null

    // Method 1: Cookie-based auth (works on localhost)
    const supabase = await createClient()
    const { data: cookieAuth } = await supabase.auth.getUser()
    if (cookieAuth?.user) {
      user = cookieAuth.user
    }

    // Method 2: Authorization header (fallback for production)
    if (!user) {
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (supabaseUrl && supabaseKey) {
          const tokenClient = createServiceClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          })
          const { data: tokenAuth } = await tokenClient.auth.getUser(token)
          if (tokenAuth?.user) {
            user = tokenAuth.user
          }
        }
      }
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body: RequestBody = await req.json()
    const { messages, storeId, storeName, context } = body

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'Store ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // --- Authorization: verify user owns a store ---
    // Use admin client to bypass RLS (user already verified via auth.getUser above)
    // Look up by owner_id first, then verify storeId matches
    const { data: userStores, error: storeError } = await getSupabaseAdmin()
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .limit(5)

    if (storeError) {
      console.error('[AI Bot] Store lookup error:', storeError.message)
      return new Response(JSON.stringify({ error: 'Failed to verify store ownership' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const store = userStores?.find(s => s.id === storeId)
    if (!store) {
      return new Response(JSON.stringify({
        error: 'Store not found or unauthorized',
        debug: {
          requestedStoreId: storeId,
          userId: user.id,
          userStoreCount: userStores?.length || 0,
          userStoreIds: userStores?.map(s => s.id) || [],
        }
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // --- Input validation ---
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Cap messages to prevent excessively long conversations
    const trimmedMessages = messages.slice(-MAX_MESSAGES)

    // Validate last message length
    const lastMessage = trimmedMessages[trimmedMessages.length - 1]
    const lastMessageContent = lastMessage?.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') || ''

    if (lastMessageContent.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: 'Message too long. Please keep messages under 4000 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build dynamic system prompt with context
    const systemPrompt = buildSystemPrompt({
      storeId,
      storeName,
      pageContext: context,
    })

    // Convert UIMessages to ModelMessages for the AI SDK
    const modelMessages = await convertToModelMessages(trimmedMessages)

    // Check if the last message is a confirmation or cancellation
    const isConfirmation =
      lastMessage?.role === 'user' &&
      lastMessageContent.startsWith('[CONFIRMED]')
    const isCancellation =
      lastMessage?.role === 'user' &&
      lastMessageContent.startsWith('[CANCELLED]')

    // If cancelled, just acknowledge it
    if (isCancellation) {
      const result = streamText({
        model: getTextModel(),
        system: systemPrompt,
        messages: [
          ...modelMessages.slice(0, -1),
          {
            role: 'user' as const,
            content: 'The user cancelled the previous action.',
          },
        ],
      })

      return result.toUIMessageStreamResponse()
    }

    // Create executable tools (pass confirmation state so destructive tools know whether to execute)
    const executableTools = createExecutableTools(storeId, isConfirmation)

    // Stream response with tools
    const result = streamText({
      model: getTextModel(),
      system: systemPrompt,
      messages: modelMessages,
      tools: executableTools,
      stopWhen: stepCountIs(5),
      onStepFinish: async ({ toolCalls }) => {
        if (toolCalls && toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            console.log(`[AI Bot] Tool executed: ${toolCall.toolName}`)
          }
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[AI Bot] Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

