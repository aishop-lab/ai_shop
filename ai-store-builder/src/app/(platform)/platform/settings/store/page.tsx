'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Store } from 'lucide-react'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

export default function PlatformStoreSettingsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect to the full store settings page in the dashboard
  // (This is a temporary bridge until settings are rebuilt in the platform layout)
  useEffect(() => {
    if (mounted) {
      router.replace('/dashboard/settings')
    }
  }, [mounted, router])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Settings', href: '/platform/settings' },
          { label: 'Store Settings' },
        ]}
      />
      <div className="flex items-center gap-3">
        <Link
          href="/platform/settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--platform-border)] text-[var(--platform-text-muted)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Store Settings
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Redirecting to store configuration...
          </p>
        </div>
      </div>
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
      </div>
    </div>
  )
}
