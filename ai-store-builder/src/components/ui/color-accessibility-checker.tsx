'use client'

import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { checkContrast, suggestTextColor, getAccessibleColorSuggestions } from '@/lib/utils/color-accessibility'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ColorAccessibilityCheckerProps {
  primaryColor: string
  className?: string
  compact?: boolean
  onSuggestionClick?: (color: string) => void
}

export function ColorAccessibilityChecker({
  primaryColor,
  className,
  compact = false,
  onSuggestionClick
}: ColorAccessibilityCheckerProps) {
  const analysis = useMemo(() => {
    const whiteContrast = checkContrast('#FFFFFF', primaryColor)
    const blackContrast = checkContrast('#000000', primaryColor)
    const suggested = suggestTextColor(primaryColor)
    const { suggestions } = getAccessibleColorSuggestions(primaryColor)

    return {
      whiteContrast,
      blackContrast,
      suggested,
      suggestions,
      bestTextColor: suggested.color,
      bestRatio: suggested.contrast
    }
  }, [primaryColor])

  const getStatusIcon = (passAA: boolean, ratio: number) => {
    if (ratio >= 7) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (passAA) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (ratio >= 3) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusText = (passAA: boolean, ratio: number) => {
    if (ratio >= 7) return 'Excellent'
    if (passAA) return 'Good'
    if (ratio >= 3) return 'Large text only'
    return 'Poor contrast'
  }

  const getStatusColor = (passAA: boolean, ratio: number) => {
    if (ratio >= 7) return 'text-green-600'
    if (passAA) return 'text-green-600'
    if (ratio >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1.5 cursor-help', className)}>
              {getStatusIcon(analysis.whiteContrast.passAA || analysis.blackContrast.passAA, analysis.bestRatio)}
              <span className={cn('text-xs', getStatusColor(analysis.whiteContrast.passAA || analysis.blackContrast.passAA, analysis.bestRatio))}>
                {analysis.bestRatio}:1
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">Color Accessibility</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>White text:</span>
                  <span className={getStatusColor(analysis.whiteContrast.passAA, analysis.whiteContrast.ratio)}>
                    {analysis.whiteContrast.ratio}:1 {analysis.whiteContrast.passAA ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Black text:</span>
                  <span className={getStatusColor(analysis.blackContrast.passAA, analysis.blackContrast.ratio)}>
                    {analysis.blackContrast.ratio}:1 {analysis.blackContrast.passAA ? '✓' : '✗'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                WCAG AA requires 4.5:1 for normal text
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn('rounded-lg border p-4 space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Color Accessibility</span>
      </div>

      {/* Preview */}
      <div className="flex gap-2">
        <div
          className="flex-1 rounded-lg p-3 text-center text-sm font-medium"
          style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
        >
          White Text
        </div>
        <div
          className="flex-1 rounded-lg p-3 text-center text-sm font-medium"
          style={{ backgroundColor: primaryColor, color: '#000000' }}
        >
          Black Text
        </div>
      </div>

      {/* Contrast Ratios */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border" />
            <span>White text</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(analysis.whiteContrast.passAA, analysis.whiteContrast.ratio)}
            <span className={getStatusColor(analysis.whiteContrast.passAA, analysis.whiteContrast.ratio)}>
              {analysis.whiteContrast.ratio}:1 · {getStatusText(analysis.whiteContrast.passAA, analysis.whiteContrast.ratio)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-black" />
            <span>Black text</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(analysis.blackContrast.passAA, analysis.blackContrast.ratio)}
            <span className={getStatusColor(analysis.blackContrast.passAA, analysis.blackContrast.ratio)}>
              {analysis.blackContrast.ratio}:1 · {getStatusText(analysis.blackContrast.passAA, analysis.blackContrast.ratio)}
            </span>
          </div>
        </div>
      </div>

      {/* WCAG Guidelines */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span>AA (4.5:1) - Required for normal text</span>
        </p>
        <p className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-yellow-500" />
          <span>Large text (3:1) - 18pt+ or 14pt bold</span>
        </p>
      </div>

      {/* Suggestions */}
      {!analysis.whiteContrast.passAA && !analysis.blackContrast.passAA && (
        <div className="pt-2 border-t">
          <p className="text-sm font-medium text-yellow-600 mb-2">
            Consider a different color for better accessibility
          </p>
          {analysis.suggestions.length > 0 && onSuggestionClick && (
            <div className="flex gap-2">
              {analysis.suggestions.slice(0, 2).map((s) => (
                <button
                  key={s.color}
                  onClick={() => onSuggestionClick(s.color)}
                  className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                >
                  Use {s.label} ({s.contrast}:1)
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommended text color */}
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Recommended text color: <strong>{analysis.bestTextColor === '#FFFFFF' ? 'White' : 'Black'}</strong> ({analysis.bestRatio}:1)
        </p>
      </div>
    </div>
  )
}
