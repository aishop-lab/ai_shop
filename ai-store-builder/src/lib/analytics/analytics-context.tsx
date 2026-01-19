'use client'

import { createContext, useContext, useEffect, useCallback, ReactNode } from 'react'
import type { MarketingPixels, TrackingProduct, TrackingCart, TrackingOrder } from './types'

interface AnalyticsContextValue {
  trackPageView: (url?: string) => void
  trackViewProduct: (product: TrackingProduct) => void
  trackAddToCart: (product: TrackingProduct) => void
  trackRemoveFromCart: (product: TrackingProduct) => void
  trackBeginCheckout: (cart: TrackingCart) => void
  trackPurchase: (order: TrackingOrder) => void
  trackSearch: (searchTerm: string) => void
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

interface AnalyticsProviderProps {
  children: ReactNode
  pixels: MarketingPixels | null
  currency?: string
}

export function AnalyticsProvider({ children, pixels, currency = 'INR' }: AnalyticsProviderProps) {
  const fbPixelId = pixels?.facebook_pixel_id
  const gaId = pixels?.google_analytics_id
  const gadsId = pixels?.google_ads_conversion_id
  const gadsLabel = pixels?.google_ads_conversion_label

  // Track page views
  const trackPageView = useCallback((url?: string) => {
    const pageUrl = url || window.location.pathname

    // Facebook Pixel
    if (fbPixelId && window.fbq) {
      window.fbq('track', 'PageView')
    }

    // Google Analytics
    if (gaId && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: pageUrl
      })
    }
  }, [fbPixelId, gaId])

  // Track product view
  const trackViewProduct = useCallback((product: TrackingProduct) => {
    // Facebook Pixel
    if (fbPixelId && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: product.price,
        currency
      })
    }

    // Google Analytics
    if (gaId && window.gtag) {
      window.gtag('event', 'view_item', {
        currency,
        value: product.price,
        items: [{
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity: 1,
          item_category: product.category,
          item_variant: product.variant
        }]
      })
    }
  }, [fbPixelId, gaId, currency])

  // Track add to cart
  const trackAddToCart = useCallback((product: TrackingProduct) => {
    const quantity = product.quantity || 1
    const value = product.price * quantity

    // Facebook Pixel
    if (fbPixelId && window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value,
        currency
      })
    }

    // Google Analytics
    if (gaId && window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency,
        value,
        items: [{
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity,
          item_category: product.category,
          item_variant: product.variant
        }]
      })
    }
  }, [fbPixelId, gaId, currency])

  // Track remove from cart
  const trackRemoveFromCart = useCallback((product: TrackingProduct) => {
    const quantity = product.quantity || 1
    const value = product.price * quantity

    // Google Analytics only (FB doesn't have this event)
    if (gaId && window.gtag) {
      window.gtag('event', 'remove_from_cart', {
        currency,
        value,
        items: [{
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity,
          item_category: product.category
        }]
      })
    }
  }, [gaId, currency])

  // Track begin checkout
  const trackBeginCheckout = useCallback((cart: TrackingCart) => {
    // Facebook Pixel
    if (fbPixelId && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: cart.items.map(i => i.id),
        contents: cart.items.map(i => ({
          id: i.id,
          quantity: i.quantity || 1
        })),
        num_items: cart.items.length,
        value: cart.value,
        currency: cart.currency || currency
      })
    }

    // Google Analytics
    if (gaId && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency: cart.currency || currency,
        value: cart.value,
        items: cart.items.map(i => ({
          item_id: i.id,
          item_name: i.name,
          price: i.price,
          quantity: i.quantity || 1
        }))
      })
    }
  }, [fbPixelId, gaId, currency])

  // Track purchase
  const trackPurchase = useCallback((order: TrackingOrder) => {
    const orderCurrency = order.currency || currency

    // Facebook Pixel
    if (fbPixelId && window.fbq) {
      window.fbq('track', 'Purchase', {
        content_ids: order.items.map(i => i.id),
        contents: order.items.map(i => ({
          id: i.id,
          quantity: i.quantity || 1
        })),
        content_type: 'product',
        num_items: order.items.length,
        value: order.total,
        currency: orderCurrency
      })
    }

    // Google Analytics
    if (gaId && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: order.id,
        value: order.total,
        tax: order.tax,
        shipping: order.shipping,
        currency: orderCurrency,
        items: order.items.map(i => ({
          item_id: i.id,
          item_name: i.name,
          price: i.price,
          quantity: i.quantity || 1
        }))
      })
    }

    // Google Ads Conversion
    if (gadsId && gadsLabel && window.gtag) {
      window.gtag('event', 'conversion', {
        send_to: `${gadsId}/${gadsLabel}`,
        value: order.total,
        currency: orderCurrency,
        transaction_id: order.id
      })
    }
  }, [fbPixelId, gaId, gadsId, gadsLabel, currency])

  // Track search
  const trackSearch = useCallback((searchTerm: string) => {
    // Facebook Pixel
    if (fbPixelId && window.fbq) {
      window.fbq('track', 'Search', {
        search_string: searchTerm
      })
    }

    // Google Analytics
    if (gaId && window.gtag) {
      window.gtag('event', 'search', {
        search_term: searchTerm
      })
    }
  }, [fbPixelId, gaId])

  const value: AnalyticsContextValue = {
    trackPageView,
    trackViewProduct,
    trackAddToCart,
    trackRemoveFromCart,
    trackBeginCheckout,
    trackPurchase,
    trackSearch
  }

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext)

  if (!context) {
    // Return no-op functions if not in provider (e.g., dashboard)
    return {
      trackPageView: () => {},
      trackViewProduct: () => {},
      trackAddToCart: () => {},
      trackRemoveFromCart: () => {},
      trackBeginCheckout: () => {},
      trackPurchase: () => {},
      trackSearch: () => {}
    }
  }

  return context
}
