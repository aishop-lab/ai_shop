'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, SlidersHorizontal, Grid, List } from 'lucide-react'
import type { Product } from '@/lib/types/store'
import { useStore } from '@/lib/contexts/store-context'
import ProductCard from './themes/modern-minimal/product-card'
import { useState } from 'react'

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
  const baseUrl = `/${store.slug}`
  
  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset to page 1 when filters change
    router.push(`${baseUrl}/products?${params.toString()}`)
  }
  
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`${baseUrl}/products?${params.toString()}`)
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
          {pagination.total} product{pagination.total !== 1 ? 's' : ''}
        </p>
      </div>
      
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b">
        {/* Category Filter */}
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
        
        {/* Sort & View */}
        <div className="flex items-center gap-4">
          <select
            value={`${currentSort}-${currentOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-')
              updateFilters('sort', sort)
              setTimeout(() => updateFilters('order', order), 0)
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
      
      {/* Products Grid */}
      {products.length > 0 ? (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-4">No products found</p>
          {currentCategory && (
            <button
              onClick={() => updateFilters('category', null)}
              className="text-[var(--color-primary)] hover:underline"
            >
              View all products
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
