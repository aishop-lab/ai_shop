'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  Package,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductImage {
  original_url: string
  thumbnail_url: string | null
  position: number
}

interface ProductData {
  id: string
  title: string
  price: number
  status: 'active' | 'draft'
  inventory: number
  category: string
  product_images: ProductImage[]
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const LOW_STOCK_THRESHOLD = 10

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [products, setProducts] = useState<ProductData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)

  // Fetch the merchant's store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.storeId) setStoreId(data.storeId)
        }
      } catch {
        console.error('[Products] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Fetch products from Supabase
  useEffect(() => {
    if (!storeId) return
    async function fetchProducts() {
      try {
        setIsLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from('products')
          .select('id, title, price, status, inventory, category, created_at, product_images(original_url, thumbnail_url, position)')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        setProducts((data as ProductData[]) ?? [])
      } catch (err) {
        console.error('[Products] Failed to fetch products:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [storeId])

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()
  }, [products])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = (p.title ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [search, statusFilter, categoryFilter, products])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Products
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Loading products...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                              */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Products
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            {products.length} products in your catalog
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
            'bg-[var(--platform-accent)] text-white text-xs font-medium',
            'hover:opacity-90 transition-opacity',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </Link>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Filter bar                                                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className={cn(
              'w-full rounded-lg border border-[var(--platform-border)]',
              'bg-[var(--platform-surface)] pl-8 pr-3 py-1.5',
              'font-mono text-xs text-[var(--platform-text-primary)]',
              'placeholder:text-[var(--platform-text-muted)]',
              'outline-none transition-colors',
              'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
            )}
          />
        </div>

        {/* Status filter */}
        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: 'all', label: 'All status' },
            { value: 'active', label: 'Active' },
            { value: 'draft', label: 'Draft' },
          ]}
        />

        {/* Category filter */}
        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { value: 'all', label: 'All categories' },
            ...uniqueCategories.map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Table                                                               */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-[var(--platform-border)] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState hasFilters={search !== '' || statusFilter !== 'all' || categoryFilter !== 'all'} />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--platform-border)] bg-[var(--platform-surface)]">
                <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Product
                </th>
                <th className="px-4 py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Price
                </th>
                <th className="px-4 py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Inventory
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--platform-border)] bg-[var(--platform-bg)]">
              {filtered.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Count footer */}
      {filtered.length > 0 && (
        <p className="text-center font-mono text-[10px] text-[var(--platform-text-muted)]">
          {filtered.length} of {products.length} products
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProductRowProps {
  product: ProductData
}

function ProductRow({ product }: ProductRowProps) {
  const isOutOfStock = product.inventory === 0
  const isLowStock = !isOutOfStock && product.inventory < LOW_STOCK_THRESHOLD
  const sortedImages = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)
  const primaryImage = sortedImages[0]?.thumbnail_url || sortedImages[0]?.original_url || null

  return (
    <Link href={`/dashboard/products/${product.id}`} className="contents">
      <tr
        className={cn(
          'cursor-pointer transition-colors',
          'hover:bg-[var(--platform-surface-hover)]',
        )}
      >
        {/* Product */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Product image or placeholder */}
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt={product.title}
                width={32}
                height={32}
                className="h-8 w-8 flex-shrink-0 rounded-md border border-[var(--platform-border)] object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[var(--platform-border)] bg-[var(--platform-surface)]">
                <Package className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--platform-text-primary)]">
                {product.title}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[var(--platform-text-muted)]">
                {product.category}
              </p>
            </div>
          </div>
        </td>

        {/* Price */}
        <td className="px-4 py-3 text-right">
          <span className="font-mono text-[var(--platform-text-primary)]">
            {formatPrice(product.price)}
          </span>
        </td>

        {/* Inventory */}
        <td className="px-4 py-3 text-right">
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 font-mono text-[10px] text-red-400">
              Out of stock
            </span>
          ) : isLowStock ? (
            <span className="flex items-center justify-end gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span className="font-mono text-amber-400">{product.inventory}</span>
            </span>
          ) : (
            <span className="font-mono text-[var(--platform-text-secondary)]">
              {product.inventory}
            </span>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <StatusBadge status={product.status} />
        </td>

        {/* Created */}
        <td className="px-4 py-3">
          <span className="font-mono text-[var(--platform-text-muted)]">
            {formatDate(product.created_at)}
          </span>
        </td>
      </tr>
    </Link>
  )
}

interface StatusBadgeProps {
  status: 'active' | 'draft'
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
        status === 'active'
          ? 'border-green-500/20 bg-green-500/10 text-green-400'
          : 'border-zinc-600/40 bg-zinc-600/10 text-zinc-400',
      )}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          status === 'active' ? 'bg-green-400' : 'bg-zinc-500',
        )}
      />
      {status === 'active' ? 'Active' : 'Draft'}
    </span>
  )
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

function FilterSelect({ value, onChange, options }: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none rounded-lg border border-[var(--platform-border)]',
          'bg-[var(--platform-surface)] px-3 py-1.5 pr-7',
          'font-mono text-xs text-[var(--platform-text-secondary)]',
          'cursor-pointer outline-none transition-colors',
          'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--platform-text-muted)]" />
    </div>
  )
}

interface EmptyStateProps {
  hasFilters: boolean
}

function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-[var(--platform-surface)]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--platform-surface-hover)]">
        <Package className="h-5 w-5 text-[var(--platform-text-muted)]" />
      </div>
      <p className="font-mono text-sm text-[var(--platform-text-primary)]">
        {hasFilters ? 'No matching products' : 'No products yet'}
      </p>
      <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
        {hasFilters
          ? 'Try adjusting your filters'
          : 'Add your first product to get started'}
      </p>
    </div>
  )
}
