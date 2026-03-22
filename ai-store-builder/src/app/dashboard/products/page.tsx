'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Filter, 
  Upload, 
  LayoutGrid, 
  List,
  ChevronDown,
  Loader2,
  Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ProductCard from '@/components/products/product-card'
import BulkUploadModal from '@/components/products/bulk-upload-modal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { useStoreCurrency } from '@/lib/hooks/use-store-currency'
import type { Product } from '@/lib/types/store'

interface ProductsResponse {
  success: boolean
  products: Product[]
  total: number
  page: number
  totalPages: number
  categories: string[]
}

export default function ProductsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [storeId, setStoreId] = useState<string>('')
  const [storeSlug, setStoreSlug] = useState<string>('')
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const { currency } = useStoreCurrency()

  // Restore view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('product-view-mode')
    if (saved === 'grid' || saved === 'list') {
      setViewModeState(saved)
    }
  }, [])

  const setViewMode = (mode: 'grid' | 'list') => {
    setViewModeState(mode)
    localStorage.setItem('product-view-mode', mode)
  }

  // Fetch user's store
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const response = await fetch('/api/auth/user')
        const data = await response.json()
        
        if (data.store) {
          setStoreId(data.store.id)
          setStoreSlug(data.store.slug)
        }
      } catch (error) {
        console.error('Failed to fetch store:', error)
      }
    }
    fetchStore()
  }, [])

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!storeId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        store_id: storeId,
        page: page.toString(),
        limit: '24',
        status: statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }
      if (categoryFilter && categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }

      const response = await fetch(`/api/products/list?${params}`)
      const data: ProductsResponse = await response.json()

      if (data.success) {
        setProducts(data.products)
        setTotalPages(data.totalPages)
        setTotal(data.total)
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [storeId, page, statusFilter, searchQuery, categoryFilter, sortBy, sortOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (storeId) {
        setPage(1)
        fetchProducts()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteRequest = (productId: string) => {
    setProductToDelete(productId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return

    try {
      const response = await fetch(`/api/products/${productToDelete}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Product Deleted',
          description: 'Product has been archived'
        })
        fetchProducts()
      } else {
        throw new Error('Delete failed')
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive'
      })
    } finally {
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleDuplicate = async (productId: string) => {
    toast({
      title: 'Coming Soon',
      description: 'Product duplication will be available soon'
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage your store products
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setBulkUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link href="/dashboard/products/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort */}
        <Select 
          value={`${sortBy}-${sortOrder}`} 
          onValueChange={(value) => {
            const [newSortBy, newSortOrder] = value.split('-')
            setSortBy(newSortBy)
            setSortOrder(newSortOrder)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Newest First</SelectItem>
            <SelectItem value="created_at-asc">Oldest First</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="title-asc">Name: A to Z</SelectItem>
            <SelectItem value="title-desc">Name: Z to A</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {products.length} of {total} products
        </p>
      )}

      {/* Products Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No products match your filters'
              : 'Start by adding your first product'}
          </p>
          {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
            <Link href="/dashboard/products/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Product
              </Button>
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              storeSlug={storeSlug}
              onDelete={handleDeleteRequest}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductListItem
              key={product.id}
              product={product}
              storeSlug={storeSlug}
              currency={currency}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        storeId={storeId}
        onSuccess={fetchProducts}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This will archive the product and it will no longer be visible in your store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// List view item component
function ProductListItem({
  product,
  storeSlug,
  currency,
  onDelete
}: {
  product: Product
  storeSlug?: string
  currency: string
  onDelete: (id: string) => void
}) {
  const primaryImage = product.images?.[0]?.thumbnail_url || product.images?.[0]?.url

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/dashboard/products/${product.id}`}>
          <h3 className="font-medium truncate hover:text-primary transition-colors">{product.title}</h3>
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span>{formatCurrency(product.price, currency)}</span>
          {product.sku && <span>SKU: {product.sku}</span>}
          {product.track_quantity && <span>Qty: {product.quantity}</span>}
        </div>
      </div>

      {/* Status */}
      <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
        product.status === 'published'
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-yellow-500/15 text-yellow-400'
      }`}>
        {product.status}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/dashboard/products/${product.id}`}>
          <Button variant="ghost" size="sm">Edit</Button>
        </Link>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onDelete(product.id)}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
