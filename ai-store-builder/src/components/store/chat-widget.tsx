'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'

interface Message {
  id: string
  role: 'customer' | 'agent'
  content: string
  timestamp: string // ISO string for serialization
}

interface ChatWidgetProps {
  storeId: string
  storeName?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreateSessionId(storeId: string): string {
  const key = `support-session-${storeId}`
  if (typeof window === 'undefined') return crypto.randomUUID()
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const newId = crypto.randomUUID()
  localStorage.setItem(key, newId)
  return newId
}

function loadMessages(storeId: string): Message[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`support-messages-${storeId}`)
    if (!raw) return []
    return JSON.parse(raw) as Message[]
  } catch {
    return []
  }
}

function saveMessages(storeId: string, messages: Message[]): void {
  if (typeof window === 'undefined') return
  try {
    // Keep at most 100 messages in localStorage to avoid bloat
    const toSave = messages.slice(-100)
    localStorage.setItem(`support-messages-${storeId}`, JSON.stringify(toSave))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function loadConversationId(storeId: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  return localStorage.getItem(`support-convo-${storeId}`) ?? undefined
}

function saveConversationId(storeId: string, convoId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`support-convo-${storeId}`, convoId)
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Typing dots animation via CSS keyframes injected once
// ---------------------------------------------------------------------------

const DOTS_STYLE_ID = 'chat-typing-dots'

function ensureDotsStyle(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(DOTS_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = DOTS_STYLE_ID
  style.textContent = `
    @keyframes chatTypingBounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }
    .chat-dot { animation: chatTypingBounce 1.4s infinite ease-in-out; }
    .chat-dot:nth-child(1) { animation-delay: 0s; }
    .chat-dot:nth-child(2) { animation-delay: 0.2s; }
    .chat-dot:nth-child(3) { animation-delay: 0.4s; }
  `
  document.head.appendChild(style)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatWidget({ storeId, storeName }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [sessionId, setSessionId] = useState<string>('')
  const [supportAvailable, setSupportAvailable] = useState<boolean | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize from localStorage
  useEffect(() => {
    setSessionId(getOrCreateSessionId(storeId))
    setMessages(loadMessages(storeId))
    setConversationId(loadConversationId(storeId))
    ensureDotsStyle()
  }, [storeId])

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(storeId, messages)
    }
  }, [messages, storeId])

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
      setUnreadCount(0)
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading || !sessionId) return

    const customerMessage: Message = {
      id: crypto.randomUUID(),
      role: 'customer',
      content: trimmed,
      timestamp: new Date().toISOString(),
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

      if (data.conversationId) {
        setConversationId(data.conversationId)
        saveConversationId(storeId, data.conversationId)
      }

      const agentMessage: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: data.response,
        timestamp: data.timestamp ?? new Date().toISOString(),
      }

      setMessages(prev => [...prev, agentMessage])

      // If chat is minimized, increment unread
      if (!isOpen) {
        setUnreadCount(prev => prev + 1)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'unknown'
      const friendlyContent = errMsg === 'support_not_enabled'
        ? 'Support chat is not currently available. Please try again later or contact us via email.'
        : "Sorry, I couldn't process your message. Please try again."
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: friendlyContent,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, sessionId, storeId, conversationId, isOpen])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

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
          'bg-[var(--color-primary,#6366f1)]',
          'shadow-lg shadow-[var(--color-primary,#6366f1)]/30',
          'flex items-center justify-center',
          'transition-all duration-300 hover:scale-110',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:ring-offset-2',
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100',
        ].join(' ')}
      >
        <MessageCircle className="h-6 w-6 text-white" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Pulse ring to draw attention — only when no messages yet */}
        {messages.length === 0 && (
          <span className="absolute inset-0 rounded-full bg-[var(--color-primary,#6366f1)] opacity-30 animate-ping" />
        )}
      </button>

      {/* Chat panel */}
      <div
        role="dialog"
        aria-label="Support chat"
        aria-modal="true"
        className={[
          'fixed z-50',
          // Desktop: bottom-right corner, fixed size
          'bottom-0 right-0 sm:bottom-6 sm:right-6',
          'w-full sm:w-[400px]',
          'h-[100dvh] sm:h-auto sm:max-h-[500px]',
          'flex flex-col',
          'bg-white sm:rounded-2xl',
          'shadow-2xl shadow-black/10',
          'border-0 sm:border sm:border-gray-200',
          'transition-all duration-300 origin-bottom-right',
          isOpen
            ? 'scale-100 opacity-100'
            : 'scale-75 opacity-0 pointer-events-none',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-primary,#6366f1)] sm:rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                {storeName ? `${storeName} Support` : 'Support'}
              </p>
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
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary,#6366f1)]/10 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-[var(--color-primary,#6366f1)]" />
              </div>
              <p className="text-gray-500 text-sm font-medium">How can we help you?</p>
              <p className="text-gray-400 text-xs mt-1">Ask us anything &mdash; we&apos;re here to help.</p>
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
                  'px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                  msg.role === 'customer'
                    ? 'bg-[var(--color-primary,#6366f1)] text-white rounded-br-sm'
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

          {/* Typing indicator — animated dots */}
          {isLoading && (
            <div className="flex items-start">
              <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1">
                <span className="chat-dot w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                <span className="chat-dot w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                <span className="chat-dot w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            maxLength={2000}
            className={[
              'flex-1 px-3 py-2 text-sm',
              'bg-gray-50 rounded-xl',
              'border border-gray-200',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)]/30 focus:border-[var(--color-primary,#6366f1)]',
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
              'bg-[var(--color-primary,#6366f1)] hover:opacity-90',
              'transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)]/30 focus:ring-offset-1',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Send className="h-4 w-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </>
  )
}
