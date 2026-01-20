'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Folder, ArrowRight } from 'lucide-react'

interface Collection {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  product_count: number
}

interface CollectionsSectionProps {
  collections: Collection[]
  storeSlug: string
  title?: string
  showViewAll?: boolean
  maxItems?: number
}

export function CollectionsSection({
  collections,
  storeSlug,
  title = 'Shop by Collection',
  showViewAll = true,
  maxItems = 4
}: CollectionsSectionProps) {
  if (!collections || collections.length === 0) {
    return null
  }

  const displayedCollections = collections.slice(0, maxItems)

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">{title}</h2>
          {showViewAll && collections.length > maxItems && (
            <Link
              href={`/${storeSlug}/collections`}
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {displayedCollections.map((collection) => (
            <Link
              key={collection.id}
              href={`/${storeSlug}/collections/${collection.slug}`}
              className="group block"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                {collection.cover_image_url ? (
                  <Image
                    src={collection.cover_image_url}
                    alt={collection.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                    <Folder className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-lg group-hover:underline">
                    {collection.title}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {collection.product_count} item{collection.product_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
