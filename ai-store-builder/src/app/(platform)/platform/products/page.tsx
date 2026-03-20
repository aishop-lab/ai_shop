'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Package,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentBadge } from '@/components/platform/shared/agent-badge'
import type { AgentType } from '@/lib/agents/types'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface MockProduct {
  id: string
  title: string
  price: number
  status: 'active' | 'draft'
  inventory: number
  category: string
  image: null
  created_at: string
}

const MOCK_PRODUCTS: MockProduct[] = [
  { id: '1',  title: 'Handmade Silver Jhumka Earrings',  price: 1299, status: 'active', inventory: 45,  category: 'Jewelry',     image: null, created_at: '2026-03-10' },
  { id: '2',  title: 'Organic Turmeric Face Cream',      price: 599,  status: 'active', inventory: 120, category: 'Skincare',    image: null, created_at: '2026-03-08' },
  { id: '3',  title: 'Block Print Cotton Kurta - Blue',  price: 1899, status: 'active', inventory: 8,   category: 'Clothing',    image: null, created_at: '2026-03-05' },
  { id: '4',  title: 'Brass Diya Set (Pack of 4)',       price: 449,  status: 'draft',  inventory: 200, category: 'Home Decor',  image: null, created_at: '2026-03-01' },
  { id: '5',  title: 'Darjeeling First Flush Tea - 100g',price: 799,  status: 'active', inventory: 0,   category: 'Food',        image: null, created_at: '2026-02-28' },
  { id: '6',  title: 'Embroidered Silk Clutch',          price: 2499, status: 'active', inventory: 23,  category: 'Accessories', image: null, created_at: '2026-02-25' },
  { id: '7',  title: 'Ayurvedic Hair Oil - 200ml',       price: 349,  status: 'active', inventory: 89,  category: 'Haircare',   image: null, created_at: '2026-02-20' },
  { id: '8',  title: 'Marble Coaster Set',               price: 999,  status: 'draft',  inventory: 34,  category: 'Home Decor',  image: null, created_at: '2026-02-15' },
  { id: '9',  title: 'Handloom Pashmina Shawl',          price: 4999, status: 'active', inventory: 5,   category: 'Clothing',    image: null, created_at: '2026-02-10' },
  { id: '10', title: 'Rose Water Toner Spray',           price: 299,  status: 'active', inventory: 156, category: 'Skincare',    image: null, created_at: '2026-02-05' },
]

// ---------------------------------------------------------------------------
// Agent insights
// ---------------------------------------------------------------------------

interface AgentInsight {
  id: string
  agentType: AgentType
  message: string
  action: string
}

const AGENT_INSIGHTS: AgentInsight[] = [
  {
    id: 'i1',
    agentType: 'technical',
    message: '3 products are missing meta descriptions and will have reduced search visibility.',
    action: 'Auto-fix SEO →',
  },
  {
    id: 'i2',
    agentType: 'sales',
    message: '"Darjeeling First Flush Tea" is out of stock — 12 customers searched for it this week.',
    action: 'Notify me when restocked →',
  },
  {
    id: 'i3',
    agentType: 'analytics',
    message: '"Silver Jhumka Earrings" is your top performer — 23 units sold this month.',
    action: 'View full report →',
  },
]

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

const UNIQUE_CATEGORIES = Array.from(new Set(MOCK_PRODUCTS.map((p) => p.category))).sort()

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [insightsOpen, setInsightsOpen] = useState(true)

  const filtered = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [search, statusFilter, categoryFilter])

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
            {MOCK_PRODUCTS.length} products in your catalog
          </p>
        </div>
        <Link
          href="/platform/products/new"
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
      {/* Agent Insights Panel                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] overflow-hidden">
        {/* Panel header — toggle */}
        <button
          type="button"
          onClick={() => setInsightsOpen((v) => !v)}
          className={cn(
            'flex w-full items-center justify-between px-4 py-3',
            'text-left transition-colors hover:bg-[var(--platform-surface-hover)]',
          )}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-[var(--platform-accent)]" />
            <span className="text-xs font-medium text-[var(--platform-text-primary)]">
              Agent Insights
            </span>
            <span className="inline-flex items-center rounded-full bg-[var(--platform-accent)]/10 px-1.5 py-px font-mono text-[10px] text-[var(--platform-accent)]">
              {AGENT_INSIGHTS.length}
            </span>
          </div>
          {insightsOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
          )}
        </button>

        {/* Insight cards */}
        {insightsOpen && (
          <div className="grid gap-px border-t border-[var(--platform-border)] bg-[var(--platform-border)] sm:grid-cols-3">
            {AGENT_INSIGHTS.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
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
            ...UNIQUE_CATEGORIES.map((c) => ({ value: c, label: c })),
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
          {filtered.length} of {MOCK_PRODUCTS.length} products
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface InsightCardProps {
  insight: AgentInsight
}

function InsightCard({ insight }: InsightCardProps) {
  return (
    <div className="bg-[var(--platform-surface)] px-4 py-3 hover:bg-[var(--platform-surface-hover)] transition-colors">
      <div className="mb-2">
        <AgentBadge agentType={insight.agentType} size="sm" />
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--platform-text-secondary)]">
        {insight.message}
      </p>
      <button
        type="button"
        className="mt-2 font-mono text-[10px] text-[var(--platform-accent)] hover:underline transition-colors"
      >
        {insight.action}
      </button>
    </div>
  )
}

interface ProductRowProps {
  product: MockProduct
}

function ProductRow({ product }: ProductRowProps) {
  const isOutOfStock = product.inventory === 0
  const isLowStock = !isOutOfStock && product.inventory < LOW_STOCK_THRESHOLD

  return (
    <Link href={`/platform/products/${product.id}`} className="contents">
      <tr
        className={cn(
          'cursor-pointer transition-colors',
          'hover:bg-[var(--platform-surface-hover)]',
        )}
      >
        {/* Product */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Placeholder image */}
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[var(--platform-border)] bg-[var(--platform-surface)]">
              <Package className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
            </div>
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
