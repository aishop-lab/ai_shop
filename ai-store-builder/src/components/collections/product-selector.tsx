'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Search, X, Check, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  title: string
  price: number
  status: string
  inventory_count: number
  images: Array<{ url: string; alt?: string }>
}

interface ProductSelectorProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  maxProducts?: number
}

export function ProductSelector({
  selectedIds,
  onChange,
  maxProducts = 100
}: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products/list?limit=200')
      const data = await response.json()

      if (data.success) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(search.toLowerCase())
  )

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id))
  const unselectedProducts = filteredProducts.filter((p) => !selectedIds.includes(p.id))

  const toggleProduct = (productId: string) => {
    if (selectedIds.includes(productId)) {
      onChange(selectedIds.filter((id) => id !== productId))
    } else if (selectedIds.length < maxProducts) {
      onChange([...selectedIds, productId])
    }
  }

  const selectAll = () => {
    const allIds = filteredProducts.slice(0, maxProducts).map((p) => p.id)
    onChange(allIds)
  }

  const clearAll = () => {
    onChange([])
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selected products */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Selected ({selectedIds.length})
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((product) => (
              <Badge
                key={product.id}
                variant="secondary"
                className="pl-1 pr-2 py-1 flex items-center gap-2"
              >
                {product.images[0]?.url ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.title}
                    width={24}
                    height={24}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                    <Package className="h-3 w-3" />
                  </div>
                )}
                <span className="max-w-[150px] truncate">{product.title}</span>
                <button
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search and actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={selectAll}
          disabled={filteredProducts.length === 0}
        >
          Select all
        </Button>
      </div>

      {/* Products grid */}
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        {unselectedProducts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {search ? 'No products found' : 'All products selected'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-y">
            {unselectedProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleProduct(product.id)}
                className={cn(
                  'flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors',
                  selectedIds.includes(product.id) && 'bg-primary/10'
                )}
              >
                <div className="relative">
                  {product.images[0]?.url ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.title}
                      width={48}
                      height={48}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  {selectedIds.includes(product.id) && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.title}</p>
                  <p className="text-sm text-muted-foreground">
                    ₹{product.price.toLocaleString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {selectedIds.length} of {maxProducts} products selected
      </p>
    </div>
  )
}
