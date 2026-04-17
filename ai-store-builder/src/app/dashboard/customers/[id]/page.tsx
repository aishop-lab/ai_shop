'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, MapPin, ShoppingBag, Heart,
  Star, TrendingUp, Package, CreditCard,
} from 'lucide-react'

interface CustomerDetail {
  customer: any
  orders: any[]
  addresses: any[]
  wishlist: any[]
  loyalty: any
  stats: {
    totalOrders: number
    totalSpent: number
    avgOrderValue: number
    loyaltyPoints: number
    loyaltyTier: string
  }
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/settings')
      .then(res => res.json())
      .then(d => { if (d.store?.id) setStoreId(d.store.id) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!storeId || !id) return
    setLoading(true)
    fetch(`/api/dashboard/customers/${id}?store_id=${storeId}`)
      .then(res => res.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [storeId, id])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      delivered: 'text-green-400 bg-green-500/20',
      shipped: 'text-blue-400 bg-blue-500/20',
      processing: 'text-yellow-400 bg-yellow-500/20',
      cancelled: 'text-red-400 bg-red-500/20',
      unfulfilled: 'text-zinc-400 bg-zinc-500/20',
    }
    return colors[status] || 'text-zinc-400 bg-zinc-500/20'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p>Customer not found</p>
      </div>
    )
  }

  const { customer, orders, addresses, wishlist, stats, loyalty } = data

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/customers')}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </button>

      {/* Profile header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{customer.full_name || 'No name'}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{customer.email}</span>
              {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.phone}</span>}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Customer since {formatDate(customer.created_at)}</p>
          </div>
          {stats.loyaltyTier !== 'none' && (
            <span className="px-3 py-1 text-sm rounded-full bg-amber-500/20 text-amber-400 capitalize">
              <Star className="h-3.5 w-3.5 inline mr-1" />{stats.loyaltyTier}
            </span>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.totalOrders, icon: Package },
          { label: 'Lifetime Value', value: formatCurrency(stats.totalSpent), icon: TrendingUp },
          { label: 'Avg Order Value', value: formatCurrency(stats.avgOrderValue), icon: CreditCard },
          { label: 'Loyalty Points', value: stats.loyaltyPoints.toLocaleString(), icon: Star },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <stat.icon className="h-4 w-4" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="text-lg font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Order History ({orders.length})
          </h2>
        </div>
        {orders.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No orders yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Order</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Date</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Amount</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {orders.map((order: any) => (
                <tr
                  key={order.id}
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                  className="hover:bg-zinc-800/50 cursor-pointer"
                >
                  <td className="px-4 py-2.5 text-sm text-zinc-300">#{order.order_number}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-400">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(order.order_status)}`}>
                      {order.order_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Addresses and Wishlist side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Addresses */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Addresses ({addresses.length})
            </h2>
          </div>
          {addresses.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No saved addresses</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {addresses.map((addr: any) => (
                <div key={addr.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-zinc-300">{addr.label || 'Address'}</span>
                    {addr.is_default && <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Default</span>}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {[addr.address_line1, addr.address_line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wishlist */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Wishlist ({wishlist.length})
            </h2>
          </div>
          {wishlist.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No wishlist items</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {wishlist.map((item: any) => (
                <div key={item.product_id} className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-500">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-300">{item.products?.title || 'Unknown product'}</p>
                    <p className="text-xs text-zinc-500">{item.products?.price ? formatCurrency(item.products.price) : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
