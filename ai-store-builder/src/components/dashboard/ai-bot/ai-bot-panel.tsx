'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAIBot } from './ai-bot-provider'
import { AIBotMessages } from './ai-bot-messages'
import { AIBotInput } from './ai-bot-input'
import { AIBotConfirmation } from './ai-bot-confirmation'
import { Button } from '@/components/ui/button'
import { X, Bot, Sparkles } from 'lucide-react'

export function AIBotPanel() {
  const {
    isOpen,
    setIsOpen,
    messages,
    isLoading,
    pendingConfirmation,
    storeName,
  } = useAIBot()

  const panelRef = useRef<HTMLDivElement>(null)

  // Focus trap when open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const input = panelRef.current.querySelector('input, textarea') as HTMLElement
      if (input) {
        setTimeout(() => input.focus(), 100)
      }
    }
  }, [isOpen])

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-[400px] bg-background border-l shadow-xl z-50',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Assistant</h2>
              <p className="text-xs text-muted-foreground">
                {storeName ? `Managing ${storeName}` : 'How can I help?'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <AIBotMessages />
          )}
        </div>

        {/* Confirmation dialog overlay */}
        {pendingConfirmation && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-10">
            <AIBotConfirmation />
          </div>
        )}

        {/* Input area */}
        <AIBotInput />
      </div>
    </>
  )
}

function EmptyState() {
  const { setInput, handleSubmit } = useAIBot()

  const suggestions = [
    { label: 'How many products do I have?', icon: '📦' },
    { label: 'Show me recent orders', icon: '🛒' },
    { label: 'Create a 10% discount coupon', icon: '🎟️' },
    { label: 'What are my best sellers?', icon: '⭐' },
  ]

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    // Create a synthetic form event to trigger submit
    const form = document.querySelector('[data-ai-bot-form]') as HTMLFormElement
    if (form) {
      form.requestSubmit()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Welcome to AI Assistant</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
        I can help you manage your store, create products, handle orders, and more.
        Just ask me anything!
      </p>

      <div className="w-full space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Try asking
        </p>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.label}
            onClick={() => handleSuggestionClick(suggestion.label)}
            className="w-full px-4 py-3 text-left text-sm rounded-lg border bg-card hover:bg-accent transition-colors flex items-center gap-3"
          >
            <span className="text-lg">{suggestion.icon}</span>
            <span>{suggestion.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">⌘K</kbd> to open anytime
      </p>
    </div>
  )
}
