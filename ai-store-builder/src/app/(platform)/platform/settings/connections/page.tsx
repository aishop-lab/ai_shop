// src/app/(platform)/platform/settings/connections/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectionRecord {
  provider: string
  status: string
  provider_account_name: string | null
  provider_account_id: string | null
  last_used_at: string | null
  created_at: string | null
}

interface ConnectionProvider {
  id: string // provider key used in API calls
  name: string
  description: string
  initials: string
  initialsColor: string
  comingSoon?: string // if set, the provider is not yet available
}

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

const CONNECTION_PROVIDERS: ConnectionProvider[] = [
  {
    id: 'meta',
    name: 'Meta Business',
    description: 'Connect your Meta Business account for Facebook & Instagram ads',
    initials: 'M',
    initialsColor: 'text-blue-400',
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Connect Google Ads for search and shopping campaigns',
    initials: 'G',
    initialsColor: 'text-red-400',
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    description: 'Connect GA4 for traffic and attribution data',
    initials: 'GA',
    initialsColor: 'text-amber-400',
    comingSoon: 'Coming Soon',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLastSynced(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getAccountDisplayName(provider: ConnectionProvider, record: ConnectionRecord): string {
  if (record.provider_account_name) {
    return `${provider.name}: ${record.provider_account_name}`
  }
  if (record.provider_account_id) {
    return `${provider.name}: ID ${record.provider_account_id}`
  }
  return provider.name
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConnectionsPage() {
  const searchParams = useSearchParams()
  const [connections, setConnections] = useState<ConnectionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch connections
  // ---------------------------------------------------------------------------

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections')
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections || [])
      }
    } catch {
      // Silently fail — cards will show "Not connected"
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  // ---------------------------------------------------------------------------
  // Handle URL params from OAuth callback
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      const providerDef = CONNECTION_PROVIDERS.find((p) => p.id === connected)
      setToast({
        type: 'success',
        message: `${providerDef?.name || connected} connected successfully`,
      })
      // Re-fetch to get the new connection
      fetchConnections()
    } else if (error) {
      setToast({ type: 'error', message: error })
    }
  }, [searchParams, fetchConnections])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleConnect = async (providerId: string) => {
    setConnectingProvider(providerId)
    try {
      const res = await fetch(`/api/connections/${providerId}/auth-url`)
      if (!res.ok) {
        const data = await res.json()
        setToast({ type: 'error', message: data.error || 'Failed to generate authorization URL' })
        return
      }
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setToast({ type: 'error', message: 'Failed to initiate connection' })
    } finally {
      setConnectingProvider(null)
    }
  }

  const handleDisconnect = async (providerId: string) => {
    setDisconnectingProvider(providerId)
    try {
      const res = await fetch(`/api/connections/${providerId}`, { method: 'DELETE' })
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.provider !== providerId))
        const providerDef = CONNECTION_PROVIDERS.find((p) => p.id === providerId)
        setToast({
          type: 'success',
          message: `${providerDef?.name || providerId} disconnected`,
        })
      } else {
        const data = await res.json()
        setToast({ type: 'error', message: data.error || 'Failed to disconnect' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to disconnect account' })
    } finally {
      setDisconnectingProvider(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function getConnectionRecord(providerId: string): ConnectionRecord | undefined {
    return connections.find((c) => c.provider === providerId && c.status === 'active')
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Toast notification */}
      {toast && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-xs',
            toast.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          )}
        >
          {toast.message}
        </div>
      )}

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
        {CONNECTION_PROVIDERS.map((provider) => {
          const record = getConnectionRecord(provider.id)
          const isConnected = !!record
          const isConnecting = connectingProvider === provider.id
          const isDisconnecting = disconnectingProvider === provider.id
          const isComingSoon = !!provider.comingSoon

          return (
            <div
              key={provider.id}
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
                {isConnected && record ? (
                  <div className="mt-0.5 space-y-0.5">
                    <p className="text-xs text-[var(--platform-text-secondary)]">
                      {getAccountDisplayName(provider, record)}
                    </p>
                    <p className="text-xs text-[var(--platform-text-muted)]">
                      Last synced: {formatLastSynced(record.last_used_at)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-[var(--platform-text-muted)]">
                    {provider.description}
                  </p>
                )}
              </div>

              {/* Status + action */}
              <div className="flex shrink-0 items-center gap-3">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--platform-text-muted)]" />
                ) : isComingSoon ? (
                  <>
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
                  </>
                ) : isConnected ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      Connected
                    </span>
                    <button
                      type="button"
                      disabled={isDisconnecting}
                      onClick={() => handleDisconnect(provider.id)}
                      className={cn(
                        'rounded border border-[var(--platform-border)] px-3 py-1.5 text-xs font-medium',
                        'text-red-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10',
                        isDisconnecting && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {isDisconnecting ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Disconnecting
                        </span>
                      ) : (
                        'Disconnect'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-[var(--platform-text-muted)]">Not connected</span>
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={() => handleConnect(provider.id)}
                      className={cn(
                        'rounded border border-[var(--platform-accent)] px-3 py-1.5 text-xs font-medium',
                        'text-[var(--platform-accent)] transition-colors hover:bg-[var(--platform-accent)]/10',
                        isConnecting && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {isConnecting ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Connecting
                        </span>
                      ) : (
                        'Connect'
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info callout */}
      <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-5 py-4">
        <p className="text-xs text-[var(--platform-text-muted)]">
          Connected accounts allow your agents to manage ad campaigns, track performance, and
          optimize spend across platforms. Credentials are encrypted at rest and tokens are
          automatically refreshed.
        </p>
      </div>
    </div>
  )
}
