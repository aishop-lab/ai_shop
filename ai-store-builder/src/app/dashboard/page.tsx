'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Package,
  ShoppingCart,
  DollarSign,
  Plus,
  ArrowRight,
  CheckCircle2,
  Loader2,
  BarChart3,
  RefreshCw,
  Brain,
  Activity,
  ShieldCheck,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useStoreCurrency } from '@/lib/hooks/use-store-currency'
import { WelcomeBanner } from '@/components/dashboard/welcome-banner'
import { StoreStatusCard } from '@/components/dashboard/store-status-card'
import { AISuggestionsWidget } from '@/components/dashboard/ai-suggestions-widget'
import { TrafficWidget } from '@/components/dashboard/traffic-widget'
import { InsightsFeed } from '@/components/dashboard/insights-feed'
import { PendingApprovals } from '@/components/dashboard/pending-approvals'
import { AgentActivity } from '@/components/dashboard/agent-activity'

interface StoreBlueprint {
  identity?: {
    business_category?: string[]
  }
}

interface MarketingPixels {
  google_analytics_id?: string | null
  facebook_pixel_id?: string | null
}

interface DashboardStats {
  productCount: number
  publishedCount: number
  draftCount: number
  store: {
    id: string
    name: string
    slug: string
    status: string
    logo_url: string | null
    blueprint?: StoreBlueprint
    marketing_pixels?: MarketingPixels | null
  } | null
}

interface InsightData {
  id: string
  agent_type: string
  action_type: string
  action_category: string
  summary: string
  details: Record<string, unknown>
  created_at: string
}

interface ApprovalData {
  id: string
  agent_type: string
  action_type: string
  summary: string
  reasoning: string | null
  details: Record<string, unknown>
  priority: string
  expires_at: string | null
  created_at: string
}

interface ActivityData {
  id: string
  agent_type: string
  action_type: string
  summary: string
  status: string
  execution_mode: string | null
  created_at: string
  duration_ms: number | null
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<InsightData[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalData[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityData[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { currency } = useStoreCurrency()
  const isFirstVisit = searchParams.get('welcome') === 'true'

  const fetchInsights = useCallback(async (storeId: string) => {
    try {
      setInsightsLoading(true)
      const response = await fetch(`/api/dashboard/insights?store_id=${storeId}`)
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights || [])
        setPendingApprovals(data.pendingApprovals || [])
        setRecentActivity(data.recentActivity || [])
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
          // Fetch insights once we have the store ID
          if (data.store?.id) {
            fetchInsights(data.store.id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [fetchInsights])

  // Auto-refresh insights every 60 seconds
  useEffect(() => {
    if (!stats?.store?.id) return
    const interval = setInterval(() => {
      fetchInsights(stats.store!.id)
    }, 60_000)
    return () => clearInterval(interval)
  }, [stats?.store?.id, fetchInsights])

  const handleRefresh = async () => {
    if (!stats?.store?.id || refreshing) return
    setRefreshing(true)
    await fetchInsights(stats.store.id)
    setRefreshing(false)
  }

  const handleApprovalResolve = async (id: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/dashboard/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (response.ok) {
        // Remove from local state
        setPendingApprovals(prev => prev.filter(a => a.id !== id))
      }
    } catch (error) {
      console.error('Failed to resolve approval:', error)
    }
  }

  const hasStore = stats?.store !== null
  const storeCategory = stats?.store?.blueprint?.identity?.business_category || []
  const isNewStore = (stats?.productCount || 0) === 0

  // Calculate completion steps
  const steps = [
    {
      id: 'store',
      title: 'Create your store',
      description: 'Set up your store with AI assistance',
      completed: hasStore,
      href: '/onboarding',
      buttonText: 'Create Store'
    },
    {
      id: 'products',
      title: 'Add your first product',
      description: 'Upload images and let AI help with descriptions',
      completed: (stats?.productCount || 0) > 0,
      href: '/dashboard/products/new',
      buttonText: 'Add Product'
    },
    {
      id: 'publish',
      title: 'Publish a product',
      description: 'Make products visible to customers',
      completed: (stats?.publishedCount || 0) > 0,
      href: '/dashboard/products',
      buttonText: 'View Products'
    },
    {
      id: 'payments',
      title: 'Set up payments',
      description: 'Connect your payment provider',
      completed: false,
      href: '/dashboard/settings',
      buttonText: 'Configure',
      disabled: false
    }
  ]

  const completedSteps = steps.filter(s => s.completed).length

  return (
    <div className="space-y-6">
      {/* Welcome Banner (only on first visit after onboarding) */}
      {hasStore && stats?.store && (
        <WelcomeBanner
          storeName={stats.store.name}
          storeSlug={stats.store.slug}
          isFirstVisit={isFirstVisit}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {hasStore ? 'Home' : 'Welcome'}
            {profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {hasStore
              ? "Here's what's happening with your store"
              : "Let's get your store set up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasStore && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          {hasStore && (
            <Link href="/dashboard/products/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Store Status Card + Quick Stats (side by side on larger screens) */}
          {hasStore && stats?.store && (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Store Card - takes 1 column */}
              <div className="lg:col-span-1">
                <StoreStatusCard store={stats.store} />
              </div>

              {/* Quick Stats - takes 2 columns */}
              <div className="lg:col-span-2 grid gap-4 sm:grid-cols-3">
                <Link href="/dashboard/products" className="block">
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Products</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.productCount || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.publishedCount || 0} published, {stats?.draftCount || 0} drafts
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/dashboard/orders" className="block">
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Orders</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">No orders yet</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/dashboard/analytics" className="block">
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(0, currency)}</div>
                      <p className="text-xs text-muted-foreground">Start selling to see revenue</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}

          {/* Pending Approvals (only when there are pending approvals) */}
          {hasStore && pendingApprovals.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-orange-400" />
                  <div>
                    <CardTitle className="text-lg">Pending Approvals</CardTitle>
                    <CardDescription>
                      {pendingApprovals.length} action{pendingApprovals.length !== 1 ? 's' : ''} waiting for your review
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PendingApprovals
                  approvals={pendingApprovals}
                  onResolve={handleApprovalResolve}
                />
              </CardContent>
            </Card>
          )}

          {/* Insights Feed + Agent Activity (side by side) */}
          {hasStore && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    <div>
                      <CardTitle className="text-lg">Agent Insights</CardTitle>
                      <CardDescription>
                        Findings and recommendations from your AI agents
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {insightsLoading && insights.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    </div>
                  ) : (
                    <InsightsFeed insights={insights} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-cyan-400" />
                    <div>
                      <CardTitle className="text-lg">Agent Activity</CardTitle>
                      <CardDescription>
                        Recent actions taken by your AI agents (last 24h)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {insightsLoading && recentActivity.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    </div>
                  ) : (
                    <AgentActivity activities={recentActivity} />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* AI Suggestions Widget + Traffic Widget */}
          {hasStore && (
            <div className="grid gap-6 lg:grid-cols-2">
              <AISuggestionsWidget
                storeCategory={storeCategory}
                productCount={stats?.productCount || 0}
              />
              <TrafficWidget
                storeSlug={stats?.store?.slug}
                ga4Connected={!!stats?.store?.marketing_pixels?.google_analytics_id}
              />
            </div>
          )}

          {/* Getting Started + Quick Actions (only for new stores) */}
          {isNewStore && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Getting Started Checklist */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Getting Started</CardTitle>
                      <CardDescription>
                        Complete these steps to launch your store
                      </CardDescription>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {completedSteps}/{steps.length}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(completedSteps / steps.length) * 100}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                            step.completed
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-base font-medium ${
                              step.completed ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {step.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {step.description}
                          </p>
                        </div>
                        {!step.completed && (
                          <Link href={step.href}>
                            <Button variant="outline" size="sm" disabled={step.disabled}>
                              {step.buttonText}
                              {!step.disabled && <ArrowRight className="h-3 w-3 ml-1" />}
                            </Button>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              {hasStore && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                    <CardDescription>
                      Common tasks to manage your store
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/dashboard/products/new" className="block">
                      <div className="flex items-center gap-4 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="p-2.5 rounded-lg bg-blue-500/15">
                          <Plus className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">Add Product</h3>
                          <p className="text-xs text-muted-foreground">
                            Upload images and let AI generate details
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>

                    <Link href="/dashboard/orders" className="block">
                      <div className="flex items-center gap-4 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="p-2.5 rounded-lg bg-purple-500/15">
                          <ShoppingCart className="h-5 w-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">View Orders</h3>
                          <p className="text-xs text-muted-foreground">
                            Manage and fulfill customer orders
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>

                    <Link href="/dashboard/analytics" className="block">
                      <div className="flex items-center gap-4 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="p-2.5 rounded-lg bg-emerald-500/15">
                          <BarChart3 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">View Analytics</h3>
                          <p className="text-xs text-muted-foreground">
                            Track sales, revenue, and performance
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
