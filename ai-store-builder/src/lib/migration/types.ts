// TypeScript interfaces for Store Migration feature

export type MigrationPlatform = 'shopify' | 'etsy'

export type MigrationStatus =
  | 'connected'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface StoreMigration {
  id: string
  store_id: string
  platform: MigrationPlatform
  source_shop_id: string | null
  source_shop_name: string | null
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | null
  status: MigrationStatus
  total_products: number
  migrated_products: number
  failed_products: number
  total_collections: number
  migrated_collections: number
  failed_collections: number
  total_images: number
  migrated_images: number
  failed_images: number
  errors: MigrationError[]
  product_id_map: Record<string, string>
  collection_id_map: Record<string, string>
  last_cursor: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface MigrationError {
  type: 'product' | 'collection' | 'image' | 'auth' | 'rate_limit'
  source_id?: string
  source_title?: string
  message: string
  timestamp: string
}

// Normalized product format from any source platform
export interface MigrationProduct {
  source_id: string
  title: string
  description: string
  price: number
  compare_at_price?: number
  sku?: string
  quantity: number
  track_quantity: boolean
  weight?: number
  categories: string[]
  tags: string[]
  images: MigrationImage[]
  variants: MigrationVariant[]
  status: 'active' | 'draft'
}

export interface MigrationImage {
  source_url: string
  alt_text?: string
  position: number
}

export interface MigrationVariant {
  source_id: string
  title: string
  sku?: string
  price: number
  compare_at_price?: number
  quantity: number
  options: Record<string, string> // e.g. { size: 'L', color: 'Red' }
  weight?: number
}

// Normalized collection format
export interface MigrationCollection {
  source_id: string
  title: string
  description?: string
  product_source_ids: string[]
}

// Migration configuration chosen by user before starting
export interface MigrationConfig {
  migration_id: string
  import_products: boolean
  import_collections: boolean
  product_status: 'draft' | 'active' // What status to assign imported products
}

// Progress state returned by status endpoint
export interface MigrationProgress {
  id: string
  platform: MigrationPlatform
  status: MigrationStatus
  source_shop_name: string | null
  total_products: number
  migrated_products: number
  failed_products: number
  total_collections: number
  migrated_collections: number
  failed_collections: number
  total_images: number
  migrated_images: number
  failed_images: number
  errors: MigrationError[]
  started_at: string | null
  completed_at: string | null
  current_phase: 'products' | 'collections' | 'done'
}

// Shopify-specific types
export interface ShopifyProduct {
  id: string
  title: string
  descriptionHtml: string
  productType: string
  tags: string[]
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  variants: {
    edges: Array<{
      node: {
        id: string
        title: string
        sku: string | null
        price: string
        compareAtPrice: string | null
        inventoryQuantity: number
        weight: number | null
        weightUnit: string
        selectedOptions: Array<{ name: string; value: string }>
      }
    }>
  }
  images: {
    edges: Array<{
      node: {
        url: string
        altText: string | null
      }
    }>
  }
}

export interface ShopifyCollection {
  id: string
  title: string
  descriptionHtml: string
  products: {
    edges: Array<{
      node: { id: string }
    }>
  }
}

// Etsy-specific types
export interface EtsyListing {
  listing_id: number
  title: string
  description: string
  price: { amount: number; divisor: number; currency_code: string }
  quantity: number
  tags: string[]
  taxonomy_id: number | null
  state: 'active' | 'draft' | 'inactive' | 'expired' | 'sold_out'
  property_values: Array<{
    property_id: number
    property_name: string
    values: string[]
    scale_id: number | null
  }>
  images?: EtsyImage[]
}

export interface EtsyImage {
  listing_image_id: number
  url_fullxfull: string
  alt_text: string | null
  rank: number
}

export interface EtsySection {
  shop_section_id: number
  title: string
  active_listing_count: number
}
