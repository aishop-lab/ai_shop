'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OnboardingChat } from '@/components/onboarding/chat'
import { ProgressSidebar } from '@/components/onboarding/progress-sidebar'
import { OnboardingProgressBar } from '@/components/onboarding/progress-bar'
import { Store, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  // Check if user already has a store - prevent re-onboarding
  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const response = await fetch('/api/auth/user')
        const data = await response.json()

        if (data.store) {
          // User already has a store, redirect to dashboard
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
      } finally {
        setIsCheckingStatus(false)
      }
    }

    checkOnboardingStatus()
  }, [router])

  const handleComplete = (slug: string) => {
    // Redirect to dashboard with welcome flag
    router.push(`/dashboard?welcome=true`)
  }

  const handleStepChange = (step: number) => {
    setCurrentStep(step)
  }

  // Show loading state while checking if user already has a store
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Store className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">AI Store</span>
          </Link>
        </div>
      </header>

      {/* Progress bar for mobile - sticky at top */}
      <div className="lg:hidden sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b px-4 py-3">
        <OnboardingProgressBar currentStep={currentStep} />
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Let's Set Up Your Store</h1>
          <p className="mt-2 text-muted-foreground">
            Answer a few questions and we'll create your store with AI-powered suggestions
          </p>
        </div>

        <div className="flex gap-8 justify-center">
          {/* Progress sidebar - hidden on mobile */}
          <ProgressSidebar
            currentStep={currentStep}
            className="hidden lg:block flex-shrink-0"
          />

          {/* Chat area */}
          <div className="w-full max-w-2xl">
            <OnboardingChat
              onComplete={handleComplete}
              onStepChange={handleStepChange}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
