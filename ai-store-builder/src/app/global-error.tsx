'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              Something went wrong
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              We apologize for the inconvenience. Please try again.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
              >
                <RefreshCw className="h-5 w-5" />
                Try Again
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors w-full sm:w-auto"
              >
                <Home className="h-5 w-5" />
                Go Home
              </a>
            </div>

            {/* Error ID for support */}
            {error.digest && (
              <p className="mt-8 text-sm text-slate-400">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
