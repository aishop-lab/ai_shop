'use client'

import { useEffect, useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Google Sign-In Button for Customer Auth
 *
 * Opens a popup on the main domain (storeforge.site/google-auth) where Google OAuth
 * is authorized, then receives the ID token via postMessage. This avoids needing to
 * register every store subdomain as an authorized JavaScript origin in Google Cloud Console.
 */

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

function getMainDomainUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  disabled = false,
  text = 'continue_with'
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const expectedOrigin = new URL(getMainDomainUrl()).origin
      if (event.origin !== expectedOrigin) return
      if (event.data?.type !== 'google-auth-success') return

      const credential = event.data.credential
      if (credential) {
        onSuccess(credential)
      } else {
        onError?.('No credential received from Google')
      }
    },
    [onSuccess, onError]
  )

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  if (!clientId) {
    return null
  }

  const openPopup = () => {
    if (disabled || isLoading) return

    setIsLoading(true)

    const mainDomain = getMainDomainUrl()
    const currentOrigin = window.location.origin
    const popupUrl = `${mainDomain}/google-auth?origin=${encodeURIComponent(currentOrigin)}`

    const width = 420
    const height = 520
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      popupUrl,
      'google-auth-popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=no`
    )

    if (!popup) {
      setIsLoading(false)
      onError?.('Popup was blocked. Please allow popups for this site.')
      return
    }

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer)
        setIsLoading(false)
      }
    }, 500)
  }

  const label =
    text === 'signin_with'
      ? 'Sign in with Google'
      : text === 'signup_with'
        ? 'Sign up with Google'
        : 'Continue with Google'

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={openPopup}
        disabled={disabled || isLoading}
        className="w-full flex items-center justify-center gap-3 h-[42px] px-4 border border-[#dadce0] rounded-md bg-white text-[#3c4043] text-[14px] font-medium shadow-sm hover:shadow-md hover:border-[#d2d2d2] hover:bg-[#f8f9fa] active:bg-[#f1f3f4] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isLoading ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin text-[#3c4043]" />
        ) : (
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        {label}
      </button>
    </div>
  )
}
