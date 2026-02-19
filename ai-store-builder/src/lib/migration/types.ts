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
  total_orders: number
  migrated_orders: number
  failed_orders: number
  total_customers: number
  migrated_customers: number
  failed_customers: number
  total_coupons: number
  migrated_coupons: number
  failed_coupons: number
  errors: MigrationError[]
  product_id_map: Record<string, string>
  collection_id_map: Record<string, string>
  customer_id_map: Record<string, string>
  order_id_map: Record<string, string>
  coupon_id_map: Record<string, string>
  last_cursor: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface MigrationError {
  type: 'product' | 'collection' | 'image' | 'auth' | 'rate_limit' | 'order' | 'customer' | 'coupon'
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

// Normalized order format
export interface MigrationOrder {
  source_id: string
  order_number: string
  customer_email: string
  customer_name: string
  customer_phone?: string
  shipping_address: {
    name: string
    phone: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    pincode: string
    country: string
  }
  subtotal: number
  shipping_cost: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  payment_method: string
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  coupon_code?: string
  line_items: MigrationOrderItem[]
  created_at: string
}

export interface MigrationOrderItem {
  source_product_id: string
  title: string
  quantity: number
  unit_price: number
  total_price: number
}

// Normalized customer format
export interface MigrationCustomer {
  source_id: string
  email: string
  full_name: string
  phone?: string
  total_orders: number
  total_spent: number
  addresses: MigrationCustomerAddress[]
}

export interface MigrationCustomerAddress {
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  pincode: string
  country: string
  is_default: boolean
}

// Normalized coupon format
export interface MigrationCoupon {
  source_id: string
  code: string
  description?: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping'
  discount_value: number
  minimum_order_value?: number
  usage_limit?: number
  usage_count: number
  starts_at?: string
  expires_at?: string
  active: boolean
}

// Migration configuration chosen by user before starting
export interface MigrationConfig {
  migration_id: string
  import_products: boolean
  import_collections: boolean
  import_orders: boolean
  import_customers: boolean
  import_coupons: boolean
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
  total_orders: number
  migrated_orders: number
  failed_orders: number
  total_customers: number
  migrated_customers: number
  failed_customers: number
  total_coupons: number
  migrated_coupons: number
  failed_coupons: number
  errors: MigrationError[]
  started_at: string | null
  completed_at: string | null
  current_phase: 'products' | 'collections' | 'customers' | 'coupons' | 'orders' | 'done'
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

export interface ShopifyOrder {
  id: string
  name: string
  createdAt: string
  displayFinancialStatus: 'PENDING' | 'AUTHORIZED' | 'PARTIALLY_PAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'VOIDED' | null
  displayFulfillmentStatus: 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'RESTOCKED' | 'PENDING_FULFILLMENT' | 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | null
  customer: {
    id: string
    email: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
  } | null
  shippingAddress: {
    name: string | null
    phone: string | null
    address1: string | null
    address2: string | null
    city: string | null
    province: string | null
    zip: string | null
    country: string | null
  } | null
  currentTotalPriceSet: { shopMoney: { amount: string } }
  currentSubtotalPriceSet: { shopMoney: { amount: string } }
  totalShippingPriceSet: { shopMoney: { amount: string } }
  currentTotalTaxSet: { shopMoney: { amount: string } }
  currentTotalDiscountsSet: { shopMoney: { amount: string } }
  lineItems: {
    edges: Array<{
      node: {
        title: string
        quantity: number
        product: { id: string } | null
        discountedUnitPriceSet: { shopMoney: { amount: string } }
      }
    }>
  }
  paymentGatewayNames: string[]
}

export interface ShopifyCustomer {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  numberOfOrders: string
  amountSpent: { amount: string }
  tags: string[]
  addressesV2: {
    edges: Array<{
      node: {
        name: string | null
        phone: string | null
        address1: string | null
        address2: string | null
        city: string | null
        province: string | null
        zip: string | null
        country: string | null
      }
    }>
  }
}

export interface ShopifyDiscount {
  id: string
  __typename: string
  title: string
  status: 'ACTIVE' | 'EXPIRED' | 'SCHEDULED'
  startsAt: string | null
  endsAt: string | null
  usageLimit: number | null
  asyncUsageCount: number
  codes: {
    edges: Array<{
      node: { code: string }
    }>
  }
  customerGets?: {
    value: {
      __typename: string
      percentage?: number
      amount?: { amount: string }
    }
  }
  minimumRequirement?: {
    __typename: string
    greaterThanOrEqualToSubtotal?: { amount: string }
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
