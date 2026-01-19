'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import type { Store, Product, StorePageData, StoreSettings } from '@/lib/types/store'
import type { ProductVariant } from '@/lib/types/variant'

// Cart item type (supports variants)
export interface CartItem {
  product: Product
  variant?: ProductVariant         // Optional variant
  quantity: number
}

// Helper to generate unique cart item key
function getCartItemKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}_${variantId}` : productId
}

// Store context type
interface StoreContextType {
  // Store data
  store: Store
  products: Product[]
  featuredProducts: Product[]
  categories: string[]
  settings: StoreSettings

  // Cart state
  cart: CartItem[]
  cartCount: number
  cartSubtotal: number
  cartTotal: number
  shippingCost: number

  // Cart actions (variant-aware)
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void
  removeFromCart: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void

  // Utilities (variant-aware)
  isInCart: (productId: string, variantId?: string) => boolean
  getCartItem: (productId: string, variantId?: string) => CartItem | undefined
  getItemPrice: (item: CartItem) => number
  formatPrice: (price: number) => string
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

// Local storage key for cart
const getCartStorageKey = (storeId: string) => `cart_${storeId}`

interface StoreProviderProps {
  children: ReactNode
  initialData: StorePageData
}

export function StoreProvider({ children, initialData }: StoreProviderProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  
  const { store, products, featured_products, categories, settings } = initialData
  
  // Currency formatting
  const currency = store.blueprint?.location?.currency || 'INR'
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price)
  }, [currency])
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const storageKey = getCartStorageKey(store.id)
    try {
      const savedCart = localStorage.getItem(storageKey)
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart) as CartItem[]
        // Validate cart items still exist in products
        const validCart = parsedCart.filter(item => 
          products.some(p => p.id === item.product.id)
        )
        setCart(validCart)
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error)
    }
    setIsHydrated(true)
  }, [store.id, products])
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isHydrated) return
    
    const storageKey = getCartStorageKey(store.id)
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart))
    } catch (error) {
      console.error('Failed to save cart to storage:', error)
    }
  }, [cart, store.id, isHydrated])
  
  // Helper function to get effective price for a cart item
  const getItemPrice = useCallback((item: CartItem): number => {
    // Use variant price if available, otherwise use product price
    if (item.variant?.price != null) {
      return item.variant.price
    }
    return item.product.price
  }, [])

  // Calculate cart totals (variant-aware)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartSubtotal = cart.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0)
  
  // Calculate shipping
  const freeShippingThreshold = settings.shipping?.free_shipping_threshold || 999
  const flatRateShipping = settings.shipping?.flat_rate_national || 49
  const shippingCost = cartSubtotal >= freeShippingThreshold ? 0 : (cartCount > 0 ? flatRateShipping : 0)
  
  const cartTotal = cartSubtotal + shippingCost
  
  // Add item to cart (variant-aware)
  const addToCart = useCallback((product: Product, quantity: number = 1, variant?: ProductVariant) => {
    setCart(prevCart => {
      const key = getCartItemKey(product.id, variant?.id)
      const existingIndex = prevCart.findIndex(item =>
        getCartItemKey(item.product.id, item.variant?.id) === key
      )

      if (existingIndex >= 0) {
        // Update existing item
        const newCart = [...prevCart]
        const newQuantity = newCart[existingIndex].quantity + quantity

        // Get max quantity from variant or product
        const trackQuantity = variant?.track_quantity ?? product.track_quantity
        const availableQty = variant ? variant.quantity : product.quantity
        const maxQuantity = trackQuantity ? availableQty : 999

        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: Math.min(newQuantity, maxQuantity)
        }
        return newCart
      } else {
        // Add new item
        return [...prevCart, { product, variant, quantity }]
      }
    })
  }, [])
  
  // Remove item from cart (variant-aware)
  const removeFromCart = useCallback((productId: string, variantId?: string) => {
    const key = getCartItemKey(productId, variantId)
    setCart(prevCart => prevCart.filter(item =>
      getCartItemKey(item.product.id, item.variant?.id) !== key
    ))
  }, [])
  
  // Update item quantity (variant-aware)
  const updateQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId)
      return
    }

    const key = getCartItemKey(productId, variantId)
    setCart(prevCart => {
      return prevCart.map(item => {
        if (getCartItemKey(item.product.id, item.variant?.id) === key) {
          // Get max quantity from variant or product
          const trackQuantity = item.variant?.track_quantity ?? item.product.track_quantity
          const availableQty = item.variant ? item.variant.quantity : item.product.quantity
          const maxQuantity = trackQuantity ? availableQty : 999
          return {
            ...item,
            quantity: Math.min(quantity, maxQuantity)
          }
        }
        return item
      })
    })
  }, [removeFromCart])
  
  // Clear cart
  const clearCart = useCallback(() => {
    setCart([])
  }, [])
  
  // Check if product is in cart (variant-aware)
  const isInCart = useCallback((productId: string, variantId?: string) => {
    const key = getCartItemKey(productId, variantId)
    return cart.some(item => getCartItemKey(item.product.id, item.variant?.id) === key)
  }, [cart])

  // Get cart item by product ID and variant ID
  const getCartItem = useCallback((productId: string, variantId?: string) => {
    const key = getCartItemKey(productId, variantId)
    return cart.find(item => getCartItemKey(item.product.id, item.variant?.id) === key)
  }, [cart])
  
  const value: StoreContextType = {
    store,
    products,
    featuredProducts: featured_products,
    categories,
    settings,
    cart,
    cartCount,
    cartSubtotal,
    cartTotal,
    shippingCost,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
    getCartItem,
    getItemPrice,
    formatPrice
  }
  
  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

// Hook to check if we're on the client and hydrated
export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  return isHydrated
}
