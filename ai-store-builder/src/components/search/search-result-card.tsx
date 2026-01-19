'use client'

import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/cart/calculations'
import { cn } from '@/lib/utils'

interface SearchResultCardProps {
  result: {
    title: string
    link: string
    snippet: string
    image?: string
    thumbnail?: string
    price?: number | null
    product_id?: string | null
  }
  currency?: string
  className?: string
}

export function SearchResultCard({
  result,
  currency = 'INR',
  className,
}: SearchResultCardProps) {
  const imageUrl = result.thumbnail || result.image

  return (
    <Link
      href={result.link}
      className={cn(
        'group block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-background',
        className
      )}
    >
      {/* Image */}
      {imageUrl ? (
        <div className="aspect-square relative bg-muted">
          <Image
            src={imageUrl}
            alt={result.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      ) : (
        <div className="aspect-square bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">No image</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {result.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {result.snippet}
        </p>
        {result.price != null && result.price > 0 && (
          <p className="text-lg font-bold text-primary">
            {formatPrice(result.price, currency)}
          </p>
        )}
      </div>
    </Link>
  )
}

export default SearchResultCard
