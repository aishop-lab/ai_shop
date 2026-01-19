'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Heart, Eye } from 'lucide-react'
import type { Product } from '@/lib/types/store'
import { useStore } from '@/lib/contexts/store-context'
import { useState } from 'react'

interface ProductCardProps {
  product: Product
  showQuickView?: boolean
}

export default function ProductCard({ product, showQuickView = true }: ProductCardProps) {
  const { store, addToCart, formatPrice, isInCart } = useStore()
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  const baseUrl = `/${store.slug}`
  const primaryImage = product.images?.[0]?.url
  const secondaryImage = product.images?.[1]?.url
  const inCart = isInCart(product.id)
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsAdding(true)
    addToCart(product, 1)
    
    setTimeout(() => setIsAdding(false), 500)
  }
  
  const discount = product.compare_at_price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0
  
  const isOutOfStock = product.track_quantity && product.quantity <= 0
  
  return (
    <div className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image Container */}
      <Link href={`${baseUrl}/products/${product.id}`}>
        <div className="aspect-square relative overflow-hidden bg-gray-100">
          {primaryImage && !imageError ? (
            <>
              <Image
                src={primaryImage}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
              />
              {/* Secondary image on hover */}
              {secondaryImage && (
                <Image
                  src={secondaryImage}
                  alt={product.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {discount > 0 && (
              <span className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded">
                -{discount}%
              </span>
            )}
            {product.featured && (
              <span 
                className="px-2 py-1 text-xs font-semibold text-white rounded"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Featured
              </span>
            )}
            {isOutOfStock && (
              <span className="px-2 py-1 text-xs font-semibold bg-gray-800 text-white rounded">
                Sold Out
              </span>
            )}
          </div>
          
          {/* Quick Actions */}
          {showQuickView && (
            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                aria-label="Add to wishlist"
              >
                <Heart className="w-4 h-4 text-gray-700" />
              </button>
              <Link
                href={`${baseUrl}/products/${product.id}`}
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                aria-label="Quick view"
              >
                <Eye className="w-4 h-4 text-gray-700" />
              </Link>
            </div>
          )}
        </div>
      </Link>
      
      {/* Product Info */}
      <div className="p-4">
        {/* Categories */}
        {product.categories && product.categories.length > 0 && (
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
            {product.categories[0]}
          </p>
        )}
        
        {/* Title */}
        <h3 
          className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[48px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          <Link 
            href={`${baseUrl}/products/${product.id}`}
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            {product.title}
          </Link>
        </h3>
        
        {/* Price & Add to Cart */}
        <div className="flex items-center justify-between">
          <div>
            <span 
              className="text-lg font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              {formatPrice(product.price)}
            </span>
            {product.compare_at_price && (
              <span className="ml-2 text-sm text-gray-500 line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>
          
          {!isOutOfStock && (
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className={`p-2 rounded-full transition-all ${
                inCart 
                  ? 'bg-green-500 text-white' 
                  : 'hover:scale-110'
              }`}
              style={{ 
                backgroundColor: inCart ? undefined : 'var(--color-primary)',
                color: 'white'
              }}
              aria-label={inCart ? 'Added to cart' : 'Add to cart'}
            >
              <ShoppingCart className={`w-4 h-4 ${isAdding ? 'animate-bounce' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
