'use client'

import { useAIBot } from './ai-bot-provider'
import { Button } from '@/components/ui/button'
import { Bot, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIBotTriggerProps {
  variant?: 'default' | 'minimal' | 'floating'
  className?: string
}

export function AIBotTrigger({ variant = 'floating', className }: AIBotTriggerProps) {
  const { toggleOpen, isOpen, messages, isLoading } = useAIBot()

  if (variant === 'minimal') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleOpen}
        className={cn('h-9 w-9', className)}
        title="Open AI Assistant (⌘K)"
      >
        <Bot className="h-5 w-5" />
        <span className="sr-only">Open AI Assistant</span>
      </Button>
    )
  }

  if (variant === 'default') {
    return (
      <Button
        variant="outline"
        onClick={toggleOpen}
        className={cn('gap-2', className)}
      >
        <Bot className="h-4 w-4" />
        <span>AI Assistant</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
    )
  }

  // Floating variant (default)
  return (
    <button
      onClick={toggleOpen}
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'w-14 h-14 rounded-full',
        'bg-gradient-to-br from-purple-500 to-blue-500',
        'shadow-lg shadow-purple-500/25',
        'flex items-center justify-center',
        'transition-all duration-300 hover:scale-110',
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
        isOpen && 'scale-0 opacity-0',
        className
      )}
      title="Open AI Assistant (⌘K)"
    >
      <Bot className="h-6 w-6 text-white" />

      {/* Notification dot for new messages */}
      {messages.length > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
          {isLoading && (
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
        </span>
      )}

      {/* Sparkle animation on hover */}
      <Sparkles className="absolute h-3 w-3 text-white/50 -top-1 -right-1 animate-pulse" />
    </button>
  )
}
