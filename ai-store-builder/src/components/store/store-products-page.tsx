'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, SlidersHorizontal, Grid, List, X, Package } from 'lucide-react'
import type { Product } from '@/lib/types/store'
import { useStore } from '@/lib/contexts/store-context'
import ProductCard from './themes/modern-minimal/product-card'
import { useState, useEffect, useMemo, useCallback } from 'react'

interface Collection {
  id: string
  title: string
  slug: string
  product_count: number
}

interface StoreProductsPageProps {
  products: Product[]
  pagination: {
    page: number
    totalPages: number
    total: number
  }
  categories: string[]
  currentCategory?: string
  currentSort: string
  currentOrder: string
}

export default function StoreProductsPage({
  products,
  pagination,
  categories,
  currentCategory,
  currentSort,
  currentOrder
}: StoreProductsPageProps) {
  const { store } = useStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [collectionProductIds, setCollectionProductIds] = useState<Set<string> | null>(null)
  const baseUrl = `/${store.slug}`

  // Read filter params from URL
  const priceMinParam = searchParams.get('price_min')
  const priceMaxParam = searchParams.get('price_max')
  const inStockParam = searchParams.get('in_stock')

  // Local state for price inputs (so user can type before applying)
  const [priceMinInput, setPriceMinInput] = useState(priceMinParam || '')
  const [priceMaxInput, setPriceMaxInput] = useState(priceMaxParam || '')

  // Sync local price inputs when URL params change (e.g. badge removal)
  useEffect(() => {
    setPriceMinInput(priceMinParam || '')
  }, [priceMinParam])

  useEffect(() => {
    setPriceMaxInput(priceMaxParam || '')
  }, [priceMaxParam])

  const inStockOnly = inStockParam === 'true'

  // Fetch collections
  useEffect(() => {
    async function fetchCollections() {
      try {
        const res = await fetch(`/api/store/${store.slug}/collections`)
        if (res.ok) {
          const data = await res.json()
          setCollections(data.collections || [])
        }
      } catch (err) {
        console.error('Failed to fetch collections:', err)
      }
    }
    fetchCollections()
  }, [store.slug])

  // Fetch collection products when collection is selected
  useEffect(() => {
    if (!selectedCollection) {
      setCollectionProductIds(null)
      return
    }

    async function fetchCollectionProducts() {
      try {
        const res = await fetch(`/api/store/${store.slug}/collections/${selectedCollection}?limit=200`)
        if (res.ok) {
          const data = await res.json()
          const ids = new Set<string>((data.products || []).map((p: { id: string }) => p.id))
          setCollectionProductIds(ids)
        }
      } catch (err) {
        console.error('Failed to fetch collection products:', err)
        setCollectionProductIds(null)
      }
    }
    fetchCollectionProducts()
  }, [selectedCollection, store.slug])

  // Apply all client-side filters: collection, price range, in-stock
  const displayProducts = useMemo(() => {
    let filtered = products

    // Collection filter
    if (collectionProductIds) {
      filtered = filtered.filter(p => collectionProductIds.has(p.id))
    }

    // Price range filter
    const minPrice = priceMinParam ? parseFloat(priceMinParam) : null
    const maxPrice = priceMaxParam ? parseFloat(priceMaxParam) : null
    if (minPrice !== null && !isNaN(minPrice)) {
      filtered = filtered.filter(p => p.price >= minPrice)
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      filtered = filtered.filter(p => p.price <= maxPrice)
    }

    // In-stock filter
    if (inStockOnly) {
      filtered = filtered.filter(p => p.quantity > 0)
    }

    return filtered
  }, [products, collectionProductIds, priceMinParam, priceMaxParam, inStockOnly])

  const updateFilters = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset to page 1 when filters change
    router.push(`${baseUrl}/products?${params.toString()}`)
  }, [searchParams, router, baseUrl])

  const updateMultipleFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    params.delete('page')
    router.push(`${baseUrl}/products?${params.toString()}`)
  }, [searchParams, router, baseUrl])

  const clearAllFilters = useCallback(() => {
    setSelectedCollection('')
    router.push(`${baseUrl}/products`)
  }, [router, baseUrl])

  const goToPage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`${baseUrl}/products?${params.toString()}`)
  }, [searchParams, router, baseUrl])

  const applyPriceRange = useCallback(() => {
    const updates: Record<string, string | null> = {}
    updates['price_min'] = priceMinInput.trim() || null
    updates['price_max'] = priceMaxInput.trim() || null
    updateMultipleFilters(updates)
  }, [priceMinInput, priceMaxInput, updateMultipleFilters])

  // Determine if any filters are active
  const hasActiveFilters = Boolean(
    currentCategory ||
    selectedCollection ||
    priceMinParam ||
    priceMaxParam ||
    inStockOnly ||
    currentSort !== 'created_at' ||
    currentOrder !== 'desc'
  )

  // Build active filter list for badges
  const activeFilters: { label: string; key: string; onRemove: () => void }[] = []

  if (currentCategory) {
    activeFilters.push({
      label: `Category: ${currentCategory}`,
      key: 'category',
      onRemove: () => updateFilters('category', null)
    })
  }
  if (selectedCollection) {
    const col = collections.find(c => c.slug === selectedCollection)
    activeFilters.push({
      label: `Collection: ${col?.title || selectedCollection}`,
      key: 'collection',
      onRemove: () => setSelectedCollection('')
    })
  }
  if (priceMinParam) {
    activeFilters.push({
      label: `Min: ${store.blueprint?.location?.currency || 'INR'} ${priceMinParam}`,
      key: 'price_min',
      onRemove: () => updateFilters('price_min', null)
    })
  }
  if (priceMaxParam) {
    activeFilters.push({
      label: `Max: ${store.blueprint?.location?.currency || 'INR'} ${priceMaxParam}`,
      key: 'price_max',
      onRemove: () => updateFilters('price_max', null)
    })
  }
  if (inStockOnly) {
    activeFilters.push({
      label: 'In stock only',
      key: 'in_stock',
      onRemove: () => updateFilters('in_stock', null)
    })
  }
  if (currentSort !== 'created_at' || currentOrder !== 'desc') {
    const sortLabels: Record<string, string> = {
      'created_at-desc': 'Newest First',
      'created_at-asc': 'Oldest First',
      'price-asc': 'Price: Low to High',
      'price-desc': 'Price: High to Low',
      'title-asc': 'Name: A to Z',
      'title-desc': 'Name: Z to A',
    }
    activeFilters.push({
      label: `Sort: ${sortLabels[`${currentSort}-${currentOrder}`] || 'Custom'}`,
      key: 'sort',
      onRemove: () => updateMultipleFilters({ sort: null, order: null })
    })
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl md:text-4xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {currentCategory || 'All Products'}
        </h1>
        <p className="text-gray-600">
          {displayProducts.length} product{displayProducts.length !== 1 ? 's' : ''}
          {displayProducts.length !== pagination.total && ` (of ${pagination.total})`}
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 mb-8 pb-6 border-b">
        {/* Row 1: Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateFilters('category', null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !currentCategory
                ? 'text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={!currentCategory ? { backgroundColor: 'var(--color-primary)' } : {}}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => updateFilters('category', category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentCategory === category
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={currentCategory === category ? { backgroundColor: 'var(--color-primary)' } : {}}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Row 2: Price range, In-stock toggle, Sort, Collection, View */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left side: Price range + In-stock */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Price Range */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min price"
                value={priceMinInput}
                onChange={(e) => setPriceMinInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyPriceRange() }}
                className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                min="0"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="number"
                placeholder="Max price"
                value={priceMaxInput}
                onChange={(e) => setPriceMaxInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyPriceRange() }}
                className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                min="0"
              />
              <button
                onClick={applyPriceRange}
                className="px-3 py-2 text-sm font-medium rounded-lg text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Apply
              </button>
            </div>

            {/* In Stock Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => updateFilters('in_stock', e.target.checked ? 'true' : null)}
                className="w-4 h-4 rounded border-gray-300 accent-[var(--color-primary)]"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <Package className="w-4 h-4" />
                In stock only
              </span>
            </label>
          </div>

          {/* Right side: Sort, Collection, View */}
          <div className="flex items-center gap-4">
            {collections.length > 0 && (
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">All Collections</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.slug}>
                    {col.title} ({col.product_count})
                  </option>
                ))}
              </select>
            )}
            <select
              value={`${currentSort}-${currentOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-')
                const params = new URLSearchParams(searchParams.toString())
                params.set('sort', sort)
                params.set('order', order)
                params.delete('page')
                router.push(`${baseUrl}/products?${params.toString()}`)
              }}
              className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title-asc">Name: A to Z</option>
              <option value="title-desc">Name: Z to A</option>
            </select>

            <div className="hidden md:flex items-center border rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 border border-gray-200"
              >
                {filter.label}
                <button
                  onClick={filter.onRemove}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label={`Remove ${filter.label} filter`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-sm font-medium hover:underline transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {displayProducts.length > 0 ? (
        <div className={`grid gap-6 ${
          viewMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1'
        }`}>
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-4">No products found</p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          <button
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            let pageNum: number
            if (pagination.totalPages <= 5) {
              pageNum = i + 1
            } else if (pagination.page <= 3) {
              pageNum = i + 1
            } else if (pagination.page >= pagination.totalPages - 2) {
              pageNum = pagination.totalPages - 4 + i
            } else {
              pageNum = pagination.page - 2 + i
            }

            return (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                  pagination.page === pageNum
                    ? 'text-white'
                    : 'hover:bg-gray-100'
                }`}
                style={pagination.page === pageNum ? { backgroundColor: 'var(--color-primary)' } : {}}
              >
                {pageNum}
              </button>
            )
          })}

          <button
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
