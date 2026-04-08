'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface PlatformStoreState {
  storeId: string | null
  storeSlug: string | null
  storeName: string | null
  currency: string
  isLoading: boolean
}

const PlatformStoreContext = createContext<PlatformStoreState>({
  storeId: null,
  storeSlug: null,
  storeName: null,
  currency: 'INR',
  isLoading: true,
})

export function PlatformStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlatformStoreState>({
    storeId: null,
    storeSlug: null,
    storeName: null,
    currency: 'INR',
    isLoading: true,
  })

  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store) {
            setState({
              storeId: data.store.id,
              storeSlug: data.store.slug ?? null,
              storeName: data.store.name ?? null,
              currency: data.store.blueprint?.location?.currency ?? 'INR',
              isLoading: false,
            })
            return
          }
        }
      } catch {
        console.error('[PlatformStore] Failed to fetch store')
      }
      setState((prev) => ({ ...prev, isLoading: false }))
    }

    fetchStore()
  }, [])

  return (
    <PlatformStoreContext.Provider value={state}>
      {children}
    </PlatformStoreContext.Provider>
  )
}

/**
 * Hook to access the merchant's store info from any platform page.
 * Avoids redundant /api/dashboard/stats fetches.
 */
export function usePlatformStore() {
  return useContext(PlatformStoreContext)
}
