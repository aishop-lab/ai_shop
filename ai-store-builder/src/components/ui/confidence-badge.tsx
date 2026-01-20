'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, HelpCircle, Sparkles } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ConfidenceBadgeProps {
  score: number
  level: 'high' | 'medium' | 'low'
  reasoning?: string
  className?: string
  showPercentage?: boolean
}

export function ConfidenceBadge({
  score,
  level,
  reasoning,
  className,
  showPercentage = true
}: ConfidenceBadgeProps) {
  const percentage = Math.round(score * 100)

  const getIcon = () => {
    switch (level) {
      case 'high':
        return <CheckCircle2 className="h-3.5 w-3.5" />
      case 'medium':
        return <AlertCircle className="h-3.5 w-3.5" />
      case 'low':
        return <HelpCircle className="h-3.5 w-3.5" />
    }
  }

  const getStyles = () => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'low':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
    }
  }

  const getLabel = () => {
    switch (level) {
      case 'high':
        return 'High confidence'
      case 'medium':
        return 'Medium confidence'
      case 'low':
        return 'Low confidence'
    }
  }

  const getDescription = () => {
    switch (level) {
      case 'high':
        return 'AI is confident in this suggestion'
      case 'medium':
        return 'Please review and confirm'
      case 'low':
        return 'Consider providing more details'
    }
  }

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        getStyles(),
        className
      )}
    >
      {getIcon()}
      {showPercentage && <span>{percentage}%</span>}
    </div>
  )

  if (!reasoning) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{badge}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{getLabel()}</p>
            <p className="text-xs text-muted-foreground">{getDescription()}</p>
            {reasoning && (
              <p className="text-xs flex items-center gap-1 pt-1 border-t mt-1">
                <Sparkles className="h-3 w-3" />
                {reasoning}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface ConfidenceMeterProps {
  score: number
  className?: string
  showLabel?: boolean
}

export function ConfidenceMeter({ score, className, showLabel = true }: ConfidenceMeterProps) {
  const percentage = Math.round(score * 100)
  const level = score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low'

  const getColor = () => {
    switch (level) {
      case 'high':
        return 'bg-green-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-red-500'
    }
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        {showLabel && <span className="text-muted-foreground">AI Confidence</span>}
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
