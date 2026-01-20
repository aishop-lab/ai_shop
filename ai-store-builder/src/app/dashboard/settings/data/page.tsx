'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Download,
  Loader2,
  Database,
  FileText,
  Shield,
  CheckCircle2,
  Users,
  ShoppingCart,
  Package,
  BarChart3
} from 'lucide-react'

interface StoreInfo {
  slug: string
  name: string
}

export default function DataExportPage() {
  const [exporting, setExporting] = useState(false)
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store) {
            setStore({ slug: data.store.slug, name: data.store.name })
          }
        }
      } catch (error) {
        console.error('Failed to fetch store:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStore()
  }, [])

  const handleExport = async () => {
    if (!store) return

    setExporting(true)
    toast.info('Preparing your data export...', { duration: 5000 })

    try {
      const response = await fetch('/api/dashboard/export-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      a.download = `${store.slug}_data_${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Data exported successfully!')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Data & Privacy</h1>
          <p className="text-muted-foreground mt-1">
            Export your data and manage privacy settings
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Export All Data
            </CardTitle>
            <CardDescription>
              Download a complete copy of your store data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                You own all your data. Export everything anytime. No lock-in, ever.
                Use this to migrate to another platform, create backups, or analyze your business.
              </p>
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting || !store}
              className="w-full"
              size="lg"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Export...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download All Data
                </>
              )}
            </Button>

            <div className="space-y-3">
              <p className="text-sm font-medium">Export includes:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Customer data</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Order history</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>Product catalog</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics data</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t text-sm text-muted-foreground">
              <p>Export format: <code className="bg-muted px-1.5 py-0.5 rounded">.zip</code></p>
              <p className="mt-1">Contains: CSV files + JSON configuration</p>
            </div>
          </CardContent>
        </Card>

        {/* Data Ownership */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data Ownership
            </CardTitle>
            <CardDescription>
              Your data belongs to you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Full Data Portability</p>
                  <p className="text-sm text-muted-foreground">
                    Export all your data in standard formats (CSV, JSON)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">No Vendor Lock-in</p>
                  <p className="text-sm text-muted-foreground">
                    Migrate to any platform anytime with your complete data
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">GDPR Compliant</p>
                  <p className="text-sm text-muted-foreground">
                    Meet data protection requirements with easy exports
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Unlimited Exports</p>
                  <p className="text-sm text-muted-foreground">
                    Export your data as many times as you need
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Included */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Contents
            </CardTitle>
            <CardDescription>
              What's included in your data export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">customers.csv</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Name, email, phone</li>
                  <li>Shipping addresses</li>
                  <li>Order count & total spent</li>
                  <li>First & last order dates</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-green-500" />
                  <span className="font-medium">orders.csv</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Order numbers & dates</li>
                  <li>Customer & shipping info</li>
                  <li>Items, totals, discounts</li>
                  <li>Payment & delivery status</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">products.csv</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Titles & descriptions</li>
                  <li>Pricing & inventory</li>
                  <li>Categories & tags</li>
                  <li>Image URLs</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">analytics.json</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Revenue summary</li>
                  <li>Daily sales data</li>
                  <li>Top selling products</li>
                  <li>Order statistics</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">settings.json</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Store configuration</li>
                  <li>Branding & colors</li>
                  <li>Shipping settings</li>
                  <li>Marketing pixels</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">README.txt</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>File descriptions</li>
                  <li>Data format guide</li>
                  <li>Import instructions</li>
                  <li>Support information</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
