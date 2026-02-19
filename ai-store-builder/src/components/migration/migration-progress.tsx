'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, Pause, X, Package, Folder, Image as ImageIcon, ShoppingCart, Users, Tag } from 'lucide-react'
import type { MigrationProgress as MigrationProgressType } from '@/lib/migration/types'

interface MigrationProgressProps {
  migrationId: string
  onComplete: () => void
  onCancel: () => void
}

export function MigrationProgress({
  migrationId,
  onComplete,
  onCancel,
}: MigrationProgressProps) {
  const [progress, setProgress] = useState<MigrationProgressType | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // Poll for progress updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/migration/status?migration_id=${migrationId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.migration) {
            setProgress(data.migration)

            if (['completed', 'failed', 'cancelled'].includes(data.migration.status)) {
              clearInterval(interval)
              if (data.migration.status === 'completed') {
                onComplete()
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch migration progress:', error)
      }
    }

    fetchProgress()
    interval = setInterval(fetchProgress, 2000)

    return () => clearInterval(interval)
  }, [migrationId, onComplete])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await fetch('/api/migration/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migration_id: migrationId }),
      })
      onCancel()
    } catch (error) {
      console.error('Failed to cancel migration:', error)
    } finally {
      setCancelling(false)
    }
  }

  if (!progress) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const totalItems = progress.total_products + progress.total_collections +
    progress.total_customers + progress.total_coupons + progress.total_orders
  const migratedItems = progress.migrated_products + progress.migrated_collections +
    progress.migrated_customers + progress.migrated_coupons + progress.migrated_orders
  const failedItems = progress.failed_products + progress.failed_collections +
    progress.failed_customers + progress.failed_coupons + progress.failed_orders
  const processedItems = migratedItems + failedItems
  const overallPercent = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0

  const isPaused = progress.status === 'paused'
  const isRunning = progress.status === 'running'

  const phaseLabels: Record<string, string> = {
    products: `Importing Products ${progress.migrated_products + progress.failed_products}/${progress.total_products}`,
    collections: `Importing Collections ${progress.migrated_collections + progress.failed_collections}/${progress.total_collections}`,
    customers: `Importing Customers ${progress.migrated_customers + progress.failed_customers}/${progress.total_customers}`,
    coupons: `Importing Coupons ${progress.migrated_coupons + progress.failed_coupons}/${progress.total_coupons}`,
    orders: `Importing Orders ${progress.migrated_orders + progress.failed_orders}/${progress.total_orders}`,
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isRunning && <Loader2 className="h-5 w-5 animate-spin" />}
            {isPaused && <Pause className="h-5 w-5 text-yellow-500" />}
            {isRunning ? 'Migration in Progress' : isPaused ? 'Migration Paused' : 'Migration'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {progress.status === 'failed' && (
              <Badge variant="destructive">Failed</Badge>
            )}
            {isPaused && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Paused
              </Badge>
            )}
            {(isRunning || isPaused) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{overallPercent}%</span>
          </div>
          <Progress value={overallPercent} className="h-3" />
        </div>

        {/* Phase breakdowns */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Products */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4" />
              Products
            </div>
            <div className="text-2xl font-bold">
              {progress.migrated_products}
              <span className="text-sm font-normal text-muted-foreground">
                /{progress.total_products}
              </span>
            </div>
            {progress.failed_products > 0 && (
              <p className="text-xs text-destructive">
                {progress.failed_products} failed
              </p>
            )}
          </div>

          {/* Collections */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Folder className="h-4 w-4" />
              Collections
            </div>
            <div className="text-2xl font-bold">
              {progress.migrated_collections}
              <span className="text-sm font-normal text-muted-foreground">
                /{progress.total_collections}
              </span>
            </div>
            {progress.failed_collections > 0 && (
              <p className="text-xs text-destructive">
                {progress.failed_collections} failed
              </p>
            )}
          </div>

          {/* Images */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4" />
              Images
            </div>
            <div className="text-2xl font-bold">
              {progress.migrated_images}
              <span className="text-sm font-normal text-muted-foreground">
                /{progress.total_images}
              </span>
            </div>
            {progress.failed_images > 0 && (
              <p className="text-xs text-destructive">
                {progress.failed_images} failed
              </p>
            )}
          </div>

          {/* Customers */}
          {(progress.total_customers > 0 || progress.current_phase === 'customers') && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Customers
              </div>
              <div className="text-2xl font-bold">
                {progress.migrated_customers}
                <span className="text-sm font-normal text-muted-foreground">
                  /{progress.total_customers}
                </span>
              </div>
              {progress.failed_customers > 0 && (
                <p className="text-xs text-destructive">
                  {progress.failed_customers} failed
                </p>
              )}
            </div>
          )}

          {/* Coupons */}
          {(progress.total_coupons > 0 || progress.current_phase === 'coupons') && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                Coupons
              </div>
              <div className="text-2xl font-bold">
                {progress.migrated_coupons}
                <span className="text-sm font-normal text-muted-foreground">
                  /{progress.total_coupons}
                </span>
              </div>
              {progress.failed_coupons > 0 && (
                <p className="text-xs text-destructive">
                  {progress.failed_coupons} failed
                </p>
              )}
            </div>
          )}

          {/* Orders */}
          {(progress.total_orders > 0 || progress.current_phase === 'orders') && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="h-4 w-4" />
                Orders
              </div>
              <div className="text-2xl font-bold">
                {progress.migrated_orders}
                <span className="text-sm font-normal text-muted-foreground">
                  /{progress.total_orders}
                </span>
              </div>
              {progress.failed_orders > 0 && (
                <p className="text-xs text-destructive">
                  {progress.failed_orders} failed
                </p>
              )}
            </div>
          )}
        </div>

        {/* Current phase */}
        {isRunning && progress.current_phase !== 'done' && (
          <p className="text-sm text-muted-foreground text-center">
            {phaseLabels[progress.current_phase] || 'Processing...'}
          </p>
        )}

        {isPaused && (
          <p className="text-sm text-yellow-600 text-center">
            Migration paused due to time limit. Click &quot;Resume&quot; to continue from where it left off.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
