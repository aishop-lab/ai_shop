'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

function ConfirmEmailContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (!token_hash || type !== 'signup') {
        setStatus('error')
        setErrorMessage('Invalid verification link')
        return
      }

      try {
        const supabase = createClient()

        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'signup'
        })

        if (error) {
          setStatus('error')
          setErrorMessage(error.message || 'Verification failed')
        } else {
          setStatus('success')
        }
      } catch {
        setStatus('error')
        setErrorMessage('Something went wrong. Please try again.')
      }
    }

    verifyEmail()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
            <h1 className="text-2xl font-semibold text-gray-900">
              Verifying your email...
            </h1>
            <p className="text-gray-500">
              Please wait a moment
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Email Verified!
            </h1>
            <p className="text-gray-500">
              Your email has been verified successfully.
            </p>
            <div className="pt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                You can now close this tab and continue where you left off.
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Verification Failed
            </h1>
            <p className="text-gray-500">
              {errorMessage}
            </p>
            <div className="pt-4">
              <a
                href="/sign-up"
                className="text-primary hover:underline font-medium"
              >
                Try signing up again
              </a>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            StoreForge - Build your online store with AI
          </p>
        </div>
      </div>
    </div>
  )
}

function ConfirmEmailFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="space-y-4">
          <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
          <h1 className="text-2xl font-semibold text-gray-900">
            Loading...
          </h1>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<ConfirmEmailFallback />}>
      <ConfirmEmailContent />
    </Suspense>
  )
}
