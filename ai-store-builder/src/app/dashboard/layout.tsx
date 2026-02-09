'use client'

import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/lib/hooks/use-require-auth'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Navbar } from '@/components/dashboard/navbar'
import { FullPageLoader } from '@/components/ui/loading-spinner'
import { AIBotProvider, AIBotPanel, AIBotTrigger } from '@/components/dashboard/ai-bot'

interface StoreInfo {
  id: string
  name: string
  slug: string
  status: string
  logo_url: string | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [store, setStore] = useState<StoreInfo | null>(null)

  // Fetch store info for sidebar
  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store) {
            setStore(data.store)
          }
        }
      } catch (error) {
        console.error('Failed to fetch store for sidebar:', error)
      }
    }
    fetchStore()
  }, [])

  if (isLoading) {
    return <FullPageLoader />
  }

  return (
    <AIBotProvider>
      <div className="flex min-h-screen">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          store={store}
        />

        <div className="flex-1 flex flex-col lg:ml-0">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>

        {/* AI Bot Components */}
        <AIBotTrigger />
        <AIBotPanel />
      </div>
    </AIBotProvider>
  )
}
