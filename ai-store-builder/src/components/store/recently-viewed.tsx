'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getRecentlyViewed, type RecentlyViewedProduct } from '@/lib/utils/recently-viewed'
import { useStore } from '@/lib/contexts/store-context'

interface RecentlyViewedProps {
  currentProductId: string
  storeSlug: string
}

export default function RecentlyViewed({ currentProductId, storeSlug }: RecentlyViewedProps) {
  const { formatPrice } = useStore()
  const [products, setProducts] = useState<RecentlyViewedProduct[]>([])

  useEffect(() => {
    const items = getRecentlyViewed(storeSlug).filter((p) => p.id !== currentProductId)
    setProducts(items)
  }, [currentProductId, storeSlug])

  if (products.length < 2) return null

  return (
    <section className="mt-16 pt-12 border-t">
      <h2
        className="text-2xl font-bold mb-8"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Recently Viewed
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-thin">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/${storeSlug}/products/${product.id}`}
            className="group flex-shrink-0 w-[180px] sm:w-[200px]"
          >
            <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-3">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="200px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <h3
              className="text-sm font-medium line-clamp-2 mb-1 group-hover:underline"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {product.title}
            </h3>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-primary)' }}
            >
              {formatPrice(product.price)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
