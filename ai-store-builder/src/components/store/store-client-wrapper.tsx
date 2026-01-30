'use client'

import { Suspense } from 'react'
import { CustomerProvider } from '@/lib/contexts/customer-context'
import { WelcomeModal } from './welcome-modal'
import { Toaster } from '@/components/ui/sonner'

interface StoreClientWrapperProps {
  children: React.ReactNode
  storeName: string
}

export function StoreClientWrapper({ children, storeName }: StoreClientWrapperProps) {
  return (
    <CustomerProvider>
      {children}
      <Toaster position="top-right" />
      <Suspense fallback={null}>
        <WelcomeModal storeName={storeName} />
      </Suspense>
    </CustomerProvider>
  )
}
