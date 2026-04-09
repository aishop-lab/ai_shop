'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Search,
  Check,
  Upload,
  X,
  Trash2,
  FolderOpen,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionData {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  meta_title: string | null
  meta_description: string | null
  featured: boolean
  visible: boolean
  position: number | null
  products: Array<{
    id: string
    title: string
    slug: string
    price: number
    compare_at_price: number | null
    status: string
    images: Array<{ url: string; alt?: string }>
  }>
  product_count: number
}

interface Product {
  id: string
  title: string
  price: number
  status: string
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditCollectionPage() {
  const params = useParams()
  const collectionId = params.id as string
  const router = useRouter()

  // Store
  const [storeId, setStoreId] = useState<string | null>(null)

  // Collection state
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form fields
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [featured, setFeatured] = useState(false)
  const [visible, setVisible] = useState(true)
  const [sortOrder, setSortOrder] = useState<string>('')

  // Product management
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Actions
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([])

  // ---------------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------------

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  // ---------------------------------------------------------------------------
  // Fetch store ID
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) setStoreId(data.store.id)
        }
      } catch {
        console.error('[EditCollection] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch collection
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!collectionId) return

    async function fetchCollection() {
      try {
        const response = await fetch(`/api/dashboard/collections/${collectionId}`)
        const data = await response.json()

        if (data.success && data.collection) {
          const c = data.collection as CollectionData
          setTitle(c.title || '')
          setSlug(c.slug || '')
          setDescription(c.description || '')
          setCoverImageUrl(c.cover_image_url || '')
          setMetaTitle(c.meta_title || '')
          setMetaDescription(c.meta_description || '')
          setFeatured(c.featured || false)
          setVisible(c.visible !== false)
          setSortOrder(c.position != null ? String(c.position) : '')
          setSelectedProductIds(
            c.products?.map((p) => p.id) || [],
          )
        } else {
          setNotFound(true)
        }
      } catch {
        console.error('[EditCollection] Failed to fetch collection')
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchCollection()
  }, [collectionId])

  // ---------------------------------------------------------------------------
  // Fetch all products for selector
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!storeId) return

    async function fetchProducts() {
      setProductsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('products')
          .select('id, title, price, status')
          .eq('store_id', storeId)
          .eq('status', 'active')
          .order('title')

        if (error) throw error
        setAllProducts((data as Product[]) ?? [])
      } catch (err) {
        console.error('[EditCollection] Failed to fetch products:', err)
      } finally {
        setProductsLoading(false)
      }
    }
    fetchProducts()
  }, [storeId])

  // ---------------------------------------------------------------------------
  // Filtered products
  // ---------------------------------------------------------------------------

  const filteredProducts = useMemo(() => {
    if (!productSearch) return allProducts
    const q = productSearch.toLowerCase()
    return allProducts.filter((p) => p.title.toLowerCase().includes(q))
  }, [allProducts, productSearch])

  // ---------------------------------------------------------------------------
  // Toggle product selection
  // ---------------------------------------------------------------------------

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    )
  }

  // ---------------------------------------------------------------------------
  // Image upload handler
  // ---------------------------------------------------------------------------

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/onboarding/upload-logo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.url) {
        setCoverImageUrl(data.url)
        showToast('Cover image uploaded')
      } else {
        throw new Error('No URL returned')
      }
    } catch {
      showToast('Failed to upload image', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Save changes
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      showToast('Collection name is required', 'error')
      return
    }

    setSaving(true)
    try {
      // Update collection details
      const patchResponse = await fetch(`/api/dashboard/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || null,
          cover_image_url: coverImageUrl || null,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          featured,
          visible,
          position: sortOrder !== '' ? parseInt(sortOrder, 10) : undefined,
        }),
      })

      if (!patchResponse.ok) {
        const data = await patchResponse.json()
        throw new Error(data.error || 'Failed to update collection')
      }

      // Update products via set action
      const productsResponse = await fetch(
        `/api/dashboard/collections/${collectionId}/products`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set',
            product_ids: selectedProductIds,
          }),
        },
      )

      if (!productsResponse.ok) {
        const data = await productsResponse.json()
        throw new Error(data.error || 'Failed to update products')
      }

      showToast('Collection updated successfully')
      setTimeout(() => router.push('/platform/collections'), 600)
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update collection',
        'error',
      )
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete collection
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this collection? Products will not be deleted.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/dashboard/collections/${collectionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showToast('Collection deleted')
        setTimeout(() => router.push('/platform/collections'), 600)
      } else {
        throw new Error('Failed to delete collection')
      }
    } catch {
      showToast('Failed to delete collection', 'error')
      setDeleting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Collections', href: '/platform/collections' },
            { label: 'Edit' },
          ]}
        />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Not found state
  // ---------------------------------------------------------------------------

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Collections', href: '/platform/collections' },
            { label: 'Not Found' },
          ]}
        />
        <div className="flex flex-col items-center py-20 text-center">
          <FolderOpen className="h-8 w-8 text-[var(--platform-text-muted)] mb-3" />
          <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
            Collection not found
          </h2>
          <Link
            href="/platform/collections"
            className="mt-4 text-xs text-[var(--platform-accent)] hover:underline"
          >
            Back to Collections
          </Link>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Collections', href: '/platform/collections' },
          { label: title || 'Edit' },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/platform/collections"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--platform-border)] text-[var(--platform-text-muted)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              Edit Collection
            </h1>
            <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
              Update collection details and products
            </p>
          </div>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-4 py-2',
            'text-xs font-medium text-red-400',
            'hover:bg-red-500/10 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ----------------------------------------------------------------- */}
        {/* Collection Details                                                 */}
        {/* ----------------------------------------------------------------- */}
        <section className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
          <h2 className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
            Collection Details
          </h2>

          {/* Name + Slug */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="col-name"
                className="text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="col-name"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Summer Collection"
                className={cn(
                  'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                  'text-sm text-[var(--platform-text-primary)]',
                  'placeholder:text-[var(--platform-text-muted)]',
                  'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="col-slug"
                className="text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                URL Slug
              </label>
              <input
                id="col-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-from-name"
                className={cn(
                  'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                  'text-sm text-[var(--platform-text-primary)]',
                  'placeholder:text-[var(--platform-text-muted)]',
                  'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
                )}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="col-desc"
              className="text-xs font-medium text-[var(--platform-text-secondary)]"
            >
              Description
            </label>
            <textarea
              id="col-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this collection..."
              className={cn(
                'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                'text-sm text-[var(--platform-text-primary)] resize-none',
                'placeholder:text-[var(--platform-text-muted)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
              )}
            />
          </div>

          {/* Cover Image */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--platform-text-secondary)]">
              Cover Image
            </label>
            <div className="flex items-start gap-4">
              {coverImageUrl ? (
                <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--platform-border)]">
                  <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl('')}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-white transition-colors hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label
                  className={cn(
                    'flex h-28 w-28 flex-shrink-0 cursor-pointer flex-col items-center justify-center',
                    'rounded-lg border-2 border-dashed border-[var(--platform-border)]',
                    'transition-colors hover:border-[var(--platform-accent)]',
                  )}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--platform-text-muted)]" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-[var(--platform-text-muted)]" />
                      <span className="mt-1 text-[10px] text-[var(--platform-text-muted)]">
                        Upload
                      </span>
                    </>
                  )}
                </label>
              )}
              <p className="pt-1 text-xs leading-relaxed text-[var(--platform-text-muted)]">
                Upload a cover image for this collection.
                <br />
                Recommended: 800x400px or larger.
              </p>
            </div>
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <label
              htmlFor="col-sort"
              className="text-xs font-medium text-[var(--platform-text-secondary)]"
            >
              Sort Order
            </label>
            <input
              id="col-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
              className={cn(
                'w-32 rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                'text-sm text-[var(--platform-text-primary)]',
                'placeholder:text-[var(--platform-text-muted)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
              )}
            />
            <p className="text-[10px] text-[var(--platform-text-muted)]">
              Lower numbers appear first. Leave blank for default ordering.
            </p>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Products                                                           */}
        {/* ----------------------------------------------------------------- */}
        <section className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
              Products
            </h2>
            {selectedProductIds.length > 0 && (
              <span className="rounded-full bg-[var(--platform-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--platform-accent)]">
                {selectedProductIds.length} selected
              </span>
            )}
          </div>

          {/* Product search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className={cn(
                'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)]',
                'pl-9 pr-3 py-2 text-sm text-[var(--platform-text-primary)]',
                'placeholder:text-[var(--platform-text-muted)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
              )}
            />
          </div>

          {/* Selected product chips */}
          {selectedProductIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedProductIds.map((pid) => {
                const product = allProducts.find((p) => p.id === pid)
                return (
                  <span
                    key={pid}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--platform-accent)]/20 bg-[var(--platform-accent)]/5 px-2 py-0.5 text-[10px] text-[var(--platform-accent)]"
                  >
                    {product?.title || 'Unknown'}
                    <button
                      type="button"
                      onClick={() => toggleProduct(pid)}
                      className="ml-0.5 hover:text-red-400 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                )
              })}
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="text-[10px] text-[var(--platform-text-muted)] hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Product list */}
          <div className="max-h-64 overflow-y-auto rounded border border-[var(--platform-border)] bg-[var(--platform-bg)]">
            {productsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--platform-text-muted)]" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <ImageIcon className="h-5 w-5 text-[var(--platform-text-muted)] opacity-50" />
                <p className="mt-2 text-xs text-[var(--platform-text-muted)]">
                  {allProducts.length === 0
                    ? 'No active products found'
                    : 'No products match your search'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--platform-border)]">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProductIds.includes(product.id)
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'bg-[var(--platform-accent)]/5'
                            : 'hover:bg-[var(--platform-surface-hover)]',
                        )}
                      >
                        {/* Checkbox */}
                        <span
                          className={cn(
                            'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors',
                            isSelected
                              ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)] text-white'
                              : 'border-[var(--platform-border)]',
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>

                        {/* Product info */}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-[var(--platform-text-primary)]">
                            {product.title}
                          </span>
                        </span>

                        {/* Price */}
                        <span className="flex-shrink-0 font-mono text-xs text-[var(--platform-text-muted)]">
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(product.price)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Settings                                                           */}
        {/* ----------------------------------------------------------------- */}
        <section className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
          <h2 className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
            Settings
          </h2>

          {/* Visible toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--platform-text-primary)]">Visible</p>
              <p className="text-xs text-[var(--platform-text-muted)]">
                Show this collection on your store
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={visible}
              onClick={() => setVisible((prev) => !prev)}
              className={cn(
                'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors',
                visible
                  ? 'bg-[var(--platform-accent)]'
                  : 'bg-[var(--platform-border)]',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform',
                  visible ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>

          {/* Featured toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--platform-text-primary)]">Featured</p>
              <p className="text-xs text-[var(--platform-text-muted)]">
                Display prominently on your homepage
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={featured}
              onClick={() => setFeatured((prev) => !prev)}
              className={cn(
                'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors',
                featured
                  ? 'bg-[var(--platform-accent)]'
                  : 'bg-[var(--platform-border)]',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform',
                  featured ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* SEO                                                                */}
        {/* ----------------------------------------------------------------- */}
        <section className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
          <h2 className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
            SEO
          </h2>

          <div className="space-y-1.5">
            <label
              htmlFor="col-meta-title"
              className="text-xs font-medium text-[var(--platform-text-secondary)]"
            >
              Meta Title
            </label>
            <input
              id="col-meta-title"
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="SEO title (defaults to collection name)"
              className={cn(
                'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                'text-sm text-[var(--platform-text-primary)]',
                'placeholder:text-[var(--platform-text-muted)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="col-meta-desc"
              className="text-xs font-medium text-[var(--platform-text-secondary)]"
            >
              Meta Description
            </label>
            <textarea
              id="col-meta-desc"
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="SEO description"
              className={cn(
                'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                'text-sm text-[var(--platform-text-primary)] resize-none',
                'placeholder:text-[var(--platform-text-muted)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
              )}
            />
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Actions                                                            */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2',
              'bg-[var(--platform-accent)] text-xs font-medium text-white',
              'hover:bg-[var(--platform-accent-hover)] transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/platform/collections"
            className={cn(
              'rounded-lg border border-[var(--platform-border)] px-4 py-2',
              'text-xs font-medium text-[var(--platform-text-secondary)]',
              'hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]',
              'transition-colors',
            )}
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* ------------------------------------------------------------------- */}
      {/* Toast notifications                                                  */}
      {/* ------------------------------------------------------------------- */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                'animate-in fade-in slide-in-from-bottom-2 rounded-lg px-4 py-2.5 text-xs font-medium shadow-lg',
                toast.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white',
              )}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
