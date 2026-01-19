'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Loader2, AlertCircle } from 'lucide-react'
import { useStore, useIsHydrated } from '@/lib/contexts/store-context'
import { toast } from 'sonner'
import type { CartValidationResult } from '@/lib/types/cart'
import { formatVariantAttributes } from '@/lib/products/variant-utils'

export default function StoreCartPage() {
  const router = useRouter()
  const {
    store,
    cart,
    cartSubtotal,
    cartTotal,
    shippingCost,
    updateQuantity,
    removeFromCart,
    getItemPrice,
    formatPrice,
    settings
  } = useStore()
  const isHydrated = useIsHydrated()
  const baseUrl = `/${store.slug}`

  const [isValidating, setIsValidating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const freeShippingThreshold = settings.shipping?.free_shipping_threshold || 999
  const amountToFreeShipping = freeShippingThreshold - cartSubtotal

  // Validate cart before checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return

    setIsValidating(true)
    setValidationErrors([])

    try {
      const response = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          items: cart.map(item => ({
            product_id: item.product.id,
            variant_id: item.variant?.id,
            quantity: item.quantity
          }))
        })
      })

      const data: CartValidationResult = await response.json()

      if (!data.success) {
        toast.error('Failed to validate cart')
        return
      }

      if (!data.valid) {
        // Show validation errors
        const errors: string[] = [...(data.errors || [])]

        // Check for item-specific issues
        data.items.forEach(item => {
          if (item.issues && item.issues.length > 0) {
            errors.push(`${item.product.title}: ${item.issues.join(', ')}`)
          }
        })

        setValidationErrors(errors)
        toast.error('Some items need attention', {
          description: errors[0]
        })
        return
      }

      // Cart is valid, proceed to checkout
      router.push(`${baseUrl}/checkout`)

    } catch (error) {
      console.error('Cart validation error:', error)
      toast.error('Failed to validate cart')
    } finally {
      setIsValidating(false)
    }
  }
  
  if (!isHydrated) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (cart.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div 
          className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <ShoppingBag className="w-12 h-12" style={{ color: 'var(--color-primary)' }} />
        </div>
        <h1 
          className="text-2xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Your cart is empty
        </h1>
        <p className="text-gray-600 mb-8">
          Looks like you haven&apos;t added anything to your cart yet.
        </p>
        <Link
          href={`${baseUrl}/products`}
          className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Start Shopping
          <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </div>
    )
  }
  
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 
        className="text-3xl md:text-4xl font-bold mb-8"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Shopping Cart
      </h1>
      
      {/* Free Shipping Progress */}
      {amountToFreeShipping > 0 && (
        <div className="mb-8 p-4 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5 text-gray-400" />
            <p className="text-sm">
              Add <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{formatPrice(amountToFreeShipping)}</span> more for free shipping!
            </p>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${Math.min(100, (cartSubtotal / freeShippingThreshold) * 100)}%`,
                backgroundColor: 'var(--color-primary)' 
              }}
            />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => {
            const primaryImage = item.product.images?.[0]?.url
            // Use variant quantity if available, otherwise product quantity
            const trackQuantity = item.variant?.track_quantity ?? item.product.track_quantity
            const availableQty = item.variant ? item.variant.quantity : item.product.quantity
            const maxQuantity = trackQuantity ? availableQty : 99
            const itemPrice = getItemPrice(item)
            const variantId = item.variant?.id
            const cartItemKey = variantId ? `${item.product.id}_${variantId}` : item.product.id

            return (
              <div
                key={cartItemKey}
                className="flex gap-4 p-4 border rounded-lg"
              >
                {/* Image */}
                <Link
                  href={`${baseUrl}/products/${item.product.id}`}
                  className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden bg-gray-100"
                >
                  {primaryImage ? (
                    <Image
                      src={primaryImage}
                      alt={item.product.title}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`${baseUrl}/products/${item.product.id}`}
                    className="font-semibold hover:text-[var(--color-primary)] line-clamp-2"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {item.product.title}
                  </Link>

                  {/* Variant Attributes */}
                  {item.variant && (
                    <p className="text-sm text-gray-500 mt-1">
                      {formatVariantAttributes(item.variant.attributes)}
                      {item.variant.sku && (
                        <span className="ml-2 text-xs text-gray-400">
                          SKU: {item.variant.sku}
                        </span>
                      )}
                    </p>
                  )}

                  <p className="text-lg font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
                    {formatPrice(itemPrice)}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1, variantId)}
                        className="p-2 hover:bg-gray-100"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, Math.min(maxQuantity, item.quantity + 1), variantId)}
                        disabled={item.quantity >= maxQuantity}
                        className="p-2 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id, variantId)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Line Total */}
                <div className="hidden sm:block text-right">
                  <p className="font-semibold">
                    {formatPrice(itemPrice * item.quantity)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 p-6 border rounded-lg bg-gray-50">
            <h2 
              className="text-xl font-bold mb-6"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Order Summary
            </h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(cartSubtotal)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {shippingCost === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>
              
              {settings.shipping?.cod_enabled && settings.shipping?.cod_fee && (
                <p className="text-xs text-gray-500">
                  COD charges of {formatPrice(settings.shipping.cod_fee)} will be added at checkout if applicable.
                </p>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span style={{ color: 'var(--color-primary)' }}>{formatPrice(cartTotal)}</span>
                </div>
              </div>
            </div>
            
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    {validationErrors.map((error, i) => (
                      <p key={i}>{error}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={isValidating}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  Proceed to Checkout
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            
            <Link
              href={`${baseUrl}/products`}
              className="block text-center mt-4 text-sm text-gray-600 hover:text-[var(--color-primary)]"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
