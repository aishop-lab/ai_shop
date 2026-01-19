'use client'

import { Suspense } from 'react'
import { WelcomeModal } from './welcome-modal'

interface StoreClientWrapperProps {
  children: React.ReactNode
  storeName: string
}

export function StoreClientWrapper({ children, storeName }: StoreClientWrapperProps) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <WelcomeModal storeName={storeName} />
      </Suspense>
    </>
  )
}
