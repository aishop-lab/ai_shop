'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Profile, AuthUser, SignUpData } from '@/lib/types/auth'

// SEC-04: Session expiry warning threshold (5 minutes before expiry)
const SESSION_WARNING_THRESHOLD_MS = 5 * 60 * 1000
// Check session status every 60 seconds
const SESSION_CHECK_INTERVAL_MS = 60 * 1000

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  // SEC-04: Track whether we've already shown the session expiry warning
  const sessionWarningShownRef = useRef(false)

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/user')
      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        setProfile(data.profile)
      } else {
        setUser(null)
        setProfile(null)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      setUser(null)
      setProfile(null)
    }
  }, [])

  // Fetch user on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      await refreshUser()
      setIsLoading(false)
    }
    initAuth()
  }, [refreshUser])

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      refreshUser()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshUser])

  // SEC-04: Session timeout warning and auto-refresh
  useEffect(() => {
    // Only run session checks when user is authenticated
    if (!user) {
      sessionWarningShownRef.current = false
      return
    }

    const checkSession = async () => {
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          // Session is gone - user has been logged out
          setUser(null)
          setProfile(null)
          sessionWarningShownRef.current = false
          toast.error('Your session has expired. Please sign in again.')
          router.push('/sign-in')
          return
        }

        const expiresAt = session.expires_at
        if (!expiresAt) return

        const expiresAtMs = expiresAt * 1000 // Convert Unix timestamp to ms
        const now = Date.now()
        const timeUntilExpiry = expiresAtMs - now

        if (timeUntilExpiry <= 0) {
          // Session has already expired
          setUser(null)
          setProfile(null)
          sessionWarningShownRef.current = false
          toast.error('Your session has expired. Please sign in again.')
          router.push('/sign-in')
          return
        }

        if (timeUntilExpiry <= SESSION_WARNING_THRESHOLD_MS) {
          // Session is about to expire - try to refresh it
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

          if (refreshError || !refreshData.session) {
            // Refresh failed - warn the user
            if (!sessionWarningShownRef.current) {
              sessionWarningShownRef.current = true
              const minutesLeft = Math.max(1, Math.ceil(timeUntilExpiry / 60000))
              toast.warning(
                `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Save your work.`,
                { duration: 10000 }
              )
            }
          } else {
            // Session refreshed successfully - reset warning flag
            sessionWarningShownRef.current = false
          }
        }
      } catch (error) {
        console.error('Session check failed:', error)
      }
    }

    // Run an initial check
    checkSession()

    // Set up periodic checks
    const intervalId = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [user, router])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if user doesn't exist - redirect to sign-up
        if (data.code === 'USER_NOT_FOUND') {
          toast.info('No account found. Let\'s create one!')
          router.push(`/sign-up?email=${encodeURIComponent(email)}`)
          return
        }
        throw new Error(data.error || 'Failed to sign in')
      }

      // Check if 2FA is required
      if (data.requires2FA && data.pendingToken) {
        toast.info('Verification code sent to your email')
        router.push(`/verify-2fa?token=${encodeURIComponent(data.pendingToken)}`)
        return
      }

      setUser(data.user)
      setProfile(data.profile)

      toast.success('Welcome back!')

      // Redirect based on onboarding status
      if (data.profile?.onboarding_completed) {
        router.push('/platform')
      } else {
        router.push('/onboarding')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in'
      toast.error(message)
      throw error
    }
  }

  const signUp = async (data: SignUpData) => {
    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone || undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      // Success toast and redirect handled by the caller (sign-up page)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account'
      toast.error(message)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        throw error
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in with Google'
      toast.error(message)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to sign out')
      }

      setUser(null)
      setProfile(null)

      toast.success('Signed out successfully')
      router.push('/sign-in')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out'
      toast.error(message)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
