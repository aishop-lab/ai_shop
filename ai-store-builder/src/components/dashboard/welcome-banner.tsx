'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, ExternalLink, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WelcomeBannerProps {
  storeName: string
  storeSlug: string
  isFirstVisit?: boolean
}

const WELCOME_DISMISSED_KEY = 'ai-store-welcome-dismissed'

export function WelcomeBanner({ storeName, storeSlug, isFirstVisit }: WelcomeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true) // Start hidden to prevent flash
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Check localStorage on mount
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY)
    if (!dismissed && isFirstVisit) {
      setIsDismissed(false)
    }
  }, [isFirstVisit])

  const handleDismiss = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsDismissed(true)
      localStorage.setItem(WELCOME_DISMISSED_KEY, 'true')
    }, 300)
  }

  if (isDismissed) return null

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 sm:p-6 transition-all duration-300 ${
        isAnimating ? 'opacity-0 translate-y-[-10px]' : 'opacity-100'
      }`}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-primary/5 rounded-full blur-2xl translate-y-1/2" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">
              Congratulations! Your store is live
            </h3>
          </div>
          <p className="text-muted-foreground text-sm">
            <span className="font-medium text-foreground">{storeName}</span> is now ready for customers.
            Here&apos;s what to do next to start selling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/${storeSlug}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              View Store
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/dashboard/products/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Product
            </Button>
          </Link>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Dismiss welcome message"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
