'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { ADMIN_EMAIL } from '@/lib/admin/constants'

export function useRequireAdmin(redirectTo = '/sign-in') {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push(redirectTo)
      return
    }

    if (!isAdmin) {
      // Redirect non-admins to dashboard
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, isAdmin, redirectTo, router])

  return { isAuthenticated, isLoading, isAdmin }
}
