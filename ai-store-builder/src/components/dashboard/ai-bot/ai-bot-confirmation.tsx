'use client'

import { useAIBot } from './ai-bot-provider'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, RefreshCw, XCircle, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AIBotConfirmation() {
  const { pendingConfirmation, confirmAction, cancelAction, isLoading } = useAIBot()

  if (!pendingConfirmation) {
    return null
  }

  const { type, title, description } = pendingConfirmation

  // Icon based on action type
  const Icon = {
    delete: Trash2,
    bulk_delete: Trash2,
    status_change: RefreshCw,
    refund: XCircle,
  }[type] || AlertTriangle

  // Color scheme based on action type
  const colorScheme = {
    delete: 'text-red-500 bg-red-50 dark:bg-red-950/20',
    bulk_delete: 'text-red-500 bg-red-50 dark:bg-red-950/20',
    status_change: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20',
    refund: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20',
  }[type] || 'text-amber-500 bg-amber-50 dark:bg-amber-950/20'

  return (
    <div className="w-full max-w-sm bg-background border rounded-xl shadow-lg p-6">
      {/* Icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4',
          colorScheme
        )}
      >
        <Icon className="h-6 w-6" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-center mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground text-center mb-6">
        {description}
      </p>

      {/* Warning for destructive actions */}
      {(type === 'delete' || type === 'bulk_delete') && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs mb-6">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>This action cannot be undone. The data will be permanently deleted.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={cancelAction}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant={type === 'delete' || type === 'bulk_delete' ? 'destructive' : 'default'}
          className="flex-1"
          onClick={confirmAction}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm'
          )}
        </Button>
      </div>
    </div>
  )
}
