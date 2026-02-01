'use client'

import { useState, useEffect } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { useCustomer } from '@/lib/contexts/customer-context'
import { useStore } from '@/lib/contexts/store-context'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface WishlistButtonProps {
  productId: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function WishlistButton({
  productId,
  className = '',
  size = 'md',
  showLabel = false
}: WishlistButtonProps) {
  const { isAuthenticated, isLoading: authLoading } = useCustomer()
  const { store } = useStore()
  const router = useRouter()
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const baseUrl = `/${store.slug}`

  // Check if product is in wishlist
  useEffect(() => {
    if (!isAuthenticated) {
      setIsChecking(false)
      return
    }

    const checkWishlist = async () => {
      try {
        const response = await fetch('/api/customer/wishlist')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.items) {
            const inWishlist = data.items.some((item: { product_id: string }) => item.product_id === productId)
            setIsInWishlist(inWishlist)
          }
        }
      } catch (error) {
        console.error('Failed to check wishlist:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkWishlist()
  }, [isAuthenticated, productId])

  const handleClick = async () => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push(`${baseUrl}/account/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setIsLoading(true)

    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(`/api/customer/wishlist?productId=${productId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          setIsInWishlist(false)
          toast.success('Removed from wishlist')
        } else {
          const data = await response.json()
          toast.error(data.error || 'Failed to remove from wishlist')
        }
      } else {
        // Add to wishlist
        const response = await fetch('/api/customer/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        })

        if (response.ok) {
          setIsInWishlist(true)
          toast.success('Added to wishlist')
        } else {
          const data = await response.json()
          toast.error(data.error || 'Failed to add to wishlist')
        }
      }
    } catch (error) {
      console.error('Wishlist error:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  if (authLoading || isChecking) {
    return (
      <button
        disabled
        className={`border rounded-lg hover:bg-gray-50 transition-colors ${sizeClasses[size]} ${className}`}
      >
        <Loader2 className={`${iconSizes[size]} animate-spin text-gray-400`} />
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`border rounded-lg hover:bg-gray-50 transition-all ${sizeClasses[size]} ${className} ${
        isInWishlist ? 'border-red-200 bg-red-50' : ''
      }`}
      title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <div className="flex items-center gap-2">
          <Heart
            className={`${iconSizes[size]} transition-colors ${
              isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'
            }`}
          />
          {showLabel && (
            <span className="text-sm font-medium">
              {isInWishlist ? 'Saved' : 'Save'}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
