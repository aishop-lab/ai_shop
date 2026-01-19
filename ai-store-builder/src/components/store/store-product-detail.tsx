'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, ShoppingCart, Heart, Share2, ChevronLeft, ChevronRight, Check, Truck, Shield, RotateCcw } from 'lucide-react'
import type { Product } from '@/lib/types/store'
import type { ProductWithVariants, VariantSelection, ProductVariant } from '@/lib/types/variant'
import { useStore } from '@/lib/contexts/store-context'
import { useAnalytics } from '@/lib/analytics'
import { VariantSelector, useVariantSelection } from './variant-selector'
import ProductCard from './themes/modern-minimal/product-card'
import { ReviewsList } from '@/components/reviews/reviews-list'

interface StoreProductDetailProps {
  product: Product | ProductWithVariants
  relatedProducts: Product[]
}

export default function StoreProductDetail({ product, relatedProducts }: StoreProductDetailProps) {
  const { store, addToCart, formatPrice, isInCart, settings } = useStore()
  const analytics = useAnalytics()
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isAdding, setIsAdding] = useState(false)
  const baseUrl = `/${store.slug}`

  // Check if product has variants
  const hasVariants = 'has_variants' in product && product.has_variants
  const variantOptions = hasVariants ? (product as ProductWithVariants).variant_options || [] : []
  const variants = hasVariants ? (product as ProductWithVariants).variants || [] : []

  // Variant selection state
  const { getDefaultSelection, findVariant, isComplete } = useVariantSelection(variantOptions, variants)
  const [variantSelection, setVariantSelection] = useState<VariantSelection>({})
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>()

  // Initialize variant selection
  useEffect(() => {
    if (hasVariants && variantOptions.length > 0) {
      const defaultSelection = getDefaultSelection()
      setVariantSelection(defaultSelection)
    }
  }, [hasVariants, variantOptions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected variant when selection changes
  useEffect(() => {
    if (hasVariants && isComplete(variantSelection)) {
      const variant = findVariant(variantSelection)
      setSelectedVariant(variant)

      // Update image if variant has specific image
      if (variant?.image_id) {
        const imageIndex = images.findIndex(img => img.id === variant.image_id)
        if (imageIndex >= 0) {
          setSelectedImageIndex(imageIndex)
        }
      }
    }
  }, [variantSelection]) // eslint-disable-line react-hooks/exhaustive-deps

  const images = product.images || []
  const currentImage = images[selectedImageIndex]?.url

  // Determine effective values based on variant or product
  const effectivePrice = selectedVariant?.price ?? product.price
  const effectiveCompareAtPrice = selectedVariant?.compare_at_price ?? product.compare_at_price
  const effectiveQuantity = selectedVariant?.quantity ?? product.quantity
  const effectiveTrackQuantity = selectedVariant?.track_quantity ?? product.track_quantity

  const inCart = isInCart(product.id, selectedVariant?.id)
  const isOutOfStock = effectiveTrackQuantity && effectiveQuantity <= 0
  const maxQuantity = effectiveTrackQuantity ? effectiveQuantity : 99

  // Require variant selection for products with variants
  const needsVariantSelection = hasVariants && (!isComplete(variantSelection) || !selectedVariant)

  const discount = effectiveCompareAtPrice
    ? Math.round(((effectiveCompareAtPrice - effectivePrice) / effectiveCompareAtPrice) * 100)
    : 0

  // Track product view
  useEffect(() => {
    analytics.trackViewProduct({
      id: product.id,
      name: product.title,
      price: effectivePrice,
      category: product.categories?.[0],
      variant: selectedVariant?.id
    })
  }, [product.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = () => {
    if (isOutOfStock || needsVariantSelection) return
    setIsAdding(true)
    addToCart(product, quantity, selectedVariant)

    // Track add to cart event
    analytics.trackAddToCart({
      id: product.id,
      name: product.title,
      price: effectivePrice,
      category: product.categories?.[0],
      variant: selectedVariant?.id,
      quantity
    })

    setTimeout(() => setIsAdding(false), 500)
  }

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href={baseUrl} className="hover:text-gray-900">Home</Link>
        <span>/</span>
        <Link href={`${baseUrl}/products`} className="hover:text-gray-900">Products</Link>
        <span>/</span>
        <span className="text-gray-900">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
            {currentImage ? (
              <Image
                src={currentImage}
                alt={product.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {discount > 0 && (
                <span className="px-3 py-1 text-sm font-semibold bg-red-500 text-white rounded">
                  -{discount}%
                </span>
              )}
              {isOutOfStock && (
                <span className="px-3 py-1 text-sm font-semibold bg-gray-800 text-white rounded">
                  Sold Out
                </span>
              )}
            </div>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${selectedImageIndex === index
                    ? 'border-[var(--color-primary)]'
                    : 'border-transparent'
                    }`}
                >
                  <Image
                    src={image.url}
                    alt={`${product.title} thumbnail ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {/* Categories */}
          {product.categories && product.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {product.categories.map((category) => (
                <Link
                  key={category}
                  href={`${baseUrl}/products?category=${encodeURIComponent(category)}`}
                  className="text-xs uppercase tracking-wider text-gray-500 hover:text-gray-900"
                >
                  {category}
                </Link>
              ))}
            </div>
          )}

          {/* Title */}
          <h1
            className="text-2xl md:text-3xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {product.title}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span
              className="text-3xl font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              {formatPrice(effectivePrice)}
            </span>
            {effectiveCompareAtPrice && (
              <>
                <span className="text-xl text-gray-500 line-through">
                  {formatPrice(effectiveCompareAtPrice)}
                </span>
                <span className="px-2 py-1 text-sm font-medium bg-red-100 text-red-700 rounded">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p
            className="text-gray-600 mb-8 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {product.description}
          </p>

          {/* Variant Selector */}
          {hasVariants && variantOptions.length > 0 && (
            <div className="mb-6">
              <VariantSelector
                options={variantOptions}
                variants={variants}
                selection={variantSelection}
                onChange={setVariantSelection}
              />
            </div>
          )}

          {/* Stock Status */}
          {effectiveTrackQuantity && (
            <div className="mb-6">
              {needsVariantSelection ? (
                <p className="text-gray-500">Select options to see availability</p>
              ) : effectiveQuantity > 0 ? (
                <p className="flex items-center text-green-600">
                  <Check className="w-4 h-4 mr-2" />
                  In Stock ({effectiveQuantity} available)
                </p>
              ) : (
                <p className="text-red-600">Out of Stock</p>
              )}
            </div>
          )}

          {/* Quantity & Add to Cart */}
          {(!isOutOfStock || needsVariantSelection) && (
            <div className="space-y-4 mb-8">
              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-100"
                    disabled={needsVariantSelection}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                    className="p-3 hover:bg-gray-100"
                    disabled={needsVariantSelection}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || needsVariantSelection || isOutOfStock}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-lg font-semibold text-white transition-all ${inCart ? 'bg-green-500' : ''
                    } ${needsVariantSelection || isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''} ${isAdding ? 'scale-95' : 'hover:scale-105'}`}
                  style={!inCart ? { backgroundColor: 'var(--color-primary)' } : {}}
                >
                  {inCart ? (
                    <>
                      <Check className="w-5 h-5" />
                      Added to Cart
                    </>
                  ) : needsVariantSelection ? (
                    'Select Options'
                  ) : isOutOfStock ? (
                    'Out of Stock'
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </>
                  )}
                </button>
                <button className="p-4 border rounded-lg hover:bg-gray-50">
                  <Heart className="w-5 h-5" />
                </button>
                <button className="p-4 border rounded-lg hover:bg-gray-50">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="w-5 h-5 text-gray-400" />
              <span>
                Free shipping over {formatPrice(settings.shipping?.free_shipping_threshold || 999)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-5 h-5 text-gray-400" />
              <span>Secure payment</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RotateCcw className="w-5 h-5 text-gray-400" />
              <span>Easy returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t">
          <h2
            className="text-2xl font-bold mb-8"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            You Might Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Customer Reviews */}
      <section className="mt-16 pt-12 border-t">
        <ReviewsList productId={product.id} />
      </section>
    </div>
  )
}
