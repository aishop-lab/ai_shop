'use client'

import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KeyboardHint } from '@/components/platform/shared/keyboard-hint'
import { UserMenu } from './user-menu'
import { NotificationDropdown } from './notification-dropdown'

interface TopBarProps {
  onMenuClick: () => void
  onSearchClick: () => void
  pendingApprovals?: number
  storeId?: string | null
}

export function TopBar({ onMenuClick, onSearchClick, pendingApprovals = 0, storeId }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 lg:px-6">
      {/* Mobile menu button — min 44px tap target */}
      <button
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-[var(--platform-text-muted)] hover:text-[var(--platform-text-primary)] lg:hidden"
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
        {/* Notifications */}
        <NotificationDropdown storeId={storeId ?? null} pendingApprovals={pendingApprovals} />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
