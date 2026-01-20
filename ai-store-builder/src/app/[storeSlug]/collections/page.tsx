import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getStoreData } from '@/lib/store/get-store-data'
import { Folder } from 'lucide-react'

interface CollectionsPageProps {
  params: Promise<{ storeSlug: string }>
}

export const revalidate = 300 // 5 minutes

export async function generateMetadata({ params }: CollectionsPageProps): Promise<Metadata> {
  const { storeSlug } = await params
  const storeData = await getStoreData(storeSlug)

  if (!storeData) return {}

  return {
    title: `Collections - ${storeData.store.name}`,
    description: `Browse our curated collections at ${storeData.store.name}`
  }
}

interface Collection {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  product_count: number
}

async function getCollections(storeSlug: string): Promise<Collection[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const response = await fetch(`${baseUrl}/api/store/${storeSlug}/collections`, {
      next: { revalidate: 300 }
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.collections || []
  } catch (error) {
    console.error('Failed to fetch collections:', error)
    return []
  }
}

export default async function CollectionsPage({ params }: CollectionsPageProps) {
  const { storeSlug } = await params

  const storeData = await getStoreData(storeSlug)

  if (!storeData) {
    notFound()
  }

  const collections = await getCollections(storeSlug)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Collections</h1>
        <p className="text-muted-foreground">
          Browse our curated product collections
        </p>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-16">
          <Folder className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No collections yet</h2>
          <p className="text-muted-foreground">
            Check back soon for curated product collections
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/${storeSlug}/collections/${collection.slug}`}
              className="group block"
            >
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted mb-3">
                {collection.cover_image_url ? (
                  <Image
                    src={collection.cover_image_url}
                    alt={collection.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Folder className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-lg mb-1">
                    {collection.title}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {collection.product_count} product{collection.product_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {collection.description && (
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {collection.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
