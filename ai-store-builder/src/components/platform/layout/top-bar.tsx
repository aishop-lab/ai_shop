'use client'

import { Menu, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KeyboardHint } from '@/components/platform/shared/keyboard-hint'
import { UserMenu } from './user-menu'

interface TopBarProps {
  onMenuClick: () => void
  onSearchClick: () => void
  pendingApprovals?: number
}

export function TopBar({ onMenuClick, onSearchClick, pendingApprovals = 0 }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search trigger */}
      <button
        onClick={onSearchClick}
        className={cn(
          'hidden items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors sm:flex',
          'border-[var(--platform-border)] bg-[var(--platform-bg)] text-[var(--platform-text-muted)]',
          'hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-secondary)]'
        )}
      >
        Search or run command...
        <KeyboardHint keys="⌘K" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative rounded-md p-1.5 text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)]">
          <Bell className="h-4 w-4" />
          {pendingApprovals > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
              {pendingApprovals > 9 ? '9+' : pendingApprovals}
            </span>
          )}
        </button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
