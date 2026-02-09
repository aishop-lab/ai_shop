'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminStatsCard } from '@/components/admin/admin-stats-card'
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  ExternalLink,
  Ban,
  CheckCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { StoreWithDetails } from '@/lib/admin/queries'

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
    case 'draft':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Draft</Badge>
    case 'suspended':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Suspended</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface StoreDetailData {
  store: StoreWithDetails
  recentOrders: {
    id: string
    order_number: string
    customer_name: string
    customer_email: string
    total_amount: number
    payment_status: string
    order_status: string
    created_at: string
  }[]
  customersCount: number
}

export default function AdminStoreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = params.storeId as string

  const [data, setData] = useState<StoreDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch(`/api/admin/stores/${storeId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Store not found')
          } else {
            throw new Error('Failed to fetch store')
          }
          return
        }
        const storeData = await response.json()
        setData(storeData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load store')
      } finally {
        setLoading(false)
      }
    }
    fetchStore()
  }, [storeId])

  const handleStatusChange = async (newStatus: 'active' | 'suspended') => {
    if (!data) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update store status')
      }

      setData({
        ...data,
        store: { ...data.store, status: newStatus }
      })

      toast.success(`Store ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update store')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Unable to load store</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/admin/stores')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stores
        </Button>
      </div>
    )
  }

  const { store, recentOrders, customersCount } = data
  const storeUrl = `https://${store.slug}.storeforge.site`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/stores')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <Image
                src={store.logo_url}
                alt={store.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
                {store.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{store.name}</h1>
                {getStatusBadge(store.status)}
              </div>
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                {storeUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {store.status === 'active' ? (
            <Button
              variant="destructive"
              onClick={() => handleStatusChange('suspended')}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Suspend Store
            </Button>
          ) : store.status === 'suspended' ? (
            <Button
              onClick={() => handleStatusChange('active')}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Activate Store
            </Button>
          ) : null}
        </div>
      </div>

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Owner</p>
            <p className="font-medium">{store.owner_name}</p>
            <p className="text-sm text-muted-foreground">{store.owner_email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">
              {format(new Date(store.created_at), 'PPP')}
            </p>
          </div>
          {store.activated_at && (
            <div>
              <p className="text-sm text-muted-foreground">Activated</p>
              <p className="font-medium">
                {format(new Date(store.activated_at), 'PPP')}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            {getStatusBadge(store.status)}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStatsCard
          title="Products"
          value={store.products_count}
          icon={Package}
          iconColor="text-blue-600"
        />
        <AdminStatsCard
          title="Orders"
          value={store.orders_count}
          icon={ShoppingCart}
          iconColor="text-purple-600"
        />
        <AdminStatsCard
          title="Revenue"
          value={formatCurrency(store.revenue, 'INR')}
          icon={DollarSign}
          iconColor="text-green-600"
        />
        <AdminStatsCard
          title="Customers"
          value={customersCount}
          icon={Users}
          iconColor="text-orange-600"
        />
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest orders from this store</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Order</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Customer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-medium">#{order.order_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(order.total_amount, 'INR')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="capitalize">
                          {order.order_status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
