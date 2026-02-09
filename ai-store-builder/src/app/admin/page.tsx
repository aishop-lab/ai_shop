'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminStatsCard } from '@/components/admin/admin-stats-card'
import { PlatformRevenueChart } from '@/components/admin/platform-revenue-chart'
import { SignupsChart } from '@/components/admin/signups-chart'
import {
  Store,
  Users,
  ShoppingCart,
  DollarSign,
  Loader2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import type { PlatformStats } from '@/lib/admin/queries'

interface AnalyticsData {
  revenueTrend: { date: string; revenue: number; orders: number }[]
  signupsTrend: { date: string; sellers: number; stores: number; customers: number }[]
  topStores: { id: string; name: string; slug: string; logo_url: string | null; revenue: number; orders_count: number }[]
  recentOrders: { id: string; order_number: string; customer_name: string; total_amount: number; store_name: string; created_at: string }[]
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/analytics?period=30d')
        ])

        if (!statsRes.ok || !analyticsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const statsData = await statsRes.json()
        const analyticsData = await analyticsRes.json()

        setStats(statsData)
        setAnalytics(analyticsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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
        <h2 className="text-lg font-semibold mb-2">Unable to load dashboard</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground">Monitor StoreForge platform performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStatsCard
          title="Total Stores"
          value={stats?.totalStores || 0}
          description={`${stats?.activeStores || 0} active, ${stats?.draftStores || 0} draft, ${stats?.suspendedStores || 0} suspended`}
          icon={Store}
          iconColor="text-blue-600"
        />
        <AdminStatsCard
          title="Total Sellers"
          value={stats?.totalSellers || 0}
          description={`${stats?.onboardedSellers || 0} completed onboarding`}
          icon={Users}
          iconColor="text-green-600"
        />
        <AdminStatsCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          description={`${stats?.todayOrders || 0} today`}
          icon={ShoppingCart}
          iconColor="text-purple-600"
        />
        <AdminStatsCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0, 'INR')}
          description={`${formatCurrency(stats?.todayRevenue || 0, 'INR')} today`}
          icon={DollarSign}
          iconColor="text-red-600"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Platform revenue over the last 30 days</CardDescription>
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
      </div>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Stores */}
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
                {analytics.topStores.slice(0, 5).map((store, index) => (
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

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders across all stores</CardDescription>
            </div>
            <Link
              href="/admin/orders"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {!analytics?.recentOrders?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.customer_name} - {order.store_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {formatCurrency(order.total_amount, 'INR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM dd, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
