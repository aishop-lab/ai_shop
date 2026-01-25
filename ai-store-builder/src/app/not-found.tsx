'use client'

import Link from 'next/link'
import { Store, Search, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="text-center max-w-md">
        {/* 404 Visual */}
        <div className="relative mb-8">
          <div className="text-[150px] font-bold text-slate-100 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Search className="h-10 w-10 text-primary" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Page Not Found
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <Button size="lg" className="gap-2 w-full sm:w-auto">
              <Home className="h-5 w-5" />
              Go Home
            </Button>
          </Link>
          <Button
            onClick={() => typeof window !== 'undefined' && window.history.back()}
            variant="outline"
            size="lg"
            className="gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="h-5 w-5" />
            Go Back
          </Button>
        </div>

        {/* StoreForge Branding */}
        <div className="mt-12 pt-8 border-t">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
            <Store className="h-5 w-5" />
            <span className="font-medium">StoreForge</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
