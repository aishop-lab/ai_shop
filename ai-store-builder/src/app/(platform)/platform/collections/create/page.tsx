'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Search,
  Check,
  Upload,
  X,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export default function CreateCollectionPage() {
  const router = useRouter()

  // Store
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeLoading, setStoreLoading] = useState(true)

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  // Products for selector
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Submit
  const [saving, setSaving] = useState(false)

  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false)

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([])

  // -------------------------------------------------------------------------
  // Toast helper
  // -------------------------------------------------------------------------

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  // -------------------------------------------------------------------------
  // Fetch store ID
  // -------------------------------------------------------------------------

  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) {
            setStoreId(data.store.id)
          }
        }
      } catch {
        console.error('[CreateCollection] Failed to fetch store ID')
      } finally {
        setStoreLoading(false)
      }
    }
    fetchStoreId()
  }, [])

  // -------------------------------------------------------------------------
  // Fetch products for selector
  // -------------------------------------------------------------------------

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
        setProducts((data as Product[]) ?? [])
      } catch (err) {
        console.error('[CreateCollection] Failed to fetch products:', err)
      } finally {
        setProductsLoading(false)
      }
    }
    fetchProducts()
  }, [storeId])

  // -------------------------------------------------------------------------
  // Filtered products
  // -------------------------------------------------------------------------

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products
    const q = productSearch.toLowerCase()
    return products.filter((p) => p.title.toLowerCase().includes(q))
  }, [products, productSearch])

  // -------------------------------------------------------------------------
  // Toggle product selection
  // -------------------------------------------------------------------------

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    )
  }

  // -------------------------------------------------------------------------
  // Image upload handler
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      showToast('Collection name is required', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/dashboard/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          cover_image_url: coverImageUrl || undefined,
          visible: isActive,
          featured: false,
          product_ids: selectedProductIds.length > 0 ? selectedProductIds : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create collection')
      }

      showToast(`"${title}" created successfully`)
      // Short delay so the user sees the toast before navigating
      setTimeout(() => router.push('/platform/collections'), 600)
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to create collection',
        'error',
      )
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (storeLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Collections', href: '/platform/collections' },
            { label: 'Create' },
          ]}
        />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  if (!storeId) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Collections', href: '/platform/collections' },
            { label: 'Create' },
          ]}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Unable to Create Collection
          </h2>
          <p className="mt-2 text-sm text-[var(--platform-text-muted)]">
            Please complete store setup first.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 rounded-lg bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
          >
            Complete Store Setup
          </Link>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Collections', href: '/platform/collections' },
          { label: 'Create' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/platform/collections"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--platform-border)] text-[var(--platform-text-muted)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Create Collection
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Group products into a themed collection
          </p>
        </div>
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

          {/* Name */}
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
              placeholder="e.g., Summer Collection, Bestsellers"
              className={cn(
                'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                'text-sm text-[var(--platform-text-primary)]',
                'placeholder:text-[var(--platform-text-muted)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
              )}
            />
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
                  {products.length === 0
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
        {/* Status                                                             */}
        {/* ----------------------------------------------------------------- */}
        <section className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
          <h2 className="font-mono text-sm font-medium text-[var(--platform-text-primary)]">
            Status
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--platform-text-primary)]">
                Active
              </p>
              <p className="text-xs text-[var(--platform-text-muted)]">
                Show this collection on your store
              </p>
            </div>

            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((prev) => !prev)}
              className={cn(
                'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors',
                isActive
                  ? 'bg-[var(--platform-accent)]'
                  : 'bg-[var(--platform-border)]',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform',
                  isActive ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </button>
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
            {saving ? 'Creating...' : 'Create Collection'}
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
