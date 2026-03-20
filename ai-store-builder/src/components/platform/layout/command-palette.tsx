'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutDashboard,
  CheckSquare,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Megaphone,
  TrendingUp,
  Headphones,
  Settings2,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENT_TYPES, AGENT_DISPLAY_NAMES, AGENT_COLORS } from '@/lib/agents/constants'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  href: string
  external?: boolean
  section: 'navigation' | 'agents' | 'actions'
  agentType?: string
  keywords?: string[]
}

const AGENT_ICON_MAP: Record<string, React.ReactNode> = {
  marketing: <Megaphone className="h-4 w-4" />,
  sales: <TrendingUp className="h-4 w-4" />,
  support: <Headphones className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
  technical: <Settings2 className="h-4 w-4" />,
}

const NAV_ITEMS: CommandItem[] = [
  {
    id: 'nav-command-center',
    label: 'Command Center',
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: '/platform',
    section: 'navigation',
    keywords: ['home', 'dashboard', 'overview'],
  },
  {
    id: 'nav-approvals',
    label: 'Approvals',
    icon: <CheckSquare className="h-4 w-4" />,
    href: '/platform/approvals',
    section: 'navigation',
    keywords: ['approve', 'pending', 'review'],
  },
  {
    id: 'nav-products',
    label: 'Products',
    icon: <Package className="h-4 w-4" />,
    href: '/platform/products',
    section: 'navigation',
    keywords: ['inventory', 'catalog', 'items'],
  },
  {
    id: 'nav-orders',
    label: 'Orders',
    icon: <ShoppingCart className="h-4 w-4" />,
    href: '/platform/orders',
    section: 'navigation',
    keywords: ['sales', 'purchases', 'transactions'],
  },
  {
    id: 'nav-analytics',
    label: 'Analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    href: '/platform/analytics',
    section: 'navigation',
    keywords: ['reports', 'metrics', 'stats', 'insights'],
  },
  {
    id: 'nav-settings',
    label: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    href: '/platform/settings',
    section: 'navigation',
    keywords: ['config', 'preferences', 'account'],
  },
]

const AGENT_ITEMS: CommandItem[] = AGENT_TYPES.map((type) => ({
  id: `agent-${type}`,
  label: AGENT_DISPLAY_NAMES[type],
  icon: AGENT_ICON_MAP[type],
  href: `/platform/agents/${type}`,
  section: 'agents' as const,
  agentType: type,
  keywords: [type, 'agent'],
}))

const ACTION_ITEMS: CommandItem[] = [
  {
    id: 'action-create-product',
    label: 'Create Product',
    description: 'Add a new product to your store',
    icon: <Plus className="h-4 w-4" />,
    href: '/platform/products/new',
    section: 'actions',
    keywords: ['add', 'new', 'product', 'create'],
  },
  {
    id: 'action-view-store',
    label: 'View Store',
    description: 'Open your storefront in a new tab',
    icon: <ExternalLink className="h-4 w-4" />,
    href: '/',
    external: true,
    section: 'actions',
    keywords: ['store', 'storefront', 'shop', 'preview'],
  },
]

const ALL_ITEMS = [...NAV_ITEMS, ...AGENT_ITEMS, ...ACTION_ITEMS]

const SECTION_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  agents: 'Agents',
  actions: 'Actions',
}

const SECTION_ORDER: Array<'navigation' | 'agents' | 'actions'> = ['navigation', 'agents', 'actions']

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when palette opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      // Focus input after animation frame so the DOM is ready
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  const filteredItems = useMemo((): CommandItem[] => {
    const trimmed = query.trim()

    // @agent routing: if query starts with "@", filter only agents
    if (trimmed.startsWith('@')) {
      const agentQuery = trimmed.slice(1).toLowerCase()
      if (!agentQuery) return AGENT_ITEMS
      return AGENT_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(agentQuery) ||
          item.agentType?.toLowerCase().includes(agentQuery) ||
          item.keywords?.some((k) => k.includes(agentQuery))
      )
    }

    if (!trimmed) return ALL_ITEMS

    const q = trimmed.toLowerCase()
    return ALL_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.includes(q))
    )
  }, [query])

  // Group filtered items by section, preserving section order
  const sections = SECTION_ORDER.reduce<Record<string, CommandItem[]>>((acc, section) => {
    const items = filteredItems.filter((item) => item.section === section)
    if (items.length > 0) acc[section] = items
    return acc
  }, {})

  // Flat ordered list for keyboard nav index tracking
  const flatItems = SECTION_ORDER.flatMap((section) => sections[section] ?? [])

  const navigateTo = useCallback(
    (item: CommandItem) => {
      onClose()
      if (item.external) {
        window.open(item.href, '_blank', 'noopener,noreferrer')
      } else {
        router.push(item.href)
      }
    },
    [router, onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + Math.max(flatItems.length, 1)) % Math.max(flatItems.length, 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatItems[selectedIndex]
        if (item) navigateTo(item)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [flatItems, selectedIndex, navigateTo, onClose]
  )

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop — clickable to dismiss */}
      <div
        className="absolute inset-0 bg-black/60"
        role="button"
        aria-label="Close command palette"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />

      {/* Palette card */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--platform-border)]">
          <Search className="h-4 w-4 flex-shrink-0 text-[var(--platform-text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search... (@agent to filter agents)"
            className="flex-1 bg-transparent text-sm text-[var(--platform-text-primary)] outline-none placeholder:text-[var(--platform-text-muted)]"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-[var(--platform-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--platform-text-muted)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--platform-text-muted)]">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            SECTION_ORDER.map((section) => {
              const items = sections[section]
              if (!items || items.length === 0) return null

              return (
                <div key={section} className="mb-1">
                  {/* Section header */}
                  <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--platform-text-muted)]">
                    {SECTION_LABELS[section]}
                  </p>

                  {items.map((item) => {
                    const flatIndex = flatItems.indexOf(item)
                    const isSelected = flatIndex === selectedIndex
                    const agentColors = item.agentType ? AGENT_COLORS[item.agentType as keyof typeof AGENT_COLORS] : null

                    return (
                      <button
                        key={item.id}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                          isSelected
                            ? 'bg-[var(--platform-surface-active)]'
                            : 'hover:bg-[var(--platform-surface-hover)]'
                        )}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        onClick={() => navigateTo(item)}
                      >
                        {/* Icon */}
                        <span
                          className={cn(
                            'flex-shrink-0',
                            agentColors ? agentColors.text : 'text-[var(--platform-text-muted)]'
                          )}
                        >
                          {item.icon}
                        </span>

                        {/* Label + description */}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-sm text-[var(--platform-text-primary)] leading-tight">
                            {item.label}
                          </span>
                          {item.description && (
                            <span className="truncate text-xs text-[var(--platform-text-muted)]">
                              {item.description}
                            </span>
                          )}
                        </div>

                        {/* External link indicator or keyboard hint */}
                        {item.external ? (
                          <ExternalLink className="h-3 w-3 flex-shrink-0 text-[var(--platform-text-muted)]" />
                        ) : (
                          isSelected && (
                            <kbd className="hidden sm:inline-flex items-center rounded border border-[var(--platform-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--platform-text-muted)]">
                              ↵
                            </kbd>
                          )
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-[var(--platform-border)] px-4 py-2 flex items-center gap-4">
          <span className="text-[10px] text-[var(--platform-text-muted)]">
            <kbd className="mr-1 rounded border border-[var(--platform-border)] px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
            navigate
          </span>
          <span className="text-[10px] text-[var(--platform-text-muted)]">
            <kbd className="mr-1 rounded border border-[var(--platform-border)] px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            select
          </span>
          <span className="text-[10px] text-[var(--platform-text-muted)]">
            <kbd className="mr-1 rounded border border-[var(--platform-border)] px-1 py-0.5 font-mono text-[10px]">@</kbd>
            filter agents
          </span>
        </div>
      </div>
    </div>
  )
}
