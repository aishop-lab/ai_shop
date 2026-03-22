'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface PageSkeletonProps {
  className?: string
  /** Number of stat cards to show (default: 4) */
  statCards?: number
  /** Whether to show the content area skeleton (default: true) */
  showContent?: boolean
}

export function PageSkeleton({ className, statCards = 4, showContent = true }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Skeleton header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Skeleton stat cards */}
      <div className={cn(
        'grid gap-3',
        statCards <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4',
      )}>
        {Array.from({ length: statCards }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Skeleton content area */}
      {showContent && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** A platform-themed page skeleton using CSS variables */
export function PlatformPageSkeleton({ className, statCards = 4, showContent = true }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Skeleton header */}
      <div className="space-y-2">
        <div className="h-6 w-48 animate-pulse rounded bg-[var(--platform-surface-hover)]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[var(--platform-surface-hover)]" />
      </div>

      {/* Skeleton stat cards */}
      <div className={cn(
        'grid gap-3',
        statCards <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4',
      )}>
        {Array.from({ length: statCards }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 space-y-3"
          >
            <div className="h-3 w-16 rounded bg-[var(--platform-surface-hover)]" />
            <div className="h-7 w-24 rounded bg-[var(--platform-surface-hover)]" />
            <div className="h-3 w-20 rounded bg-[var(--platform-surface-hover)]" />
          </div>
        ))}
      </div>

      {/* Skeleton content area */}
      {showContent && (
        <div className="animate-pulse rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] overflow-hidden">
          {/* Table header skeleton */}
          <div className="border-b border-[var(--platform-border)] px-4 py-3 flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 w-20 rounded bg-[var(--platform-surface-hover)]" />
            ))}
          </div>
          {/* Table rows skeleton */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-4 px-4 py-3',
                i < 4 && 'border-b border-[var(--platform-border)]',
              )}
            >
              <div className="h-3 w-40 rounded bg-[var(--platform-surface-hover)]" />
              <div className="ml-auto h-3 w-12 rounded bg-[var(--platform-surface-hover)]" />
              <div className="h-3 w-16 rounded bg-[var(--platform-surface-hover)]" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
