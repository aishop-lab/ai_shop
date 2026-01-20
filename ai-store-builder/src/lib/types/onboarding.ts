// Onboarding TypeScript Types

export interface OnboardingMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: string
  metadata?: {
    step?: number
    extracted_data?: Partial<StoreData>
    suggestions?: string[]
  }
}

export interface OnboardingSession {
  id: string
  user_id: string
  current_step: number
  messages: OnboardingMessage[]
  extracted_data: Partial<StoreData>
  status: 'in_progress' | 'completed' | 'abandoned'
  created_at: string
  updated_at: string
}

export interface StoreData {
  // Identity
  business_name: string
  slug: string
  tagline: string
  description: string

  // Category
  business_type: string
  business_category: string[]
  niche: string
  keywords: string[]

  // Location
  target_geography: 'local' | 'india' | 'international'
  country: string
  currency: string
  timezone: string

  // Branding
  logo_url: string | null
  brand_vibe: 'modern' | 'classic' | 'playful' | 'minimal'
  primary_color: string
  secondary_color: string

  // Contact
  contact_email: string
  contact_phone: string
  whatsapp: string | null
  instagram: string | null

  // Business
  gstin: string | null

  // Theme selection (new step 10)
  theme_variant: string | null  // e.g., 'modern-spotlight'

  // Internal flags (not persisted)
  _ai_extraction_success?: boolean
  _ai_brand_colors?: { primary: string; secondary: string; reasoning: string }
  _ai_tagline?: string
  _ai_confidence?: number
  _logo_colors?: {
    colors: Array<{ hex: string; name: string; percentage: number }>
    suggested_primary: string
    suggested_secondary: string
  }
}

export interface CategoryExtractionResult {
  business_type: string
  business_category: string[]
  niche: string
  keywords: string[]
  confidence: number
}

export interface NameSuggestion {
  name: string
  slug: string
  available: boolean
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
    variant_id?: string  // Selected theme variant ID (e.g., 'modern-spotlight')
    layout?: {           // Layout configuration from selected variant
      hero_style: string
      product_grid_style: string
      header_style: string
      footer_style: string
      show_featured_categories: boolean
      show_testimonials: boolean
      show_newsletter: boolean
      border_radius: string
      shadow_style: string
    }
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
}

export interface OnboardingStep {
  id: number
  key: string
  question: string
  type: 'text' | 'select' | 'file' | 'color' | 'multi-input' | 'action' | 'template-select'
  required: boolean
  options?: Array<{ value: string; label: string }>
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    patternMessage?: string
  }
  skipIf?: (data: Partial<StoreData>) => boolean
  aiExtraction?: boolean
}

export interface ProcessMessageResponse {
  next_question: string
  extracted_data: Partial<StoreData>
  current_step: number
  is_complete: boolean
  suggestions?: string[]
  options?: Array<{ value: string; label: string }>
  ai_confidence?: {
    score: number           // 0-1 confidence score
    level: 'high' | 'medium' | 'low'  // Simplified level
    reasoning?: string      // Optional explanation
  }
}

// ============================================
// THEME VARIANT TYPES
// ============================================

export type BrandVibe = 'modern' | 'classic' | 'playful' | 'minimal'

export type HeroStyle = 'centered' | 'split' | 'asymmetric' | 'fullwidth' | 'minimal'
export type ProductGridStyle = 'standard' | 'masonry' | 'compact' | 'featured' | 'list'
export type HeaderStyle = 'standard' | 'centered' | 'minimal' | 'sticky' | 'transparent'
export type FooterStyle = 'standard' | 'minimal' | 'expanded' | 'centered'

export interface LayoutConfig {
  hero_style: HeroStyle
  product_grid_style: ProductGridStyle
  header_style: HeaderStyle
  footer_style: FooterStyle
  // Additional layout options
  show_featured_categories: boolean
  show_testimonials: boolean
  show_newsletter: boolean
  border_radius: 'none' | 'small' | 'medium' | 'large'
  shadow_style: 'none' | 'subtle' | 'medium' | 'dramatic'
}

export interface ThemeVariant {
  id: string                    // e.g., 'modern-spotlight'
  vibe: BrandVibe               // Parent vibe
  name: string                  // e.g., 'Spotlight'
  description: string           // Brief description for user
  previewImage: string          // Path to static preview image
  layoutConfig: LayoutConfig    // Layout configuration
}

export type ThemeVariantId =
  // Modern variants
  | 'modern-spotlight' | 'modern-editorial' | 'modern-gallery' | 'modern-compact'
  // Classic variants  
  | 'classic-heritage' | 'classic-boutique' | 'classic-timeless' | 'classic-regal'
  // Playful variants
  | 'playful-vibrant' | 'playful-bubbly' | 'playful-popart' | 'playful-candy'
  // Minimal variants
  | 'minimal-zen' | 'minimal-essential' | 'minimal-clean' | 'minimal-pure'
