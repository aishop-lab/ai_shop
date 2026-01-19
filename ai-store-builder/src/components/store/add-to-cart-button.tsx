'use client'

import { useState } from 'react'
import { ShoppingCart, Plus, Minus, Check, Loader2 } from 'lucide-react'
import { useStore, useIsHydrated } from '@/lib/contexts/store-context'
import { toast } from 'sonner'
import type { Product } from '@/lib/types/store'

interface AddToCartButtonProps {
  product: Product
  variant?: 'default' | 'compact' | 'icon-only'
  showQuantityControls?: boolean
  className?: string
}

export default function AddToCartButton({
  product,
  variant = 'default',
  showQuantityControls = true,
  className = ''
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const { addToCart, isInCart, getCartItem, updateQuantity, removeFromCart, formatPrice } = useStore()
  const isHydrated = useIsHydrated()

  const cartItem = getCartItem(product.id)
  const inCart = isInCart(product.id)
  const quantity = cartItem?.quantity || 0

  // Check if product is available
  const isOutOfStock = product.track_quantity && product.quantity === 0
  const maxQuantity = product.track_quantity ? product.quantity : 99
  const canAddMore = quantity < maxQuantity

  const handleAddToCart = async () => {
    if (isOutOfStock || !canAddMore) return

    setIsAdding(true)

    // Simulate brief delay for feedback
    await new Promise((resolve) => setTimeout(resolve, 300))

    addToCart(product, 1)

    setIsAdding(false)
    setJustAdded(true)

    toast.success(`${product.title} added to cart`, {
      description: formatPrice(product.price),
      action: {
        label: 'View Cart',
        onClick: () => {
          // Navigate to cart - handled by parent
        }
      }
    })

    // Reset "just added" state after animation
    setTimeout(() => setJustAdded(false), 2000)
  }

  const handleIncrement = () => {
    if (canAddMore) {
      updateQuantity(product.id, quantity + 1)
    }
  }

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1)
    } else {
      removeFromCart(product.id)
      toast.info(`${product.title} removed from cart`)
    }
  }

  // Loading state
  if (!isHydrated) {
    return (
      <button
        disabled
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white opacity-50 ${className}`}
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        {variant !== 'icon-only' && <span>Loading...</span>}
      </button>
    )
  }

  // Out of stock state
  if (isOutOfStock) {
    return (
      <button
        disabled
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-500 cursor-not-allowed ${className}`}
      >
        {variant === 'icon-only' ? (
          <ShoppingCart className="w-5 h-5" />
        ) : (
          <span>Out of Stock</span>
        )}
      </button>
    )
  }

  // In cart with quantity controls
  if (inCart && showQuantityControls && variant !== 'icon-only') {
    return (
      <div className={`flex items-center ${className}`}>
        <div
          className="flex items-center border rounded-lg overflow-hidden"
          style={{ borderColor: 'var(--color-primary)' }}
        >
          <button
            onClick={handleDecrement}
            className="p-2 hover:bg-gray-100 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span
            className="w-10 text-center font-medium"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {quantity}
          </span>
          <button
            onClick={handleIncrement}
            disabled={!canAddMore}
            className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {variant === 'default' && (
          <span className="ml-3 text-sm text-gray-500">in cart</span>
        )}
      </div>
    )
  }

  // Icon-only variant
  if (variant === 'icon-only') {
    return (
      <button
        onClick={handleAddToCart}
        disabled={isAdding}
        className={`p-2 rounded-lg text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${className}`}
        style={{ backgroundColor: 'var(--color-primary)' }}
        aria-label={inCart ? 'Add another' : 'Add to cart'}
      >
        {isAdding ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : justAdded ? (
          <Check className="w-5 h-5" />
        ) : (
          <ShoppingCart className="w-5 h-5" />
        )}
      </button>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <button
        onClick={handleAddToCart}
        disabled={isAdding}
        className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${className}`}
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {isAdding ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : justAdded ? (
          <>
            <Check className="w-4 h-4" />
            <span>Added</span>
          </>
        ) : inCart ? (
          <>
            <Plus className="w-4 h-4" />
            <span>Add More</span>
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4" />
            <span>Add</span>
          </>
        )}
      </button>
    )
  }

  // Default variant
  return (
    <button
      onClick={handleAddToCart}
      disabled={isAdding}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${className}`}
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      {isAdding ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Adding...</span>
        </>
      ) : justAdded ? (
        <>
          <Check className="w-5 h-5" />
          <span>Added to Cart</span>
        </>
      ) : inCart ? (
        <>
          <Plus className="w-5 h-5" />
          <span>Add Another</span>
        </>
      ) : (
        <>
          <ShoppingCart className="w-5 h-5" />
          <span>Add to Cart</span>
        </>
      )}
    </button>
  )
}
