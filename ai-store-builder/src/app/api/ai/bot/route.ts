// AI Bot API Endpoint
// Streaming chat endpoint with tool calling for the AI assistant

import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { tool } from '@ai-sdk/provider-utils'
import { getTextModel } from '@/lib/ai/provider'
import { buildSystemPrompt } from '@/lib/ai/bot/system-prompt'
import { botTools, requiresConfirmation } from '@/lib/ai/bot/tools'
import { executeTool } from '@/lib/ai/bot/tool-executor'
import type { PageContext } from '@/components/dashboard/ai-bot/ai-bot-provider'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RequestBody {
  messages: UIMessage[]
  storeId: string | null
  storeName: string | null
  context: PageContext
}

// Convert our tool definitions to the format expected by streamText
function createExecutableTools(storeId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {}

  for (const [name, def] of Object.entries(botTools)) {
    tools[name] = tool({
      description: def.description,
      inputSchema: def.inputSchema,
      execute: async (args) => {
        const result = await executeTool(name, args as Record<string, unknown>, { storeId })
        return result
      },
    })
  }

  return tools
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json()
    const { messages, storeId, storeName, context } = body

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'Store ID is required' }), {
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
    const modelMessages = await convertToModelMessages(messages)

    // Check if the last message is a confirmation (check original UIMessage)
    const lastMessage = messages[messages.length - 1]
    const lastMessageContent = lastMessage?.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') || ''
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

    // Create executable tools
    const executableTools = createExecutableTools(storeId)

    // Stream response with tools
    // stopWhen: stepCountIs(5) allows the model to continue after tool calls and provide a response
    const result = streamText({
      model: getTextModel(),
      system: systemPrompt,
      messages: modelMessages,
      tools: executableTools,
      stopWhen: stepCountIs(5),
      onStepFinish: async ({ toolCalls }) => {
        // Log tool calls for debugging
        if (toolCalls && toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            const toolName = toolCall.toolName
            console.log(`[AI Bot] Tool executed: ${toolName}`)

            // Check if tool requires confirmation
            if (!isConfirmation && requiresConfirmation(toolName)) {
              console.log(`[AI Bot] Tool ${toolName} would require confirmation in UI`)
            }
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
