'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, X, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react'
import { useStore, useIsHydrated } from '@/lib/contexts/store-context'
import { formatVariantAttributes } from '@/lib/products/variant-utils'

export default function MiniCart() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const {
    store,
    cart,
    cartCount,
    cartSubtotal,
    removeFromCart,
    updateQuantity,
    getItemPrice,
    formatPrice
  } = useStore()
  const isHydrated = useIsHydrated()
  const baseUrl = `/${store.slug}`

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Cart Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-[var(--color-primary)] transition-colors"
        aria-label="Shopping cart"
        aria-expanded={isOpen}
      >
        <ShoppingCart className="w-6 h-6" />
        {isHydrated && cartCount > 0 && (
          <span
            className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3
              className="font-semibold text-gray-900"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Shopping Cart ({isHydrated ? cartCount : 0})
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          {!isHydrated ? (
            <div className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="p-8 text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary-light)' }}
              >
                <ShoppingBag className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
              </div>
              <p className="text-gray-600 mb-4">Your cart is empty</p>
              <Link
                href={`${baseUrl}/products`}
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center text-sm font-medium hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                Start Shopping
                <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="max-h-80 overflow-y-auto">
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
                      className="flex gap-3 p-4 border-b last:border-b-0 hover:bg-gray-50"
                    >
                      {/* Image */}
                      <Link
                        href={`${baseUrl}/products/${item.product.id}`}
                        onClick={() => setIsOpen(false)}
                        className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100"
                      >
                        {primaryImage ? (
                          <Image
                            src={primaryImage}
                            alt={item.product.title}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`${baseUrl}/products/${item.product.id}`}
                          onClick={() => setIsOpen(false)}
                          className="text-sm font-medium text-gray-900 hover:text-[var(--color-primary)] line-clamp-1"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {item.product.title}
                        </Link>

                        {/* Variant Attributes */}
                        {item.variant && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatVariantAttributes(item.variant.attributes)}
                          </p>
                        )}

                        <p
                          className="text-sm font-semibold mt-0.5"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {formatPrice(itemPrice)}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center border rounded">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, variantId)}
                              className="p-1 hover:bg-gray-100"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.product.id, Math.min(maxQuantity, item.quantity + 1), variantId)
                              }
                              disabled={item.quantity >= maxQuantity}
                              className="p-1 hover:bg-gray-100 disabled:opacity-50"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id, variantId)}
                            className="text-xs text-gray-400 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatPrice(itemPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50">
                {/* Subtotal */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Subtotal</span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {formatPrice(cartSubtotal)}
                  </span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`${baseUrl}/cart`}
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-center text-sm font-medium border rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    View Cart
                  </Link>
                  <Link
                    href={`${baseUrl}/checkout`}
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-center text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
