'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PlatformConnector } from '@/components/migration/platform-connector'
import { MigrationConfig } from '@/components/migration/migration-config'
import { MigrationProgress } from '@/components/migration/migration-progress'
import { MigrationResults } from '@/components/migration/migration-results'
import type { MigrationProgress as MigrationProgressType } from '@/lib/migration/types'

type PageState = 'loading' | 'disconnected' | 'connected' | 'configuring' | 'migrating' | 'completed'

export default function MigratePage() {
  const searchParams = useSearchParams()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [storeId, setStoreId] = useState<string | null>(null)
  const [migrationId, setMigrationId] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)
  const [shopName, setShopName] = useState<string | null>(null)
  const [completedProgress, setCompletedProgress] = useState<MigrationProgressType | null>(null)
  const [starting, setStarting] = useState(false)

  // Fetch current migration state
  useEffect(() => {
    async function fetchState() {
      try {
        // First get the store
        const storeResponse = await fetch('/api/dashboard/settings')
        if (!storeResponse.ok) return
        const storeData = await storeResponse.json()
        if (!storeData.store) return
        setStoreId(storeData.store.id)

        // Check for existing migration
        const migrationResponse = await fetch(
          `/api/migration/status?store_id=${storeData.store.id}`
        )
        if (!migrationResponse.ok) {
          setPageState('disconnected')
          return
        }

        const migrationData = await migrationResponse.json()

        if (!migrationData.migration) {
          setPageState('disconnected')
          return
        }

        const migration = migrationData.migration as MigrationProgressType
        setMigrationId(migration.id)
        setPlatform(migration.platform)
        setShopName(migration.source_shop_name)

        switch (migration.status) {
          case 'connected':
            setPageState('connected')
            break
          case 'running':
            setPageState('migrating')
            break
          case 'paused':
            setPageState('connected') // Show resume option
            break
          case 'completed':
            setCompletedProgress(migration)
            setPageState('completed')
            break
          case 'failed':
            setCompletedProgress(migration)
            setPageState('completed')
            break
          case 'cancelled':
            setPageState('connected')
            break
          default:
            setPageState('disconnected')
        }
      } catch (error) {
        console.error('Failed to fetch migration state:', error)
        setPageState('disconnected')
      }
    }

    fetchState()
  }, [])

  // Handle OAuth callback notifications
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      toast.success(`Successfully connected to ${connected === 'shopify' ? 'Shopify' : 'Etsy'}`)
      // Refresh state
      window.location.href = '/dashboard/migrate'
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: 'Authentication failed: missing parameters',
        expired_session: 'Session expired. Please try again.',
        invalid_state: 'Security check failed. Please try again.',
        invalid_hmac: 'Shopify signature validation failed.',
        store_not_found: 'Store not found.',
        callback_failed: 'Authentication callback failed. Please try again.',
        etsy_denied: 'Etsy access was denied.',
        invalid_session: 'Invalid session. Please try again.',
      }
      toast.error(errorMessages[error] || `Authentication error: ${error}`)
    }
  }, [searchParams])

  const handleStartMigration = async (config: {
    import_products: boolean
    import_collections: boolean
    import_orders: boolean
    import_customers: boolean
    import_coupons: boolean
    product_status: 'draft' | 'active'
  }) => {
    if (!migrationId) return
    setStarting(true)

    try {
      const response = await fetch('/api/migration/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          migration_id: migrationId,
          ...config,
        }),
      })

      if (response.ok) {
        setPageState('migrating')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to start migration')
      }
    } catch (error) {
      console.error('Failed to start migration:', error)
      toast.error('Failed to start migration')
    } finally {
      setStarting(false)
    }
  }

  const handleMigrationComplete = useCallback(async () => {
    // Fetch final progress
    if (!migrationId) return
    try {
      const response = await fetch(`/api/migration/status?migration_id=${migrationId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.migration) {
          setCompletedProgress(data.migration)
        }
      }
    } catch {
      // ignore
    }
    setPageState('completed')
  }, [migrationId])

  const handleRetry = async () => {
    setPageState('configuring')
  }

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Store Migration</h1>
          <p className="text-muted-foreground mt-1">
            Import your store data from Shopify or Etsy
          </p>
        </div>
      </div>

      {/* Disconnected - Show platform cards */}
      {pageState === 'disconnected' && storeId && (
        <PlatformConnector storeId={storeId} />
      )}

      {/* Connected - Show connection status and configure button */}
      {pageState === 'connected' && storeId && (
        <div className="space-y-4">
          <PlatformConnector
            storeId={storeId}
            connectedPlatform={platform}
            connectedShopName={shopName}
          />
          <div className="flex justify-center">
            <Button size="lg" onClick={() => setPageState('configuring')}>
              Configure Import
            </Button>
          </div>
        </div>
      )}

      {/* Configuring - Show import options */}
      {pageState === 'configuring' && migrationId && platform && shopName && (
        <div className="space-y-4">
          <PlatformConnector
            storeId={storeId!}
            connectedPlatform={platform}
            connectedShopName={shopName}
          />
          <MigrationConfig
            migrationId={migrationId}
            platform={platform}
            shopName={shopName}
            onStart={handleStartMigration}
            starting={starting}
          />
        </div>
      )}

      {/* Migrating - Show progress */}
      {pageState === 'migrating' && migrationId && (
        <MigrationProgress
          migrationId={migrationId}
          onComplete={handleMigrationComplete}
          onCancel={() => setPageState('connected')}
        />
      )}

      {/* Completed - Show results */}
      {pageState === 'completed' && completedProgress && (
        <MigrationResults
          progress={completedProgress}
          onRetry={handleRetry}
        />
      )}
    </div>
  )
}
