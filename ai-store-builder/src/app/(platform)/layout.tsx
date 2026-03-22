// src/app/(platform)/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard'
import { useAgentStates } from '@/lib/hooks/use-agents'
import { useApprovals } from '@/lib/hooks/use-approvals'
import { FullPageLoader } from '@/components/ui/loading-spinner'
import { PlatformSidebar } from '@/components/platform/layout/sidebar'
import { TopBar } from '@/components/platform/layout/top-bar'
import { MobileNav } from '@/components/platform/layout/mobile-nav'
import { CommandPalette } from '@/components/platform/layout/command-palette'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading } = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)

  // Fetch the merchant's store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.storeId) setStoreId(data.storeId)
        }
      } catch {
        console.error('[Platform] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Real-time agent states and approvals
  const { agents } = useAgentStates(storeId)
  const { pendingCount } = useApprovals(storeId)

  const agentNavInfo = agents.map((s) => ({
    type: s.agent_type,
    status: s.status,
    enabled: s.is_enabled,
  }))

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

  if (authLoading) return <FullPageLoader />

  return (
    <div className="dark platform-theme flex min-h-screen bg-[var(--platform-bg)]">
      <PlatformSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        agents={agentNavInfo}
        pendingApprovals={pendingCount}
      />

      <div className="flex flex-1 flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
          pendingApprovals={pendingCount}
        />

        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">{children}</main>
      </div>

      <MobileNav pendingApprovals={pendingCount} />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
