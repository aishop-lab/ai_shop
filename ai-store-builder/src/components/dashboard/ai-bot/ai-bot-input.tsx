'use client'

import { useRef, useEffect } from 'react'
import { useAIBot } from './ai-bot-provider'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Square, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AIBotInput() {
  const {
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    pendingConfirmation,
    storeId,
    isStoreLoaded,
  } = useAIBot()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [input])

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading && !pendingConfirmation) {
        const form = e.currentTarget.closest('form')
        if (form) {
          form.requestSubmit()
        }
      }
    }
  }

  const isDisabled = isLoading || !!pendingConfirmation || !isStoreLoaded || !storeId
  const canSubmit = input.trim().length > 0 && !isLoading && !pendingConfirmation && !!storeId

  // Determine placeholder text
  const getPlaceholder = () => {
    if (!isStoreLoaded) return 'Loading store...'
    if (!storeId) return 'Create a store first to use the AI assistant'
    if (pendingConfirmation) return 'Please confirm or cancel the action above'
    return 'Ask me anything about your store...'
  }

  return (
    <div className="border-t p-4 bg-background">
      {/* Show message if no store */}
      {isStoreLoaded && !storeId && (
        <p className="text-sm text-muted-foreground text-center mb-3">
          Complete onboarding to start using the AI assistant
        </p>
      )}

      <form
        data-ai-bot-form
        onSubmit={handleSubmit}
        className="flex items-end gap-2"
      >
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={isDisabled}
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none pr-4',
              'text-sm placeholder:text-muted-foreground/60'
            )}
            rows={1}
          />
        </div>

        {isLoading ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-[44px] w-[44px] flex-shrink-0"
            onClick={() => stop()}
          >
            <Square className="h-4 w-4" />
            <span className="sr-only">Stop</span>
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="h-[44px] w-[44px] flex-shrink-0"
            disabled={!canSubmit}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        )}
      </form>

      {/* Quick suggestions when empty and store is available */}
      {!input && !isLoading && storeId && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <QuickSuggestion text="Show stats" />
          <QuickSuggestion text="Recent orders" />
          <QuickSuggestion text="Low stock items" />
        </div>
      )}

      {/* Keyboard hint */}
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono">Enter</kbd> to send,{' '}
        <kbd className="px-1 py-0.5 rounded bg-muted font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  )
}

function QuickSuggestion({ text }: { text: string }) {
  const { setInput } = useAIBot()

  return (
    <button
      type="button"
      onClick={() => setInput(text)}
      className="px-2.5 py-1 text-xs rounded-full bg-muted hover:bg-accent transition-colors"
    >
      {text}
    </button>
  )
}
