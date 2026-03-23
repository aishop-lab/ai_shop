'use client'

import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fillOpacity?: number
  showDots?: boolean
  className?: string
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'currentColor',
  fillOpacity = 0,
  showDots = false,
  className,
}: SparklineProps) {
  const { linePath, areaPath, points, minIdx, maxIdx } = useMemo(() => {
    if (data.length < 2) {
      return { linePath: '', areaPath: '', points: [], minIdx: 0, maxIdx: 0 }
    }

    const padding = showDots ? 2 : 0
    const drawWidth = width - padding * 2
    const drawHeight = height - padding * 2

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    let minI = 0
    let maxI = 0

    const pts = data.map((value, i) => {
      const x = padding + (i / (data.length - 1)) * drawWidth
      const y = padding + drawHeight - ((value - min) / range) * drawHeight

      if (value <= data[minI]) minI = i
      if (value >= data[maxI]) maxI = i

      return { x, y }
    })

    // Build SVG path
    const lineD = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')

    // Area path (line path + close at bottom)
    const areaD = fillOpacity > 0
      ? `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${(padding + drawHeight).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padding + drawHeight).toFixed(1)} Z`
      : ''

    return {
      linePath: lineD,
      areaPath: areaD,
      points: pts,
      minIdx: minI,
      maxIdx: maxI,
    }
  }, [data, width, height, fillOpacity, showDots])

  if (data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn('shrink-0', className)}
        aria-hidden="true"
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.3}
        />
      </svg>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {/* Area fill */}
      {areaPath && (
        <path
          d={areaPath}
          fill={color}
          opacity={fillOpacity}
        />
      )}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Min/Max dots */}
      {showDots && points.length > 0 && (
        <>
          <circle
            cx={points[maxIdx].x}
            cy={points[maxIdx].y}
            r={2}
            fill={color}
          />
          <circle
            cx={points[minIdx].x}
            cy={points[minIdx].y}
            r={2}
            fill={color}
            opacity={0.5}
          />
        </>
      )}
    </svg>
  )
}
