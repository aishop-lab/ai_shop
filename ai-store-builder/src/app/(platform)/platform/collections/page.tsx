'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  FolderOpen,
  Plus,
  Search,
  Loader2,
  Package,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  product_count: number
  is_active: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CollectionsPage() {
  const [search, setSearch] = useState('')
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)

  // Fetch the merchant's store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) setStoreId(data.store.id)
        }
      } catch {
        console.error('[Collections] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Fetch collections from Supabase
  useEffect(() => {
    if (!storeId) {
      setIsLoading(false)
      return
    }

    async function fetchCollections() {
      try {
        setIsLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCollections((data as Collection[]) ?? [])
      } catch (err) {
        console.error('[Collections] Failed to fetch collections:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCollections()
  }, [storeId])

  // Filter collections by search query
  const filtered = useMemo(() => {
    if (!search) return collections
    const q = search.toLowerCase()
    return collections.filter((c) =>
      (c.name ?? '').toLowerCase().includes(q),
    )
  }, [search, collections])

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Collections' },
          ]}
        />
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Collections
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Loading collections...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Collections' },
        ]}
      />

      {/* --------------------------------------------------------------- */}
      {/* Header                                                           */}
      {/* --------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Collections
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            {collections.length} collection{collections.length !== 1 ? 's' : ''} in your store
          </p>
        </div>
        <Link
          href="/platform/collections/create"
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
            'bg-[var(--platform-accent)] text-white text-xs font-medium',
            'hover:opacity-90 transition-opacity',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Collection
        </Link>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Search bar                                                       */}
      {/* --------------------------------------------------------------- */}
      {collections.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections..."
            aria-label="Search collections"
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
      )}

      {/* --------------------------------------------------------------- */}
      {/* Content                                                          */}
      {/* --------------------------------------------------------------- */}
      {collections.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>

          {/* Count footer */}
          <p className="text-center font-mono text-[10px] text-[var(--platform-text-muted)]">
            {filtered.length} of {collections.length} collection{collections.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link href={`/dashboard/collections/${collection.id}`} title="Edit collection (opens legacy editor)">
      <div
        className={cn(
          'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)]',
          'p-4 transition-colors hover:border-[var(--platform-border-hover)]',
          'group cursor-pointer',
        )}
      >
        {/* Image / placeholder */}
        <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-md bg-[var(--platform-surface-hover)]">
          {collection.image_url ? (
            <Image
              src={collection.image_url}
              alt={collection.name}
              fill
              className="object-cover transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-[var(--platform-text-muted)] opacity-40" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2">
          {/* Name + status */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-medium text-sm text-[var(--platform-text-primary)] group-hover:text-[var(--platform-accent)]">
              {collection.name}
            </h3>
            {collection.is_active ? (
              <span className="flex-shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">
                Active
              </span>
            ) : (
              <span className="flex-shrink-0 rounded-full bg-[var(--platform-surface-hover)] px-2 py-0.5 text-[10px] text-[var(--platform-text-muted)]">
                Draft
              </span>
            )}
          </div>

          {/* Description (if present) */}
          {collection.description && (
            <p className="line-clamp-2 text-xs text-[var(--platform-text-muted)]">
              {collection.description}
            </p>
          )}

          {/* Meta row: product count + date */}
          <div className="flex items-center justify-between pt-1">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--platform-text-secondary)]">
              <Package className="h-3 w-3" />
              {collection.product_count} product{collection.product_count !== 1 ? 's' : ''}
            </span>
            <span className="font-mono text-[10px] text-[var(--platform-text-muted)]">
              {formatDate(collection.created_at)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] py-20">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--platform-surface-hover)]">
        <FolderOpen className="h-5 w-5 text-[var(--platform-text-muted)]" />
      </div>
      <p className="font-mono text-sm text-[var(--platform-text-primary)]">
        No collections yet
      </p>
      <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
        Group your products into collections for better organization
      </p>
      <Link
        href="/platform/collections/create"
        className={cn(
          'mt-4 flex items-center gap-1.5 rounded-lg px-3 py-1.5',
          'bg-[var(--platform-accent)] text-white text-xs font-medium',
          'hover:opacity-90 transition-opacity',
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Create Collection
      </Link>
    </div>
  )
}

function NoResults() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] py-20">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--platform-surface-hover)]">
        <Search className="h-5 w-5 text-[var(--platform-text-muted)]" />
      </div>
      <p className="font-mono text-sm text-[var(--platform-text-primary)]">
        No matching collections
      </p>
      <p className="mt-1 text-xs text-[var(--platform-text-muted)]">
        Try adjusting your search query
      </p>
    </div>
  )
}
