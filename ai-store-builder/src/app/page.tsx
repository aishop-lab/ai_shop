'use client'

import { Button } from '@/components/ui/button'
import { Store, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center">
          {/* Logo & Brand */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Store className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold tracking-tight">AI Store</h1>
          </div>

          {/* Tagline */}
          <p className="text-xl text-muted-foreground max-w-md mx-auto mb-12">
            Build your online store in minutes with AI-powered setup
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 text-lg px-8 py-6">
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>Create your AI-powered e-commerce store today</p>
      </footer>
    </div>
  )
}
