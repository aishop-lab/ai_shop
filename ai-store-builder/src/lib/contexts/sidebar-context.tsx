'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const STORAGE_KEY = 'storefront-sidebar-open'

interface SidebarProviderProps {
  children: ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const pathname = usePathname()

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      // On mobile, always start closed
      const isMobile = window.innerWidth < 768
      if (!isMobile) {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === 'true') {
          setIsOpen(true)
        }
      }
    } catch {
      // localStorage not available
    }
    setIsHydrated(true)
  }, [])

  // Save state to localStorage when it changes (desktop only)
  useEffect(() => {
    if (!isHydrated) return
    try {
      const isMobile = window.innerWidth < 768
      if (!isMobile) {
        localStorage.setItem(STORAGE_KEY, String(isOpen))
      }
    } catch {
      // localStorage not available
    }
  }, [isOpen, isHydrated])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    if (isMobile && isOpen) {
      setIsOpen(false)
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
