'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import RevenueChart from '@/components/dashboard/revenue-chart'
import TopProductsTable from '@/components/dashboard/top-products-table'
import RecentOrdersTable from '@/components/dashboard/recent-orders-table'
import LowStockAlert from '@/components/dashboard/low-stock-alert'
import type { DashboardAnalytics, AnalyticsPeriod } from '@/lib/types/dashboard'

function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d')
  const [storeId, setStoreId] = useState<string | null>(null)

  // First, fetch store ID
  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) {
            setStoreId(data.store.id)
          } else {
            setError('No store found. Please complete onboarding first.')
            setLoading(false)
          }
        }
      } catch (err) {
        setError('Failed to fetch store information')
        setLoading(false)
      }
    }
    fetchStore()
  }, [])

  // Fetch analytics when store ID or period changes
  useEffect(() => {
    async function fetchAnalytics() {
      if (!storeId) return

      setLoading(true)
      try {
        const response = await fetch(`/api/dashboard/analytics?store_id=${storeId}&period=${period}`)
        if (response.ok) {
          const data = await response.json()
          setAnalytics(data)
        } else {
          setError('Failed to fetch analytics')
        }
      } catch (err) {
        setError('Failed to fetch analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [storeId, period])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your store performance</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
            <TabsTrigger value="1y">1 year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Low Stock Alert */}
      {analytics?.lowStockProducts && analytics.lowStockProducts.length > 0 && (
        <LowStockAlert products={analytics.lowStockProducts} />
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics?.overview.revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {analytics?.overview.paidOrders || 0} paid orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.orders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.overview.pendingOrders || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.products || 0}</div>
            <p className="text-xs text-muted-foreground">Published products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics?.overview.averageOrderValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>
            Daily revenue over the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={analytics?.revenueTrend || []} />
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Products with the most sales</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProductsTable products={analytics?.topSellingProducts || []} />
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from your store</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentOrdersTable orders={analytics?.recentOrders || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
