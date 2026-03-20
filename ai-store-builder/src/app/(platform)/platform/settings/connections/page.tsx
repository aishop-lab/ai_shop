// src/app/(platform)/platform/settings/connections/page.tsx
'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectionProvider {
  name: string
  description: string
  initials: string
  initialsColor: string
  comingSoon: string
}

const CONNECTION_PROVIDERS: ConnectionProvider[] = [
  {
    name: 'Meta Business',
    description: 'Connect your Meta Business account for Facebook & Instagram ads',
    initials: 'M',
    initialsColor: 'text-blue-400',
    comingSoon: 'Coming in Phase 7',
  },
  {
    name: 'Google Ads',
    description: 'Connect Google Ads for search and shopping campaigns',
    initials: 'G',
    initialsColor: 'text-red-400',
    comingSoon: 'Coming in Phase 7',
  },
  {
    name: 'Google Analytics',
    description: 'Connect GA4 for traffic and attribution data',
    initials: 'GA',
    initialsColor: 'text-amber-400',
    comingSoon: 'Coming in Phase 7',
  },
]

export default function ConnectionsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/platform/settings"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Settings
        </Link>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Connected Accounts
        </h1>
        <p className="text-sm text-[var(--platform-text-secondary)]">
          Connect external platforms to give your agents more reach
        </p>
      </div>

      {/* Connection cards */}
      <div className="space-y-3">
        {CONNECTION_PROVIDERS.map((provider) => (
          <div
            key={provider.name}
            className="flex items-center gap-4 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5"
          >
            {/* Logo placeholder */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)]">
              <span className={cn('font-mono text-xs font-bold', provider.initialsColor)}>
                {provider.initials}
              </span>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--platform-text-primary)]">
                {provider.name}
              </p>
              <p className="mt-0.5 text-xs text-[var(--platform-text-muted)]">
                {provider.description}
              </p>
            </div>

            {/* Status + action */}
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-[var(--platform-text-muted)]">Not connected</span>
              <button
                type="button"
                disabled
                title={provider.comingSoon}
                className={cn(
                  'rounded border border-[var(--platform-border)] px-3 py-1.5 text-xs font-medium',
                  'cursor-not-allowed text-[var(--platform-text-muted)] opacity-50'
                )}
              >
                {provider.comingSoon}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Phase callout */}
      <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-5 py-4">
        <p className="text-xs text-[var(--platform-text-muted)]">
          External integrations are planned for Phase 7 of the agent platform. Your agents already
          work with your store data — external ad platforms and analytics will expand their reach
          further.
        </p>
      </div>
    </div>
  )
}
