'use client'

import { useRef, useEffect } from 'react'
import { useAIBot } from './ai-bot-provider'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, User, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UIMessage } from '@ai-sdk/react'

export function AIBotMessages() {
  const { messages, isLoading, error, reload } = useAIBot()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  return (
    <ScrollArea className="h-full">
      <div ref={scrollRef} className="p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-3 max-w-[85%]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 max-w-[85%]">
              <p className="text-sm text-destructive mb-2">
                Something went wrong. Please try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reload()}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

// Extract text content from UIMessage parts
function getMessageContent(message: UIMessage): string {
  // UIMessage uses 'parts' array with different part types
  if (!message.parts || !Array.isArray(message.parts)) {
    return ''
  }

  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'

  // Get text content from message parts
  const rawContent = getMessageContent(message)

  // Parse tool results from message content
  const { content, toolResults } = parseMessageContent(rawContent)

  // Skip confirmation markers in display
  const displayContent = content
    .replace(/\[CONFIRM_ACTION\][\s\S]*?\[\/CONFIRM_ACTION\]/g, '')
    .replace(/\[CONFIRMED\].*$/g, '')
    .replace(/\[CANCELLED\].*$/g, '')
    .trim()

  if (!displayContent && toolResults.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'rounded-lg px-4 py-3 max-w-[85%]',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {/* Text content */}
        {displayContent && (
          <div className="text-sm whitespace-pre-wrap">{displayContent}</div>
        )}

        {/* Tool results */}
        {toolResults.length > 0 && (
          <div className="mt-2 space-y-2">
            {toolResults.map((result, index) => (
              <ToolResultDisplay key={index} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ToolResult {
  tool: string
  success: boolean
  message?: string
  data?: unknown
}

function ToolResultDisplay({ result }: { result: ToolResult }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 px-3 py-2 rounded-md text-xs',
        result.success
          ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300'
          : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
      )}
    >
      {result.success ? (
        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <span className="font-medium capitalize">{result.tool.replace(/_/g, ' ')}</span>
        {result.message && (
          <p className="mt-0.5 opacity-90">{result.message}</p>
        )}
      </div>
    </div>
  )
}

function parseMessageContent(content: string): {
  content: string
  toolResults: ToolResult[]
} {
  const toolResults: ToolResult[] = []

  // Parse tool result markers: [TOOL_RESULT]{...}[/TOOL_RESULT]
  const cleanContent = content.replace(
    /\[TOOL_RESULT\]([\s\S]*?)\[\/TOOL_RESULT\]/g,
    (_, jsonStr) => {
      try {
        const result = JSON.parse(jsonStr)
        toolResults.push(result)
      } catch (e) {
        // Ignore parse errors
      }
      return ''
    }
  )

  return {
    content: cleanContent.trim(),
    toolResults,
  }
}
