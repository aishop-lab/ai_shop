'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingCart } from 'lucide-react'

interface Product {
  id: string
  title: string
  price: number
  categories?: string[]
  images?: { url: string; alt_text: string }[]
}

interface Recommendation {
  productId: string
  score: number
  reason: string
  product: Product | null
}

interface ProductRecommendationsProps {
  storeId: string
  storeSlug: string
  productId?: string
  customerId?: string
  customerEmail?: string
  type?: 'similar' | 'complementary' | 'trending' | 'personalized'
  limit?: number
  title?: string
  className?: string
}

export function ProductRecommendations({
  storeId,
  storeSlug,
  productId,
  customerId,
  customerEmail,
  type = 'similar',
  limit = 4,
  title,
  className = ''
}: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecommendations() {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          storeId,
          type,
          limit: limit.toString()
        })

        if (productId) params.append('productId', productId)
        if (customerId) params.append('customerId', customerId)
        if (customerEmail) params.append('customerEmail', customerEmail)

        const response = await fetch(`/api/recommendations?${params}`)

        if (!response.ok) {
          throw new Error('Failed to fetch recommendations')
        }

        const data = await response.json()

        if (data.success && data.recommendations) {
          // Fetch full product details with images
          const enrichedRecs = await Promise.all(
            data.recommendations.map(async (rec: Recommendation) => {
              if (!rec.product) return rec

              // Fetch product with images
              const productRes = await fetch(`/api/products/${rec.productId}`)
              if (productRes.ok) {
                const productData = await productRes.json()
                return { ...rec, product: productData.product }
              }
              return rec
            })
          )

          setRecommendations(enrichedRecs.filter((r: Recommendation) => r.product))
        }
      } catch (err) {
        console.error('Failed to load recommendations:', err)
        setError('Unable to load recommendations')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [storeId, productId, customerId, customerEmail, type, limit])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const defaultTitles: Record<string, string> = {
    similar: 'You Might Also Like',
    complementary: 'Frequently Bought Together',
    trending: 'Trending Now',
    personalized: 'Recommended For You'
  }

  const displayTitle = title || defaultTitles[type]

  if (error || (!isLoading && recommendations.length === 0)) {
    return null // Don't show section if no recommendations
  }

  return (
    <div className={`py-8 ${className}`}>
      <h2 className="text-xl font-bold mb-6">{displayTitle}</h2>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recommendations.map((rec) => (
            <Link
              key={rec.productId}
              href={`/${storeSlug}/products/${rec.product?.id}`}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow group">
                <div className="aspect-square relative bg-gray-100">
                  {rec.product?.images?.[0] ? (
                    <Image
                      src={rec.product.images[0].url}
                      alt={rec.product.images[0].alt_text || rec.product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {rec.product?.title}
                  </h3>
                  <p className="font-bold text-primary">
                    {formatCurrency(rec.product?.price || 0)}
                  </p>
                  {type === 'complementary' && (
                    <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductRecommendations
