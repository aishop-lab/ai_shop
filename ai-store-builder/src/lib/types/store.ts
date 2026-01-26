// Store and Product TypeScript Types

export interface StorePageData {
  store: Store
  products: Product[]
  featured_products: Product[]
  categories: string[]
  settings: StoreSettings
}

export interface MarketingPixels {
  facebook_pixel_id: string | null
  google_analytics_id: string | null
  google_ads_conversion_id: string | null
  google_ads_conversion_label: string | null
}

export interface StorePolicy {
  content: string
  updated_at: string | null
}

export interface StorePolicies {
  returns: StorePolicy
  privacy: StorePolicy
  terms: StorePolicy
  shipping: StorePolicy
}

export interface Store {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string
  tagline?: string
  logo_url?: string
  blueprint: StoreBlueprint
  brand_colors: {
    primary: string
    secondary: string
  }
  typography: {
    heading_font: string
    body_font: string
  }
  theme_template: string
  contact_email: string
  contact_phone?: string
  whatsapp_number?: string
  instagram_handle?: string
  facebook_url?: string
  settings: StoreSettings
  marketing_pixels?: MarketingPixels
  policies?: StorePolicies
  status: 'draft' | 'active' | 'suspended'
  created_at: string
  updated_at: string
}

// AI-generated content types
export interface AIContentAboutUs {
  headline: string
  story: string
  mission: string
  short_description: string
  medium_description: string
  values: Array<{
    title: string
    description: string
    icon: string
  }>
  cta: {
    text: string
    action: string
  }
}

export interface AIContentHomepage {
  hero: {
    headline: string
    subheadline: string
    cta_text: string
  }
  featured_categories: string[]
  trust_badges: Array<{
    icon: string
    title: string
  }>
  value_propositions: Array<{
    icon: string
    title: string
    description: string
  }>
  social_proof: {
    testimonials: Array<{
      quote: string
      author: string
      location?: string
    }>
  }
}

export interface AIContent {
  about_us: AIContentAboutUs
  homepage: AIContentHomepage
  policies?: {
    return_policy: string
    shipping_policy: string
    privacy_policy: string
    terms_of_service: string
  }
  faqs?: Array<{
    question: string
    answer: string
    category?: string
  }>
}

export interface StoreBlueprint {
  version: string
  identity: {
    business_name: string
    slug: string
    tagline: string
    description: string
  }
  category: {
    business_type: string
    business_category: string[]
    niche: string
    keywords: string[]
  }
  branding: {
    logo_url: string | null
    colors: {
      primary: string
      secondary: string
    }
    typography: {
      heading_font: string
      body_font: string
    }
  }
  theme: {
    template: string
    vibe: string
  }
  location: {
    target_geography: string
    country: string
    currency: string
    timezone: string
  }
  contact: {
    email: string
    phone: string
    whatsapp: string | null
    instagram: string | null
  }
  business: {
    gstin: string | null
  }
  settings: {
    checkout: {
      guest_checkout_enabled: boolean
      phone_required: boolean
    }
    shipping: {
      free_shipping_threshold: number
      flat_rate_national: number
      cod_enabled: boolean
    }
    payments: {
      razorpay_enabled: boolean
      upi_enabled: boolean
      stripe_enabled: boolean
    }
  }
  // AI-generated content
  ai_content?: AIContent
}

export interface Product {
  id: string
  store_id: string
  title: string
  description: string
  price: number
  compare_at_price?: number
  cost_per_item?: number
  sku?: string
  barcode?: string
  quantity: number
  track_quantity: boolean
  featured: boolean
  status: 'draft' | 'published'
  images: ProductImage[]
  categories?: string[]
  tags?: string[]
  weight?: number
  requires_shipping: boolean
  has_variants?: boolean        // Flag indicating product has variants
  review_count?: number         // Number of approved reviews
  average_rating?: number       // Average rating (1-5)
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  thumbnail_url?: string
  position: number
  alt_text?: string
}

export interface StoreSettings {
  checkout: {
    guest_checkout_enabled: boolean
    phone_required: boolean
  }
  shipping: {
    free_shipping_threshold: number
    flat_rate_national: number
    cod_enabled: boolean
    cod_fee?: number
  }
  payments: {
    razorpay_enabled: boolean
    stripe_enabled: boolean
    upi_enabled: boolean
  }
}

// API Response types
export interface PaginatedProducts {
  products: Product[]
  total: number
  page: number
  totalPages: number
}

export interface StoreDataResponse {
  store: Store
  products: Product[]
  featured_products: Product[]
  settings: StoreSettings
}

export interface ProductDataResponse {
  store: Store
  product: Product
}

// Default store settings
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  checkout: {
    guest_checkout_enabled: true,
    phone_required: true
  },
  shipping: {
    free_shipping_threshold: 999,
    flat_rate_national: 49,
    cod_enabled: true,
    cod_fee: 20
  },
  payments: {
    razorpay_enabled: true,
    stripe_enabled: false,
    upi_enabled: true
  }
}

// Default brand colors
export const DEFAULT_BRAND_COLORS = {
  primary: '#3B82F6',
  secondary: '#6B7280'
}

// Default typography
export const DEFAULT_TYPOGRAPHY = {
  heading_font: 'Inter',
  body_font: 'Inter'
}
