'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useMemo,
} from 'react'
import { useChat, type UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

// Action that requires confirmation
export interface PendingAction {
  id: string
  type: 'delete' | 'status_change' | 'refund' | 'bulk_delete'
  title: string
  description: string
  toolName: string
  toolArgs: Record<string, unknown>
}

// Page context for awareness
export interface PageContext {
  currentPage: string
  selectedItems?: string[]
  recentActions?: Array<{ action: string; timestamp: number; details?: string }>
  pageData?: Record<string, unknown>
}

// Recent action for context
export interface RecentAction {
  action: string
  timestamp: number
  details?: string
}

// AI Bot context type
interface AIBotContextType {
  // Panel state
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggleOpen: () => void

  // Chat state
  messages: UIMessage[]
  input: string
  setInput: (input: string) => void
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  error: Error | undefined
  reload: () => void
  stop: () => void

  // Confirmation flow
  pendingConfirmation: PendingAction | null
  setPendingConfirmation: (action: PendingAction | null) => void
  confirmAction: () => Promise<void>
  cancelAction: () => void

  // Context awareness
  pageContext: PageContext
  setPageContext: (ctx: PageContext) => void
  updatePageContext: (updates: Partial<PageContext>) => void
  addRecentAction: (action: string, details?: string) => void

  // Store info
  storeId: string | null
  setStoreId: (id: string | null) => void
  storeName: string | null
  setStoreName: (name: string | null) => void

  // Ready state
  isStoreLoaded: boolean
}

const AIBotContext = createContext<AIBotContextType | undefined>(undefined)

interface AIBotProviderProps {
  children: ReactNode
}

export function AIBotProvider({ children }: AIBotProviderProps) {
  // Panel open state
  const [isOpen, setIsOpen] = useState(false)

  // Store info
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)
  const [isStoreLoaded, setIsStoreLoaded] = useState(false)

  // Chat ID to force useChat to reinitialize when storeId changes
  const [chatId, setChatId] = useState<string>('initial')

  // Page context
  const [pageContext, setPageContext] = useState<PageContext>({
    currentPage: '/dashboard',
    selectedItems: [],
    recentActions: [],
    pageData: {},
  })

  // Pending confirmation for destructive actions
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingAction | null>(null)

  // Local input state (since useChat doesn't provide it in v6)
  const [input, setInput] = useState('')

  // Update chatId when storeId changes to force useChat to reinitialize
  useEffect(() => {
    if (storeId) {
      setChatId(`chat-${storeId}`)
    }
  }, [storeId])

  // Create transport with current storeId
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/bot',
        body: {
          storeId,
          storeName,
          context: pageContext,
        },
      }),
    [storeId, storeName, pageContext]
  )

  // Use Vercel AI SDK useChat hook
  // id forces reinitialization when storeId changes
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
    setMessages,
  } = useChat({
    id: chatId,
    transport,
    onError: (err) => {
      console.error('[AI Bot] Chat error:', err)
    },
    onFinish: ({ message }) => {
      // Check if the message contains a tool call that needs confirmation
      const content = message.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') || ''

      if (content.includes('[CONFIRM_ACTION]')) {
        try {
          const match = content.match(/\[CONFIRM_ACTION\]([\s\S]*?)\[\/CONFIRM_ACTION\]/)
          if (match) {
            const actionData = JSON.parse(match[1])
            setPendingConfirmation(actionData)
          }
        } catch (e) {
          console.error('[AI Bot] Failed to parse confirmation action:', e)
        }
      }
    },
  })

  // Derived loading state
  const isLoading = status === 'submitted' || status === 'streaming'

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    []
  )

  // Handle form submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      // Check if store is loaded
      if (!storeId) {
        console.error('[AI Bot] Cannot send message: Store not loaded')
        return
      }

      const messageText = input.trim()
      setInput('')

      await sendMessage({
        text: messageText,
      })
    },
    [input, isLoading, sendMessage, storeId]
  )

  // Toggle panel open/closed
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Update page context partially
  const updatePageContext = useCallback((updates: Partial<PageContext>) => {
    setPageContext((prev) => ({ ...prev, ...updates }))
  }, [])

  // Add a recent action to context
  const addRecentAction = useCallback((action: string, details?: string) => {
    setPageContext((prev) => {
      const newAction: RecentAction = {
        action,
        timestamp: Date.now(),
        details,
      }
      const recentActions = [newAction, ...(prev.recentActions || [])].slice(0, 5)
      return { ...prev, recentActions }
    })
  }, [])

  // Confirm a pending destructive action
  const confirmAction = useCallback(async () => {
    if (!pendingConfirmation) return

    try {
      // Send a message to continue with the action
      await sendMessage({
        text: `[CONFIRMED] Execute the action: ${pendingConfirmation.toolName}`,
      })
      setPendingConfirmation(null)
    } catch (err) {
      console.error('[AI Bot] Failed to confirm action:', err)
    }
  }, [pendingConfirmation, sendMessage])

  // Cancel a pending action
  const cancelAction = useCallback(() => {
    if (!pendingConfirmation) return

    // Send a cancel message
    sendMessage({
      text: `[CANCELLED] I cancelled the action: ${pendingConfirmation.toolName}`,
    })
    setPendingConfirmation(null)
  }, [pendingConfirmation, sendMessage])

  // Reload function
  const reload = useCallback(() => {
    regenerate()
  }, [regenerate])

  // Keyboard shortcut: Cmd/Ctrl + K to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleOpen()
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleOpen, isOpen])

  // Fetch store info on mount
  useEffect(() => {
    async function fetchStoreInfo() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store) {
            setStoreId(data.store.id)
            setStoreName(data.store.name)
          }
        }
      } catch (error) {
        console.error('[AI Bot] Failed to fetch store info:', error)
      } finally {
        setIsStoreLoaded(true)
      }
    }
    fetchStoreInfo()
  }, [])

  const value: AIBotContextType = {
    isOpen,
    setIsOpen,
    toggleOpen,
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    pendingConfirmation,
    setPendingConfirmation,
    confirmAction,
    cancelAction,
    pageContext,
    setPageContext,
    updatePageContext,
    addRecentAction,
    storeId,
    setStoreId,
    storeName,
    setStoreName,
    isStoreLoaded,
  }

  return <AIBotContext.Provider value={value}>{children}</AIBotContext.Provider>
}

export function useAIBot() {
  const context = useContext(AIBotContext)
  if (!context) {
    throw new Error('useAIBot must be used within an AIBotProvider')
  }
  return context
}

// Hook to update page context from dashboard pages
export function useAIBotPageContext(page: string, data?: Record<string, unknown>) {
  const { updatePageContext } = useAIBot()

  useEffect(() => {
    updatePageContext({
      currentPage: page,
      pageData: data,
    })
  }, [page, data, updatePageContext])
}
