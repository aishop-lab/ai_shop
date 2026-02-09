'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlatformRevenueChart } from '@/components/admin/platform-revenue-chart'
import { SignupsChart } from '@/components/admin/signups-chart'
import { Loader2, AlertTriangle, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Period = '7d' | '30d' | '90d' | '1y' | 'all'

interface AnalyticsData {
  revenueTrend: { date: string; revenue: number; orders: number }[]
  signupsTrend: { date: string; sellers: number; stores: number; customers: number }[]
  topStores: { id: string; name: string; slug: string; logo_url: string | null; revenue: number; orders_count: number }[]
  recentOrders: { id: string; order_number: string; customer_name: string; total_amount: number; store_name: string; created_at: string }[]
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('30d')

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/analytics?period=${period}`)
        if (!response.ok) {
          throw new Error('Failed to fetch analytics')
        }
        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Unable to load analytics</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  // Calculate totals from trends
  const totalRevenue = analytics?.revenueTrend.reduce((sum, d) => sum + d.revenue, 0) || 0
  const totalOrders = analytics?.revenueTrend.reduce((sum, d) => sum + d.orders, 0) || 0
  const totalSellers = analytics?.signupsTrend.reduce((sum, d) => sum + d.sellers, 0) || 0
  const totalStores = analytics?.signupsTrend.reduce((sum, d) => sum + d.stores, 0) || 0
  const totalCustomers = analytics?.signupsTrend.reduce((sum, d) => sum + d.customers, 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Platform performance metrics</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
            <TabsTrigger value="1y">1 year</TabsTrigger>
            <TabsTrigger value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue, 'INR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="text-2xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">New Sellers</p>
            <p className="text-2xl font-bold">{totalSellers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">New Stores</p>
            <p className="text-2xl font-bold">{totalStores}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">New Customers</p>
            <p className="text-2xl font-bold">{totalCustomers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Platform revenue over time</CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformRevenueChart data={analytics?.revenueTrend || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signups Trend</CardTitle>
          <CardDescription>New sellers, stores, and customers over time</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupsChart data={analytics?.signupsTrend || []} />
        </CardContent>
      </Card>

      {/* Top Stores Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Stores by Revenue</CardTitle>
              <CardDescription>Best performing stores</CardDescription>
            </div>
            <Link
              href="/admin/stores"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {!analytics?.topStores?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No stores yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topStores.map((store, index) => (
                  <Link
                    key={store.id}
                    href={`/admin/stores/${store.id}`}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{store.name}</p>
                        <p className="text-xs text-muted-foreground">{store.orders_count} orders</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">
                      {formatCurrency(store.revenue, 'INR')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Stores by Orders</CardTitle>
              <CardDescription>Most active stores</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!analytics?.topStores?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No stores yet</p>
            ) : (
              <div className="space-y-3">
                {[...analytics.topStores]
                  .sort((a, b) => b.orders_count - a.orders_count)
                  .map((store, index) => (
                    <Link
                      key={store.id}
                      href={`/admin/stores/${store.id}`}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-4">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{store.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(store.revenue, 'INR')} revenue
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-sm">
                        {store.orders_count} orders
                      </span>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
