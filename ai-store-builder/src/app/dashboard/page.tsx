'use client'

import { useEffect, useState } from 'react'
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
  BarChart3
} from 'lucide-react'
import { WelcomeBanner } from '@/components/dashboard/welcome-banner'
import { StoreStatusCard } from '@/components/dashboard/store-status-card'
import { AISuggestionsWidget } from '@/components/dashboard/ai-suggestions-widget'
import { TrafficWidget } from '@/components/dashboard/traffic-widget'

interface StoreBlueprint {
  identity?: {
    business_category?: string[]
  }
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
  } | null
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const isFirstVisit = searchParams.get('welcome') === 'true'

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const hasStore = stats?.store !== null
  const storeCategory = stats?.store?.blueprint?.identity?.business_category || []

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
        {hasStore && (
          <Link href="/dashboard/products/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
        )}
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
                      <div className="text-2xl font-bold">₹0</div>
                      <p className="text-xs text-muted-foreground">Start selling to see revenue</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}

          {/* AI Suggestions Widget + Traffic Widget */}
          {hasStore && (
            <div className="grid gap-6 lg:grid-cols-2">
              {storeCategory.length > 0 && (
                <AISuggestionsWidget
                  storeCategory={storeCategory}
                  productCount={stats?.productCount || 0}
                />
              )}
              <TrafficWidget
                storeSlug={stats?.store?.slug}
                ga4Connected={false}
              />
            </div>
          )}

          {/* Getting Started + Quick Actions (side by side) */}
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
                            ? 'bg-green-100 text-green-600'
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
                          className={`text-sm font-medium ${
                            step.completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
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
                      <div className="p-2.5 rounded-lg bg-blue-100">
                        <Plus className="h-5 w-5 text-blue-600" />
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
                      <div className="p-2.5 rounded-lg bg-purple-100">
                        <ShoppingCart className="h-5 w-5 text-purple-600" />
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
                      <div className="p-2.5 rounded-lg bg-green-100">
                        <BarChart3 className="h-5 w-5 text-green-600" />
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
        </>
      )}
    </div>
  )
}
