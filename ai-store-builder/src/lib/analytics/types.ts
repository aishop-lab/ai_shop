// Marketing Pixels Configuration
export interface MarketingPixels {
  facebook_pixel_id: string | null
  google_analytics_id: string | null
  google_ads_conversion_id: string | null
  google_ads_conversion_label: string | null
}

// Product for tracking
export interface TrackingProduct {
  id: string
  name: string
  price: number
  quantity?: number
  category?: string
  variant?: string
}

// Cart for tracking
export interface TrackingCart {
  items: TrackingProduct[]
  value: number
  currency?: string
}

// Order for tracking
export interface TrackingOrder {
  id: string
  items: TrackingProduct[]
  total: number
  tax: number
  shipping: number
  currency?: string
}

// Analytics events
export type AnalyticsEvent =
  | 'page_view'
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'add_payment_info'
  | 'purchase'
  | 'search'

// Global window extensions for tracking
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}
