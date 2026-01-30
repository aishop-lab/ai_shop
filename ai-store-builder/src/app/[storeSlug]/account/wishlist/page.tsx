'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCustomer } from '@/lib/contexts/customer-context'
import { useStore } from '@/lib/contexts/store-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Trash2,
  Loader2,
  Package
} from 'lucide-react'

interface WishlistProduct {
  id: string
  title: string
  slug: string
  price: number
  compare_at_price?: number
  status: string
  quantity: number
  product_images: Array<{
    url: string
    alt_text?: string
  }>
}

interface WishlistItem {
  id: string
  created_at: string
  product: WishlistProduct
}

export default function CustomerWishlistPage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string
  const { isLoading: customerLoading, isAuthenticated } = useCustomer()
  const { store } = useStore()

  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  useEffect(() => {
    if (!customerLoading && !isAuthenticated) {
      router.push(`/${storeSlug}/account/login?redirect=/${storeSlug}/account/wishlist`)
    }
  }, [customerLoading, isAuthenticated, router, storeSlug])

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist()
    }
  }, [isAuthenticated])

  const fetchWishlist = async () => {
    try {
      const response = await fetch('/api/customer/wishlist')
      if (response.ok) {
        const data = await response.json()
        setWishlist(data.wishlist || [])
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error)
      toast.error('Failed to load wishlist')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async (productId: string) => {
    setRemovingId(productId)
    try {
      const response = await fetch(`/api/customer/wishlist?productId=${productId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove from wishlist')
      }

      toast.success('Removed from wishlist')
      setWishlist(prev => prev.filter(item => item.product.id !== productId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove')
    } finally {
      setRemovingId(null)
      setConfirmRemoveId(null)
    }
  }

  const handleAddToCart = (product: WishlistProduct) => {
    // Get existing cart from localStorage
    const cartKey = `cart_${store?.id}`
    const existingCart = localStorage.getItem(cartKey)
    const cart = existingCart ? JSON.parse(existingCart) : []

    // Check if product already in cart
    const existingIndex = cart.findIndex((item: { productId: string }) => item.productId === product.id)

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1
    } else {
      cart.push({
        productId: product.id,
        title: product.title,
        price: product.price,
        quantity: 1,
        image: product.product_images?.[0]?.url
      })
    }

    localStorage.setItem(cartKey, JSON.stringify(cart))
    toast.success('Added to cart')

    // Dispatch event for cart update
    window.dispatchEvent(new CustomEvent('cart-updated'))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (customerLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${storeSlug}/account`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground">
            {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
      </div>

      {/* Wishlist Items */}
      {wishlist.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground text-center mb-4">
              Save items you love to your wishlist
            </p>
            <Link href={`/${storeSlug}/products`}>
              <Button>
                <Package className="h-4 w-4 mr-2" />
                Browse Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((item) => {
            const product = item.product
            const primaryImage = product.product_images?.[0]
            const isOutOfStock = product.quantity <= 0
            const hasDiscount = product.compare_at_price && product.compare_at_price > product.price

            return (
              <Card key={item.id} className="overflow-hidden group">
                <div className="relative aspect-square bg-gray-100">
                  {primaryImage ? (
                    <Link href={`/${storeSlug}/products/${product.slug}`}>
                      <Image
                        src={primaryImage.url}
                        alt={primaryImage.alt_text || product.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </Link>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}

                  {/* Remove button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setConfirmRemoveId(product.id)}
                    disabled={removingId === product.id}
                  >
                    {removingId === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>

                  {/* Discount badge */}
                  {hasDiscount && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      {Math.round((1 - product.price / product.compare_at_price!) * 100)}% OFF
                    </div>
                  )}

                  {/* Out of stock overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-medium">Out of Stock</span>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <Link href={`/${storeSlug}/products/${product.slug}`}>
                    <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors mb-2">
                      {product.title}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold">
                      {formatCurrency(product.price)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(product.compare_at_price!)}
                      </span>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Remove Confirmation */}
      <AlertDialog open={!!confirmRemoveId} onOpenChange={() => setConfirmRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Wishlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from your wishlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemoveId && handleRemove(confirmRemoveId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
