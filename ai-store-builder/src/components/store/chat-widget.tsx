'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'

interface Message {
  id: string
  role: 'customer' | 'agent'
  content: string
  timestamp: Date
}

interface ChatWidgetProps {
  storeId: string
}

function getOrCreateSessionId(storeId: string): string {
  const key = `support-session-${storeId}`
  if (typeof window === 'undefined') return crypto.randomUUID()
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const newId = crypto.randomUUID()
  localStorage.setItem(key, newId)
  return newId
}

export function ChatWidget({ storeId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [sessionId, setSessionId] = useState<string>('')
  const [supportAvailable, setSupportAvailable] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize session ID from localStorage on mount
  useEffect(() => {
    setSessionId(getOrCreateSessionId(storeId))
  }, [storeId])

  // Check if the support agent is enabled for this store
  useEffect(() => {
    let cancelled = false
    async function checkAvailability() {
      try {
        const res = await fetch(`/api/agents/support/chat?storeId=${encodeURIComponent(storeId)}`)
        if (cancelled) return
        const data = (await res.json()) as { available?: boolean }
        setSupportAvailable(data.available === true)
      } catch {
        if (!cancelled) setSupportAvailable(false)
      }
    }
    checkAvailability()
    return () => { cancelled = true }
  }, [storeId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading || !sessionId) return

    const customerMessage: Message = {
      id: crypto.randomUUID(),
      role: 'customer',
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, customerMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/agents/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          message: trimmed,
          sessionId,
          conversationId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error ?? `HTTP ${res.status}`)
      }

      const data = (await res.json()) as {
        conversationId: string
        response: string
        timestamp: string
      }

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
      }

      const agentMessage: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: data.response,
        timestamp: new Date(data.timestamp),
      }

      setMessages(prev => [...prev, agentMessage])
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'unknown'
      const friendlyContent = errMsg === 'support_not_enabled'
        ? 'Support chat is not currently available. Please try again later or contact us via email.'
        : "Sorry, I couldn't process your message. Please try again."
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: friendlyContent,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
      console.error('[ChatWidget] send error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, sessionId, storeId, conversationId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Don't render the widget if support is unavailable or still checking
  if (supportAvailable !== true) return null

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open support chat"
        className={[
          'fixed bottom-6 right-6 z-40',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-br from-blue-500 to-purple-600',
          'shadow-lg shadow-blue-500/30',
          'flex items-center justify-center',
          'transition-all duration-300 hover:scale-110',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100',
        ].join(' ')}
      >
        <MessageCircle className="h-6 w-6 text-white" />

        {/* Pulse ring to draw attention */}
        <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
      </button>

      {/* Chat panel */}
      <div
        role="dialog"
        aria-label="Support chat"
        aria-modal="true"
        className={[
          'fixed bottom-6 right-6 z-50',
          'w-[380px] max-h-[500px]',
          'flex flex-col',
          'bg-white rounded-2xl',
          'shadow-2xl shadow-black/10',
          'border border-gray-200',
          'transition-all duration-300 origin-bottom-right',
          isOpen
            ? 'scale-100 opacity-100'
            : 'scale-75 opacity-0 pointer-events-none',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Support</p>
              <p className="text-white/70 text-xs">We typically reply instantly</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close support chat"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">How can we help you?</p>
              <p className="text-gray-400 text-xs mt-1">Ask us anything — we&apos;re here to help.</p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={[
                'flex flex-col gap-1 max-w-[80%]',
                msg.role === 'customer' ? 'ml-auto items-end' : 'items-start',
              ].join(' ')}
            >
              <div
                className={[
                  'px-3 py-2 rounded-2xl text-sm leading-relaxed',
                  msg.role === 'customer'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm',
                ].join(' ')}
              >
                {msg.content}
              </div>
              <span className="text-gray-400 text-[10px] px-1">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />
                <span className="text-gray-400 text-xs">Typing…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={isLoading}
            maxLength={2000}
            className={[
              'flex-1 px-3 py-2 text-sm',
              'bg-gray-50 rounded-xl',
              'border border-gray-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300',
              'placeholder:text-gray-400',
              'disabled:opacity-50',
              'transition-colors',
            ].join(' ')}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
            className={[
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
              'bg-blue-500 hover:bg-blue-600',
              'transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </>
  )
}
