'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard'
import { KeyboardHint } from '@/components/platform/shared/keyboard-hint'
import { FullPageLoader } from '@/components/ui/loading-spinner'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRequireAuth()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useKeyboardShortcuts([
    {
      key: 'k',
      meta: true,
      handler: () => setCommandPaletteOpen((prev) => !prev),
      description: 'Toggle command palette',
    },
    {
      key: 'Escape',
      handler: () => setCommandPaletteOpen(false),
      allowInInput: true,
      description: 'Close command palette',
    },
  ])

  if (isLoading) return <FullPageLoader />

  return (
    <div className="platform-theme flex min-h-screen bg-[var(--platform-bg)]">
      {/* Sidebar placeholder */}
      <aside className="hidden w-56 shrink-0 border-r border-[var(--platform-border)] bg-[var(--platform-surface)] lg:block">
        <div className="flex h-14 items-center px-4">
          <span className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
            Agent Platform
          </span>
        </div>
        <nav className="mt-2 space-y-1 px-2">
          <div className="rounded-md px-3 py-2 text-xs text-[var(--platform-text-muted)]">
            Navigation coming in Phase 1
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-6">
          <span className="text-sm text-[var(--platform-text-secondary)]">Command Center</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-secondary)]"
            >
              Search or run command...
              <KeyboardHint keys="⌘K" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Command Palette overlay */}
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              type="text"
              placeholder="Type a command or search..."
              className="w-full rounded-xl bg-transparent px-4 py-3 text-sm text-[var(--platform-text-primary)] outline-none placeholder:text-[var(--platform-text-muted)]"
            />
            <div className="border-t border-[var(--platform-border)] px-4 py-3">
              <p className="text-xs text-[var(--platform-text-muted)]">
                Commands will be available in Phase 1. Press Esc to close.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
