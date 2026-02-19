'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Package,
  Folder,
  Image as ImageIcon,
  ShoppingCart,
  Users,
  Tag,
  RotateCcw,
} from 'lucide-react'
import type { MigrationProgress } from '@/lib/migration/types'

interface MigrationResultsProps {
  progress: MigrationProgress
  onRetry?: () => void
}

export function MigrationResults({ progress, onRetry }: MigrationResultsProps) {
  const [showErrors, setShowErrors] = useState(false)

  const totalFailed = progress.failed_products + progress.failed_collections + progress.failed_images +
    progress.failed_orders + progress.failed_customers + progress.failed_coupons
  const isSuccess = totalFailed === 0 && progress.status === 'completed'

  return (
    <Card className={isSuccess ? 'border-green-200 dark:border-green-800' : 'border-yellow-200 dark:border-yellow-800'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            )}
            <div>
              <CardTitle>
                {isSuccess ? 'Migration Complete' : 'Migration Completed with Issues'}
              </CardTitle>
              <CardDescription>
                {progress.source_shop_name && `From ${progress.source_shop_name}`}
              </CardDescription>
            </div>
          </div>
          <Badge variant={isSuccess ? 'default' : 'secondary'}>
            {progress.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Products</p>
              <p className="text-lg font-bold text-green-600">
                {progress.migrated_products} imported
              </p>
              {progress.failed_products > 0 && (
                <p className="text-xs text-destructive">{progress.failed_products} failed</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Folder className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Collections</p>
              <p className="text-lg font-bold text-green-600">
                {progress.migrated_collections} imported
              </p>
              {progress.failed_collections > 0 && (
                <p className="text-xs text-destructive">{progress.failed_collections} failed</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Images</p>
              <p className="text-lg font-bold text-green-600">
                {progress.migrated_images} uploaded
              </p>
              {progress.failed_images > 0 && (
                <p className="text-xs text-destructive">{progress.failed_images} failed</p>
              )}
            </div>
          </div>

          {(progress.migrated_customers > 0 || progress.failed_customers > 0) && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Customers</p>
                <p className="text-lg font-bold text-green-600">
                  {progress.migrated_customers} imported
                </p>
                {progress.failed_customers > 0 && (
                  <p className="text-xs text-destructive">{progress.failed_customers} failed</p>
                )}
              </div>
            </div>
          )}

          {(progress.migrated_coupons > 0 || progress.failed_coupons > 0) && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Coupons</p>
                <p className="text-lg font-bold text-green-600">
                  {progress.migrated_coupons} imported
                </p>
                {progress.failed_coupons > 0 && (
                  <p className="text-xs text-destructive">{progress.failed_coupons} failed</p>
                )}
              </div>
            </div>
          )}

          {(progress.migrated_orders > 0 || progress.failed_orders > 0) && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Orders</p>
                <p className="text-lg font-bold text-green-600">
                  {progress.migrated_orders} imported
                </p>
                {progress.failed_orders > 0 && (
                  <p className="text-xs text-destructive">{progress.failed_orders} failed</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error details */}
        {progress.errors.length > 0 && (
          <div className="border rounded-lg">
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                {progress.errors.length} error{progress.errors.length !== 1 ? 's' : ''}
              </span>
              {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showErrors && (
              <div className="border-t max-h-60 overflow-y-auto">
                {progress.errors.map((err, i) => (
                  <div key={i} className="px-3 py-2 text-sm border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {err.type}
                      </Badge>
                      {err.source_title && (
                        <span className="font-medium truncate">{err.source_title}</span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1">{err.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/dashboard/products" className="flex-1">
            <Button className="w-full">
              <Package className="h-4 w-4 mr-2" />
              View Products
            </Button>
          </Link>
          {totalFailed > 0 && onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Failed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
