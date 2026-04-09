'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import ProductForm from '@/components/products/product-form'

export default function NewProductPage() {
  const router = useRouter()
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/auth/user')
        const data = await response.json()

        if (!data.user) {
          router.push('/sign-in')
          return
        }

        if (!data.store) {
          setError('Please complete store setup first')
          return
        }

        setStoreId(data.store.id)
      } catch (err) {
        console.error('Failed to fetch store:', err)
        setError('Failed to load store information')
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [router])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Products', href: '/platform/products' },
            { label: 'New Product' },
          ]}
        />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Products', href: '/platform/products' },
            { label: 'New Product' },
          ]}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Unable to Add Product
          </h2>
          <p className="mt-2 text-sm text-[var(--platform-text-muted)]">{error}</p>
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

  if (!storeId) return null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Products', href: '/platform/products' },
          { label: 'New Product' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/platform/products"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--platform-border)] text-[var(--platform-text-muted)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Add New Product
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Upload images and fill in product details
          </p>
        </div>
      </div>

      {/* Form */}
      <ProductForm storeId={storeId} mode="create" />
    </div>
  )
}
