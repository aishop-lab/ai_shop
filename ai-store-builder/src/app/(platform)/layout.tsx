// src/app/(platform)/layout.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard'
import { FullPageLoader } from '@/components/ui/loading-spinner'
import { PlatformSidebar } from '@/components/platform/layout/sidebar'
import { TopBar } from '@/components/platform/layout/top-bar'
import { MobileNav } from '@/components/platform/layout/mobile-nav'
import { CommandPalette } from '@/components/platform/layout/command-palette'
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

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
