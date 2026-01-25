'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Something went wrong
        </h1>
        <p className="text-lg text-slate-600 mb-2">
          We encountered an error while loading this page.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Don't worry - your data is safe. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={reset}
            size="lg"
            className="gap-2 w-full sm:w-auto"
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
            size="lg"
            className="gap-2 w-full sm:w-auto"
          >
            <LayoutDashboard className="h-5 w-5" />
            Go to Dashboard
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-slate-50 rounded-lg text-left">
          <p className="text-sm font-medium text-slate-700 mb-2">
            If this keeps happening:
          </p>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>- Try refreshing the page</li>
            <li>- Clear your browser cache</li>
            <li>- Contact support if the issue persists</li>
          </ul>
        </div>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
              Error details (development only)
            </summary>
            <div className="mt-2 p-4 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-1">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-40">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        {/* Error ID for support */}
        {error.digest && (
          <p className="mt-4 text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
