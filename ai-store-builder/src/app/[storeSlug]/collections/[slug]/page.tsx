import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getStoreData } from '@/lib/store/get-store-data'
import ProductCard from '@/components/store/themes/modern-minimal/product-card'
import type { Product } from '@/lib/types/store'

interface CollectionPageProps {
  params: Promise<{ storeSlug: string; slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const revalidate = 300 // 5 minutes

interface CollectionData {
  collection: {
    id: string
    title: string
    slug: string
    description: string | null
    cover_image_url: string | null
    meta_title: string | null
    meta_description: string | null
    product_count: number
  }
  products: Array<{
    id: string
    title: string
    slug: string
    description: string
    price: number
    compare_at_price: number | null
    images: Array<{ url: string; alt?: string }>
  }>
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

async function getCollectionData(
  storeSlug: string,
  collectionSlug: string,
  page: number = 1,
  sort: string = 'position'
): Promise<CollectionData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const response = await fetch(
      `${baseUrl}/api/store/${storeSlug}/collections/${collectionSlug}?page=${page}&sort=${sort}`,
      { next: { revalidate: 300 } }
    )

    if (!response.ok) return null

    const data = await response.json()
    return data.success ? data : null
  } catch (error) {
    console.error('Failed to fetch collection:', error)
    return null
  }
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { storeSlug, slug } = await params

  const storeData = await getStoreData(storeSlug)
  if (!storeData) return {}

  const collectionData = await getCollectionData(storeSlug, slug)
  if (!collectionData) return {}

  const { collection } = collectionData

  return {
    title: collection.meta_title || `${collection.title} - ${storeData.store.name}`,
    description:
      collection.meta_description ||
      collection.description ||
      `Browse ${collection.title} collection at ${storeData.store.name}`,
    openGraph: {
      title: collection.meta_title || collection.title,
      description: collection.meta_description || collection.description || '',
      images: collection.cover_image_url ? [collection.cover_image_url] : []
    }
  }
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { storeSlug, slug } = await params
  const resolvedSearchParams = await searchParams

  const storeData = await getStoreData(storeSlug)
  if (!storeData) {
    notFound()
  }

  const page =
    typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1
  const sort =
    typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'position'

  const collectionData = await getCollectionData(storeSlug, slug, page, sort)

  if (!collectionData) {
    notFound()
  }

  const { collection, products, pagination } = collectionData

  return (
    <div>
      {/* Hero Section */}
      {collection.cover_image_url && (
        <div className="relative h-64 md:h-80 w-full">
          <Image
            src={collection.cover_image_url}
            alt={collection.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 container mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="text-white/90 max-w-2xl">{collection.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header (when no cover image) */}
        {!collection.cover_image_url && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{collection.title}</h1>
            {collection.description && (
              <p className="text-muted-foreground">{collection.description}</p>
            )}
          </div>
        )}

        {/* Filters/Sort */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            {pagination.total} product{pagination.total !== 1 ? 's' : ''}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              defaultValue={sort}
              className="text-sm border rounded-md px-2 py-1"
              onChange={(e) => {
                const url = new URL(window.location.href)
                url.searchParams.set('sort', e.target.value)
                window.location.href = url.toString()
              }}
            >
              <option value="position">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              No products in this collection yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  store_id: '',
                  title: product.title,
                  description: product.description || '',
                  price: product.price,
                  compare_at_price: product.compare_at_price ?? undefined,
                  quantity: 99,
                  track_quantity: false,
                  featured: false,
                  status: 'published',
                  requires_shipping: true,
                  images: product.images.map((img, idx) => ({
                    id: `${product.id}-img-${idx}`,
                    product_id: product.id,
                    url: img.url,
                    position: idx,
                    alt_text: img.alt
                  })),
                  created_at: '',
                  updated_at: ''
                } as Product}
                showQuickView={false}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={`/${storeSlug}/collections/${slug}?page=${page - 1}&sort=${sort}`}
                className="px-4 py-2 border rounded-md hover:bg-muted"
              >
                Previous
              </Link>
            )}

            <span className="px-4 py-2">
              Page {page} of {pagination.total_pages}
            </span>

            {page < pagination.total_pages && (
              <Link
                href={`/${storeSlug}/collections/${slug}?page=${page + 1}&sort=${sort}`}
                className="px-4 py-2 border rounded-md hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
