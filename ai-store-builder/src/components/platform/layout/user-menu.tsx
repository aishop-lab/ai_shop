'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/contexts/auth-context'
import Link from 'next/link'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
          'bg-[var(--platform-surface-active)] text-[var(--platform-text-secondary)]',
          'hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-primary)]'
        )}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] py-1 shadow-xl">
          <div className="border-b border-[var(--platform-border)] px-3 py-2">
            <p className="truncate text-xs text-[var(--platform-text-primary)]">{user?.email}</p>
          </div>
          <Link
            href="/platform/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--platform-text-secondary)] hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-primary)]"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          <button
            onClick={() => { signOut(); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--platform-text-secondary)] hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-status-error)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
