// src/app/(platform)/layout.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard'
import { FullPageLoader } from '@/components/ui/loading-spinner'
import { PlatformSidebar } from '@/components/platform/layout/sidebar'
import { TopBar } from '@/components/platform/layout/top-bar'
import { MobileNav } from '@/components/platform/layout/mobile-nav'
import { MOCK_AGENT_STATES, MOCK_APPROVALS, getPendingApprovalCount } from '@/lib/agents/mock-data'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const pendingApprovals = useMemo(() => getPendingApprovalCount(), [])
  const agentNavInfo = useMemo(
    () =>
      MOCK_AGENT_STATES.map((s) => ({
        type: s.agent_type,
        status: s.status,
        enabled: s.is_enabled,
      })),
    []
  )

  useKeyboardShortcuts([
    {
      key: 'k',
      meta: true,
      handler: () => setCommandPaletteOpen((prev) => !prev),
      description: 'Toggle command palette',
    },
    {
      key: 'Escape',
      handler: () => {
        setCommandPaletteOpen(false)
        setSidebarOpen(false)
      },
      allowInInput: true,
      description: 'Close overlays',
    },
  ])

  if (isLoading) return <FullPageLoader />

  return (
    <div className="platform-theme flex min-h-screen bg-[var(--platform-bg)]">
      <PlatformSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        agents={agentNavInfo}
        pendingApprovals={pendingApprovals}
      />

      <div className="flex flex-1 flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
          pendingApprovals={pendingApprovals}
        />

        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav pendingApprovals={pendingApprovals} />

      {/* Command Palette */}
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
              className="w-full rounded-t-xl bg-transparent px-4 py-3 text-sm text-[var(--platform-text-primary)] outline-none placeholder:text-[var(--platform-text-muted)]"
            />
            <div className="border-t border-[var(--platform-border)] px-4 py-3">
              <p className="text-xs text-[var(--platform-text-muted)]">
                Navigation commands coming soon. Press Esc to close.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
