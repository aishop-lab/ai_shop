'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react'

interface Customer {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  total_orders: number
  total_spent: number
  last_order_at: string | null
  marketing_consent: boolean
  created_at: string
}

interface Segments {
  all: number
  active: number
  at_risk: number
  churned: number
  new: number
}

const SEGMENT_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'churned', label: 'Churned' },
  { value: 'new', label: 'New' },
]

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [segments, setSegments] = useState<Segments>({ all: 0, active: 0, at_risk: 0, churned: 0, new: 0 })
  const [storeId, setStoreId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetch('/api/dashboard/settings')
      .then(res => res.json())
      .then(data => { if (data.store?.id) setStoreId(data.store.id) })
      .catch(() => {})
  }, [])

  const fetchCustomers = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        store_id: storeId,
        page: page.toString(),
        limit: '20',
        segment,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/dashboard/customers?${params}`)
      const data = await res.json()
      setCustomers(data.customers || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      setSegments(data.segments || segments)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [storeId, page, segment, search, sortBy, sortOrder])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchCustomers() }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'

  const getSegmentBadge = (customer: Customer) => {
    const now = Date.now()
    const lastOrder = customer.last_order_at ? new Date(customer.last_order_at).getTime() : 0
    const daysSince = lastOrder ? (now - lastOrder) / (1000 * 60 * 60 * 24) : Infinity

    if (customer.total_orders <= 1) return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">New</span>
    if (daysSince <= 30) return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">Active</span>
    if (daysSince <= 90) return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">At Risk</span>
    return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">Churned</span>
  }

  const handleExport = async () => {
    if (!storeId) return
    window.open(`/api/dashboard/customers/export?store_id=${storeId}`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-zinc-400 mt-1">{total} customers across all segments</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Segment Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
        {SEGMENT_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setSegment(tab.value); setPage(1) }}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              segment === tab.value
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-zinc-500">
              {segments[tab.value as keyof Segments]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Users className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium text-zinc-400">No customers found</p>
          <p className="text-sm">Customers will appear here when they create accounts on your store.</p>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Orders</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Spent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase hidden lg:table-cell">Last Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase hidden sm:table-cell">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {customers.map(customer => (
                <tr
                  key={customer.id}
                  onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                  className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{customer.full_name || 'No name'}</p>
                      <p className="text-xs text-zinc-500">{customer.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400 hidden md:table-cell">{customer.phone || '\u2014'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{customer.total_orders}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{formatCurrency(customer.total_spent)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400 hidden lg:table-cell">{formatDate(customer.last_order_at)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{getSegmentBadge(customer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {page} of {totalPages} ({total} customers)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
