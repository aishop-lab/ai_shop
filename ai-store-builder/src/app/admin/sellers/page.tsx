'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminDataTable } from '@/components/admin/admin-data-table'
import { format } from 'date-fns'
import type { SellerDetails } from '@/lib/admin/queries'

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<SellerDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchSellers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      })

      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/sellers?${params}`)
      const data = await response.json()

      setSellers(data.sellers || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch sellers:', error)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchSellers()
  }, [fetchSellers])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const columns = [
    {
      key: 'seller',
      header: 'Seller',
      render: (seller: SellerDetails) => (
        <div>
          <p className="font-medium text-sm">{seller.full_name}</p>
          <p className="text-xs text-muted-foreground">{seller.email}</p>
        </div>
      )
    },
    {
      key: 'store',
      header: 'Store',
      render: (seller: SellerDetails) => (
        seller.store_name ? (
          <div>
            <Link
              href={`/admin/stores`}
              className="font-medium text-sm hover:text-primary hover:underline"
            >
              {seller.store_name}
            </Link>
            {seller.store_status && (
              <Badge
                variant="secondary"
                className={`ml-2 text-xs ${
                  seller.store_status === 'active' ? 'bg-green-100 text-green-800' :
                  seller.store_status === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}
              >
                {seller.store_status}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No store</span>
        )
      )
    },
    {
      key: 'signup',
      header: 'Signup Date',
      hideOnMobile: true,
      render: (seller: SellerDetails) => (
        <span className="text-sm">
          {format(new Date(seller.created_at), 'MMM dd, yyyy')}
        </span>
      )
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      hideOnMobile: true,
      render: (seller: SellerDetails) => (
        <span className="text-sm text-muted-foreground">
          {seller.last_login_at
            ? format(new Date(seller.last_login_at), 'MMM dd, yyyy')
            : 'Never'}
        </span>
      )
    },
    {
      key: 'logins',
      header: 'Logins',
      hideOnMobile: true,
      render: (seller: SellerDetails) => (
        <span className="text-sm">{seller.login_count}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (seller: SellerDetails) => (
        <Badge
          variant="secondary"
          className={seller.onboarding_completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
        >
          {seller.onboarding_completed ? 'Completed' : 'Onboarding'}
        </Badge>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sellers</h1>
          <p className="text-muted-foreground">
            {total} total sellers on the platform
          </p>
        </div>
        <Button variant="outline" onClick={fetchSellers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sellers by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <AdminDataTable
        columns={columns}
        data={sellers}
        keyExtractor={(seller) => seller.id}
        isLoading={loading}
        emptyMessage="No sellers found"
        emptyDescription={search ? 'Try a different search term' : undefined}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
