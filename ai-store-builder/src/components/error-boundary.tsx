'use client'

import React from 'react'
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component for catching and handling React errors
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (e.g., Sentry)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          reset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  reset?: () => void
  showGoHome?: boolean
  showGoBack?: boolean
}

/**
 * Default error fallback UI component
 */
export function DefaultErrorFallback({
  error,
  reset,
  showGoHome = true,
  showGoBack = false
}: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-600 mb-6">
          {process.env.NODE_ENV === 'development' && error
            ? error.message
            : "We're sorry, but something unexpected happened. Please try again."}
        </p>
        <div className="flex items-center justify-center gap-3">
          {reset && (
            <Button onClick={reset} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          {showGoBack && (
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          )}
          {showGoHome && (
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          )}
        </div>
        {process.env.NODE_ENV === 'development' && error?.stack && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
              Error details (development only)
            </summary>
            <pre className="mt-2 p-4 bg-slate-100 rounded-lg text-xs overflow-auto max-h-60 text-slate-700">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

/**
 * Store-specific error fallback with theme awareness
 */
export function StoreErrorFallback({
  error,
  reset,
  storeName
}: ErrorFallbackProps & { storeName?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-slate-600 mb-6">
          {storeName
            ? `We're having trouble loading ${storeName}. Please try again.`
            : "We're sorry, but this page couldn't be loaded. Please try again."}
        </p>
        <div className="flex items-center justify-center gap-3">
          {reset && (
            <Button
              onClick={reset}
              className="gap-2"
              style={{ backgroundColor: 'var(--store-primary, #2563eb)' }}
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Dashboard-specific error fallback
 */
export function DashboardErrorFallback({
  error,
  reset
}: ErrorFallbackProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">
          Dashboard Error
        </h2>
        <p className="text-slate-600 mb-6">
          Something went wrong while loading this page. Your data is safe.
        </p>
        <div className="flex items-center justify-center gap-3">
          {reset && (
            <Button onClick={reset} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Dashboard Home
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg text-left">
            <p className="text-sm font-medium text-red-800 mb-1">Error:</p>
            <p className="text-sm text-red-700">{error.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
