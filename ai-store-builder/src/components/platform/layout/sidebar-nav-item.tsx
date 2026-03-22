'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface SidebarNavItemProps {
  href: string
  icon: LucideIcon
  label: string
  badge?: React.ReactNode
  badgeVariant?: 'default' | 'warning' | 'accent'
  disabled?: boolean
}

const badgeStyles = {
  default: 'bg-[var(--platform-surface-active)] text-[var(--platform-text-secondary)]',
  warning: 'bg-amber-500/15 text-amber-400',
  accent: 'bg-[var(--platform-accent)]/15 text-[var(--platform-accent)]',
} as const

export function SidebarNavItem({ href, icon: Icon, label, badge, badgeVariant = 'default', disabled }: SidebarNavItemProps) {
  const pathname = usePathname()
  // Exact match for root-level pages, prefix match for nested pages
  const isActive = href === '/platform'
    ? pathname === '/platform'
    : pathname === href || pathname.startsWith(href + '/')

  if (disabled) {
    return (
      <div className="flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-xs text-[var(--platform-text-muted)] opacity-50 cursor-not-allowed">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-xs transition-colors',
        isActive
          ? 'bg-[var(--platform-surface-active)] text-[var(--platform-text-primary)] border-l-2 border-l-[var(--platform-accent)]'
          : 'text-[var(--platform-text-secondary)] hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-primary)] border-l-2 border-l-transparent'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--platform-accent)]' : '')} />
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && (
        typeof badge === 'string' || typeof badge === 'number' ? (
          <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-mono font-medium', badgeStyles[badgeVariant])}>
            {badge}
          </span>
        ) : (
          <span className="ml-auto">{badge}</span>
        )
      )}
    </Link>
  )
}
