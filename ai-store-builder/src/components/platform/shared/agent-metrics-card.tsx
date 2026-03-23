'use client'

import { cn } from '@/lib/utils'
import type { AgentType } from '@/lib/agents/types'
import { AGENT_DISPLAY_NAMES, AGENT_COLORS } from '@/lib/agents/constants'
import { Sparkline } from './sparkline'

interface MetricItem {
  label: string
  value: string | number
  change?: number
  trend?: number[]
}

interface AgentMetricsCardProps {
  agentType: AgentType
  metrics: MetricItem[]
  period?: string
  className?: string
}

/** Hex colors for sparklines (can't use Tailwind classes in SVG stroke) */
const AGENT_HEX_COLORS: Record<AgentType, string> = {
  marketing: '#a78bfa',  // purple-400
  sales: '#34d399',      // emerald-400
  support: '#60a5fa',    // blue-400
  analytics: '#fbbf24',  // amber-400
  technical: '#22d3ee',  // cyan-400
}

export function AgentMetricsCard({
  agentType,
  metrics,
  period,
  className,
}: AgentMetricsCardProps) {
  const colors = AGENT_COLORS[agentType]
  const name = AGENT_DISPLAY_NAMES[agentType]
  const hexColor = AGENT_HEX_COLORS[agentType]

  return (
    <div
      className={cn(
        'rounded-lg border bg-zinc-900/50 overflow-hidden',
        colors.border,
        className,
      )}
    >
      {/* Top accent bar */}
      <div className={cn('h-0.5', colors.dot)} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
          <span className={cn('text-xs font-medium', colors.text)}>
            {name.replace(' Agent', '')}
          </span>
        </div>
        {period && (
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            {period}
          </span>
        )}
      </div>

      {/* Metrics grid */}
      <div className="px-4 pb-3">
        <div className={cn(
          'grid gap-3',
          metrics.length === 1 ? 'grid-cols-1' : '',
          metrics.length === 2 ? 'grid-cols-2' : '',
          metrics.length >= 3 ? 'grid-cols-2 lg:grid-cols-3' : '',
        )}>
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {metric.label}
              </p>

              <div className="flex items-end gap-2">
                <span className="font-mono text-lg font-semibold text-zinc-100 leading-none">
                  {metric.value}
                </span>

                {metric.change !== undefined && metric.change !== 0 && (
                  <ChangeIndicator change={metric.change} />
                )}
              </div>

              {metric.trend && metric.trend.length >= 2 && (
                <Sparkline
                  data={metric.trend}
                  width={80}
                  height={20}
                  color={hexColor}
                  fillOpacity={0.1}
                  className="mt-1"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChangeIndicator({ change }: { change: number }) {
  const isPositive = change > 0
  const absChange = Math.abs(change)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-mono text-[11px] leading-none pb-0.5',
        isPositive ? 'text-emerald-400' : 'text-red-400',
      )}
    >
      <span>{isPositive ? '\u2191' : '\u2193'}</span>
      <span>{absChange.toFixed(1)}%</span>
    </span>
  )
}
