'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console
    console.error('Store error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Oops! Something went wrong
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          We're having trouble loading this page. This might be a temporary issue.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={reset}
            size="lg"
            className="gap-2 w-full sm:w-auto"
            style={{ backgroundColor: 'var(--store-primary, #2563eb)' }}
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = window.location.pathname}
            variant="outline"
            size="lg"
            className="gap-2 w-full sm:w-auto"
          >
            <Home className="h-5 w-5" />
            Refresh Page
          </Button>
        </div>

        {/* Continue Shopping */}
        <div className="mt-8 pt-8 border-t">
          <p className="text-sm text-slate-500 mb-4">
            Or continue browsing the store
          </p>
          <Button
            onClick={() => {
              // Navigate to store homepage (remove any sub-paths)
              const pathParts = window.location.pathname.split('/')
              if (pathParts.length > 2) {
                window.location.href = `/${pathParts[1]}`
              }
            }}
            variant="ghost"
            className="gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            Continue Shopping
          </Button>
        </div>

        {/* Error ID for support */}
        {error.digest && (
          <p className="mt-6 text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
