'use client'

import { cn } from '@/lib/utils'
import type { AgentType } from '@/lib/agents/types'
import { AgentBadge } from './agent-badge'
import type { ReactNode } from 'react'

export interface TimelineItem {
  id: string
  timestamp: string
  agent?: AgentType
  title: string
  description?: string
  status?: 'success' | 'warning' | 'error' | 'info' | 'pending'
  icon?: ReactNode
}

interface TimelineProps {
  items: TimelineItem[]
  maxItems?: number
  showTimestamps?: boolean
  compact?: boolean
  className?: string
}

const STATUS_DOT_COLORS: Record<string, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  pending: 'bg-zinc-500',
}

const STATUS_LINE_COLORS: Record<string, string> = {
  success: 'bg-emerald-400/30',
  warning: 'bg-amber-400/30',
  error: 'bg-red-400/30',
  info: 'bg-blue-400/30',
  pending: 'bg-zinc-700',
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then

  if (diffMs < 0) return 'just now'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function Timeline({
  items,
  maxItems,
  showTimestamps = true,
  compact = false,
  className,
}: TimelineProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items

  if (displayItems.length === 0) {
    return (
      <div className={cn('py-8 text-center text-sm text-zinc-500', className)}>
        No activity yet
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1
        const status = item.status ?? 'info'
        const dotColor = STATUS_DOT_COLORS[status]
        const lineColor = STATUS_LINE_COLORS[status]

        return (
          <div
            key={item.id}
            className={cn(
              'relative flex gap-3',
              compact ? 'pb-3' : 'pb-5'
            )}
          >
            {/* Left column: dot + connecting line */}
            <div className="relative flex flex-col items-center">
              {/* Dot or icon */}
              {item.icon ? (
                <div className={cn(
                  'flex items-center justify-center rounded-full',
                  compact ? 'h-5 w-5' : 'h-6 w-6',
                  'bg-zinc-800 border border-zinc-700 text-zinc-300',
                )}>
                  <span className={cn(compact ? 'text-[10px]' : 'text-xs')}>
                    {item.icon}
                  </span>
                </div>
              ) : (
                <div className={cn(
                  'rounded-full shrink-0',
                  compact ? 'h-2 w-2 mt-1.5' : 'h-2.5 w-2.5 mt-1.5',
                  dotColor,
                )} />
              )}

              {/* Connecting line */}
              {!isLast && (
                <div className={cn(
                  'w-px flex-1 min-h-[16px]',
                  lineColor,
                )} />
              )}
            </div>

            {/* Right column: content */}
            <div className={cn('flex-1 min-w-0', compact ? '-mt-0.5' : '-mt-0.5')}>
              {/* Header row: title + agent badge + timestamp */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <p className={cn(
                    'font-medium truncate',
                    compact ? 'text-xs' : 'text-sm',
                    'text-zinc-100',
                  )}>
                    {item.title}
                  </p>
                  {item.agent && (
                    <AgentBadge agentType={item.agent} size="sm" />
                  )}
                </div>

                {showTimestamps && (
                  <span className={cn(
                    'shrink-0 font-mono text-zinc-500',
                    compact ? 'text-[10px]' : 'text-[11px]',
                  )}>
                    {formatRelativeTime(item.timestamp)}
                  </span>
                )}
              </div>

              {/* Description */}
              {item.description && !compact && (
                <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
