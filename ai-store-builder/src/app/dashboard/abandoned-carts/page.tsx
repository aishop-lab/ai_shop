'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Mail, ShoppingCart, TrendingUp, Clock, CheckCircle, XCircle, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface CartItem {
  product_id: string
  variant_id?: string
  title: string
  variant_title?: string
  price: number
  quantity: number
  image_url?: string
}

interface AbandonedCart {
  id: string
  store_id: string
  customer_id?: string
  email?: string
  phone?: string
  items: CartItem[]
  subtotal: number
  item_count: number
  recovery_status: 'active' | 'recovered' | 'expired' | 'unsubscribed'
  recovery_emails_sent: number
  last_email_sent_at?: string
  recovered_at?: string
  recovery_token: string
  created_at: string
  updated_at: string
  abandoned_at?: string
}

interface AbandonedCartsResponse {
  carts: AbandonedCart[]
  total: number
  stats: {
    active: number
    recovered: number
    expired: number
    total_value: number
    recovery_rate: number
  }
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [stats, setStats] = useState({
    active: 0,
    recovered: 0,
    expired: 0,
    total_value: 0,
    recovery_rate: 0,
  })
  const [storeId, setStoreId] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)

  // Fetch store ID on mount
  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) {
            setStoreId(data.store.id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch store:', error)
      }
    }
    fetchStore()
  }, [])

  const fetchCarts = useCallback(async () => {
    if (!storeId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        store_id: storeId,
      })

      if (status !== 'all') params.append('status', status)
      if (search) params.append('search', search)

      const response = await fetch(`/api/dashboard/abandoned-carts?${params}`)
      const data: AbandonedCartsResponse = await response.json()

      setCarts(data.carts || [])
      setStats(data.stats || {
        active: 0,
        recovered: 0,
        expired: 0,
        total_value: 0,
        recovery_rate: 0,
      })
    } catch (error) {
      console.error('Failed to fetch abandoned carts:', error)
    } finally {
      setLoading(false)
    }
  }, [storeId, status, search])

  useEffect(() => {
    fetchCarts()
  }, [fetchCarts])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Search handled by fetchCarts
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleSendRecoveryEmail = async (cartId: string) => {
    setSendingEmail(cartId)
    try {
      const response = await fetch('/api/dashboard/abandoned-carts/send-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_id: cartId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Recovery email sent successfully')
        fetchCarts() // Refresh to show updated email count
      } else {
        toast.error(data.error || 'Failed to send recovery email')
      }
    } catch (error) {
      toast.error('Failed to send recovery email')
    } finally {
      setSendingEmail(null)
    }
  }

  const getStatusBadge = (cartStatus: string) => {
    switch (cartStatus) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Active
          </span>
        )
      case 'recovered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Recovered
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3" />
            Expired
          </span>
        )
      case 'unsubscribed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Unsubscribed
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Abandoned Carts</h1>
          <p className="text-muted-foreground">Recover lost sales with email reminders</p>
        </div>
        <Button variant="outline" onClick={fetchCarts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm">Active Carts</span>
          </div>
          <p className="text-2xl font-bold">{stats.active}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(stats.total_value, 'INR')} potential
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm">Recovered</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.recovered}</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Expired</span>
          </div>
          <p className="text-2xl font-bold text-gray-500">{stats.expired}</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm">Recovery Rate</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.recovery_rate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status tabs */}
      <Tabs value={status} onValueChange={(v) => setStatus(v)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="recovered">Recovered</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Carts List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : carts.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No abandoned carts found</p>
          {search && (
            <p className="text-sm text-muted-foreground mt-1">
              Try a different search term
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {carts.map((cart) => (
            <div key={cart.id} className="bg-card border rounded-lg p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium">{cart.email || 'No email'}</span>
                    {getStatusBadge(cart.recovery_status)}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{cart.item_count} item{cart.item_count !== 1 ? 's' : ''}</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(cart.subtotal, 'INR')}
                    </span>
                    <span>
                      Abandoned {formatDistanceToNow(new Date(cart.abandoned_at || cart.created_at), { addSuffix: true })}
                    </span>
                    {cart.recovery_emails_sent > 0 && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {cart.recovery_emails_sent} email{cart.recovery_emails_sent !== 1 ? 's' : ''} sent
                      </span>
                    )}
                  </div>

                  {/* Cart items preview */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cart.items.slice(0, 3).map((item, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-muted rounded text-xs"
                      >
                        {item.quantity}x {item.title.slice(0, 20)}{item.title.length > 20 ? '...' : ''}
                      </span>
                    ))}
                    {cart.items.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 bg-muted rounded text-xs">
                        +{cart.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {cart.recovery_status === 'active' && cart.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendRecoveryEmail(cart.id)}
                      disabled={sendingEmail === cart.id}
                    >
                      {sendingEmail === cart.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Send Reminder
                        </>
                      )}
                    </Button>
                  )}

                  {cart.recovery_status === 'recovered' && cart.recovered_at && (
                    <span className="text-xs text-green-600">
                      Recovered {format(new Date(cart.recovered_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
