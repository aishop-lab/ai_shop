'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown, ExternalLink, LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon?: LucideIcon
  external?: boolean
}

interface NavSectionProps {
  label: string
  icon: LucideIcon
  href?: string // Direct link (non-collapsible)
  items?: NavItem[] // Collapsible children
  defaultExpanded?: boolean
  storageKey?: string // For persisting expand state
  onNavigate?: () => void
}

export function NavSection({
  label,
  icon: Icon,
  href,
  items,
  defaultExpanded = false,
  storageKey,
  onNavigate
}: NavSectionProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Check if any child is active
  const isChildActive = items?.some(
    item => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )

  // Check if this section itself is active
  const isSectionActive = href
    ? pathname === href || pathname.startsWith(`${href}/`)
    : isChildActive

  // Load expand state from localStorage
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`nav-expanded-${storageKey}`)
      if (saved !== null) {
        setIsExpanded(saved === 'true')
      }
    }
    // Auto-expand if a child is active
    if (isChildActive) {
      setIsExpanded(true)
    }
  }, [storageKey, isChildActive])

  // Save expand state to localStorage
  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    if (storageKey) {
      localStorage.setItem(`nav-expanded-${storageKey}`, String(newState))
    }
  }

  // Non-collapsible section (direct link)
  if (!items && href) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isSectionActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    )
  }

  // Collapsible section
  return (
    <div>
      <button
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isSectionActive && !isExpanded
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isExpanded ? 'rotate-180' : ''
          )}
        />
      </button>

      {/* Collapsible children */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="ml-4 pl-4 border-l border-border mt-1 space-y-1">
          {items?.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const ItemIcon = item.icon

            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onNavigate}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {ItemIcon && <ItemIcon className="h-4 w-4" />}
                  {item.label}
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {ItemIcon && <ItemIcon className="h-4 w-4" />}
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
