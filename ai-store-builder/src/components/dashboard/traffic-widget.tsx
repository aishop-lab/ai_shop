'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Users,
  Eye,
  MousePointer,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface TrafficMetrics {
  pageViews: number
  uniqueVisitors: number
  bounceRate: number
  avgSessionDuration: string
  topPages: Array<{ path: string; views: number; percentage: number }>
  trafficSources: Array<{ source: string; visits: number; percentage: number }>
  trend: {
    pageViews: number // percentage change
    visitors: number // percentage change
  }
}

interface TrafficWidgetProps {
  storeSlug?: string
  ga4Connected?: boolean
  className?: string
}

export function TrafficWidget({ storeSlug, ga4Connected = false, className }: TrafficWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<TrafficMetrics | null>(null)

  useEffect(() => {
    // Simulate loading traffic data
    // In production, this would fetch from GA4 API if connected
    const timer = setTimeout(() => {
      if (ga4Connected) {
        // Simulated data for connected GA4
        setMetrics({
          pageViews: 2450,
          uniqueVisitors: 1234,
          bounceRate: 45.2,
          avgSessionDuration: '2m 34s',
          topPages: [
            { path: '/products', views: 850, percentage: 35 },
            { path: '/', views: 620, percentage: 25 },
            { path: '/collections/new', views: 340, percentage: 14 },
            { path: '/cart', views: 280, percentage: 11 },
            { path: '/about', views: 180, percentage: 7 }
          ],
          trafficSources: [
            { source: 'Google', visits: 740, percentage: 60 },
            { source: 'Direct', visits: 309, percentage: 25 },
            { source: 'Social', visits: 185, percentage: 15 }
          ],
          trend: {
            pageViews: 12.5,
            visitors: 8.3
          }
        })
      } else {
        setMetrics(null)
      }
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [ga4Connected])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Traffic Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Not connected state
  if (!ga4Connected || !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Traffic Analytics
          </CardTitle>
          <CardDescription>
            Connect Google Analytics to see your store traffic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Add your Google Analytics 4 Measurement ID in Marketing settings to track visitor data.
            </p>
            <Link href="/dashboard/settings/marketing">
              <Button variant="outline" size="sm">
                Connect GA4
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Traffic Analytics
        </CardTitle>
        <CardDescription>
          Last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Page Views
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {metrics.pageViews.toLocaleString()}
              </span>
              <TrendIndicator value={metrics.trend.pageViews} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Unique Visitors
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {metrics.uniqueVisitors.toLocaleString()}
              </span>
              <TrendIndicator value={metrics.trend.visitors} />
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="flex justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Bounce Rate:</span>{' '}
            <span className="font-medium">{metrics.bounceRate}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg. Session:</span>{' '}
            <span className="font-medium">{metrics.avgSessionDuration}</span>
          </div>
        </div>

        {/* Top Pages */}
        <div>
          <h4 className="text-sm font-medium mb-2">Top Pages</h4>
          <div className="space-y-2">
            {metrics.topPages.slice(0, 3).map((page) => (
              <div key={page.path} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm truncate">{page.path}</div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${page.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {page.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div>
          <h4 className="text-sm font-medium mb-2">Traffic Sources</h4>
          <div className="flex gap-2">
            {metrics.trafficSources.map((source) => (
              <div
                key={source.source}
                className="flex-1 text-center p-2 bg-muted/50 rounded-lg"
              >
                <div className="text-lg font-bold">{source.percentage}%</div>
                <div className="text-xs text-muted-foreground">{source.source}</div>
              </div>
            ))}
          </div>
        </div>

        {/* View Full Analytics */}
        <Link href="/dashboard/analytics">
          <Button variant="outline" size="sm" className="w-full">
            View Full Analytics
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function TrendIndicator({ value }: { value: number }) {
  if (value === 0) return null

  const isPositive = value > 0
  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <span
      className={`flex items-center gap-0.5 text-xs ${
        isPositive ? 'text-green-600' : 'text-red-600'
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  )
}
