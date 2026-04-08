// src/app/(platform)/layout.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard'
import { useAgentStates } from '@/lib/hooks/use-agents'
import { useApprovals } from '@/lib/hooks/use-approvals'
import { FullPageLoader } from '@/components/ui/loading-spinner'
import { PlatformSidebar } from '@/components/platform/layout/sidebar'
import { TopBar } from '@/components/platform/layout/top-bar'
import { MobileNav } from '@/components/platform/layout/mobile-nav'
import { CommandPalette } from '@/components/platform/layout/command-palette'
import { AgentIntroOverlay } from '@/components/platform/onboarding/agent-intro-overlay'
import { KeyboardShortcutsDialog } from '@/components/platform/layout/keyboard-shortcuts-dialog'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading } = useRequireAuth()
  const pathname = usePathname()
  const isOnboarding = pathname === '/onboarding'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [showAgentIntro, setShowAgentIntro] = useState(false)

  // Fetch the merchant's store ID and ensure agents are initialized
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          // API returns { store: { id, ... }, ... } — not a top-level storeId field
          const resolvedStoreId = data.store?.id
          if (resolvedStoreId) {
            setStoreId(resolvedStoreId)
            if (data.store?.slug) setStoreSlug(data.store.slug)
            // Lazily initialize agent_states if they don't exist yet
            fetch('/api/agents/initialize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ store_id: resolvedStoreId }),
            }).catch((err) => {
              console.error('[Platform] Agent initialization failed:', err)
            })

            // Check if user has completed the agent intro
            const introKey = `agent-intro-${resolvedStoreId}`
            if (!localStorage.getItem(introKey)) {
              setShowAgentIntro(true)
            }
          }
        }
      } catch {
        console.error('[Platform] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  const handleIntroComplete = useCallback(() => {
    if (storeId) {
      localStorage.setItem(`agent-intro-${storeId}`, 'completed')
    }
    setShowAgentIntro(false)
  }, [storeId])

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
      key: '?',
      shift: true,
      handler: () => setShortcutsOpen((prev) => !prev),
      description: 'Toggle keyboard shortcuts',
    },
    {
      key: 'Escape',
      handler: () => {
        setCommandPaletteOpen(false)
        setSidebarOpen(false)
        setShortcutsOpen(false)
      },
      allowInInput: true,
      description: 'Close overlays',
    },
  ])

  if (authLoading) return <FullPageLoader />

  // Onboarding gets a clean full-screen experience without the sidebar/top-bar chrome
  if (isOnboarding) {
    return (
      <div className="dark platform-theme min-h-screen bg-[var(--platform-bg)]">
        {children}
      </div>
    )
  }

  return (
    <div className="dark platform-theme flex min-h-screen overflow-x-hidden bg-[var(--platform-bg)]">
      <PlatformSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        agents={agentNavInfo}
        pendingApprovals={pendingCount}
        storeSlug={storeSlug}
      />

      <div className="flex flex-1 flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
          pendingApprovals={pendingCount}
          storeId={storeId}
        />

        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">{children}</main>
      </div>

      <MobileNav pendingApprovals={pendingCount} />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        storeSlug={storeSlug}
      />

      <KeyboardShortcutsDialog
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {showAgentIntro && storeId && (
        <AgentIntroOverlay storeId={storeId} onComplete={handleIntroComplete} />
      )}
    </div>
  )
}
