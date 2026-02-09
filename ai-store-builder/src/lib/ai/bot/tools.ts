// AI Bot Tool Definitions
// All tools available to the AI assistant for managing the store

import { z } from 'zod'

// Tool type compatible with AI SDK v6
interface ToolDefinition {
  description: string
  inputSchema: z.ZodType
}

// =============================================================================
// READ TOOLS (No confirmation needed)
// =============================================================================

export const getProducts: ToolDefinition = {
  description: 'Get a list of products from the store. Can filter by status, category, featured, or search term.',
  inputSchema: z.object({
    status: z.enum(['all', 'published', 'draft', 'archived']).optional().describe('Filter by product status'),
    category: z.string().optional().describe('Filter by category name'),
    featured: z.boolean().optional().describe('Filter by featured status'),
    lowStock: z.boolean().optional().describe('Show only low stock items (quantity <= 5)'),
    search: z.string().optional().describe('Search by title or SKU'),
    limit: z.number().min(1).max(100).optional().describe('Maximum number of products to return'),
  }),
}

export const getProduct: ToolDefinition = {
  description: 'Get details of a single product by ID or SKU',
  inputSchema: z.object({
    productId: z.string().optional().describe('Product ID'),
    sku: z.string().optional().describe('Product SKU'),
  }),
}

export const getOrders: ToolDefinition = {
  description: 'Get a list of orders from the store. Can filter by status, date range, or customer.',
  inputSchema: z.object({
    status: z.enum(['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
    dateRange: z.enum(['today', 'yesterday', 'this_week', 'this_month', 'last_30_days']).optional(),
    limit: z.number().min(1).max(50).optional(),
  }),
}

export const getOrder: ToolDefinition = {
  description: 'Get details of a single order by ID or order number',
  inputSchema: z.object({
    orderId: z.string().optional(),
    orderNumber: z.string().optional(),
  }),
}

export const getAnalytics: ToolDefinition = {
  description: 'Get store analytics and statistics',
  inputSchema: z.object({
    metric: z.enum(['overview', 'revenue', 'orders', 'products', 'customers', 'top_sellers']).optional(),
    period: z.enum(['today', 'yesterday', 'this_week', 'this_month', 'last_30_days', 'this_year']).optional(),
  }),
}

export const getSettings: ToolDefinition = {
  description: 'Get current store settings',
  inputSchema: z.object({
    section: z.enum(['general', 'branding', 'shipping', 'payments', 'notifications', 'all']).optional(),
  }),
}

export const getCoupons: ToolDefinition = {
  description: 'Get a list of coupons',
  inputSchema: z.object({
    status: z.enum(['all', 'active', 'expired', 'scheduled']).optional(),
    limit: z.number().min(1).max(50).optional(),
  }),
}

export const getCollections: ToolDefinition = {
  description: 'Get a list of product collections',
  inputSchema: z.object({
    limit: z.number().min(1).max(50).optional(),
  }),
}

export const getReviews: ToolDefinition = {
  description: 'Get product reviews',
  inputSchema: z.object({
    productId: z.string().optional().describe('Filter by product ID'),
    rating: z.number().min(1).max(5).optional().describe('Filter by rating'),
    status: z.enum(['all', 'approved', 'pending', 'rejected']).optional(),
    limit: z.number().min(1).max(50).optional(),
  }),
}

// =============================================================================
// WRITE TOOLS (Auto-execute)
// =============================================================================

export const createProduct: ToolDefinition = {
  description: 'Create a new product in the store',
  inputSchema: z.object({
    title: z.string().describe('Product title'),
    description: z.string().optional().describe('Product description'),
    price: z.number().min(0).describe('Product price in INR'),
    compareAtPrice: z.number().min(0).optional().describe('Original price for showing discount'),
    category: z.string().optional().describe('Product category'),
    sku: z.string().optional().describe('Stock keeping unit'),
    quantity: z.number().min(0).optional().describe('Stock quantity'),
    trackQuantity: z.boolean().optional().describe('Whether to track inventory'),
    status: z.enum(['draft', 'published']).optional().describe('Product status'),
    featured: z.boolean().optional().describe('Whether product is featured'),
    tags: z.array(z.string()).optional().describe('Product tags'),
  }),
}

export const updateProduct: ToolDefinition = {
  description: 'Update an existing product',
  inputSchema: z.object({
    productId: z.string().describe('Product ID to update'),
    title: z.string().optional(),
    description: z.string().optional(),
    price: z.number().min(0).optional(),
    compareAtPrice: z.number().min(0).optional(),
    category: z.string().optional(),
    quantity: z.number().min(0).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    featured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
}

export const createCoupon: ToolDefinition = {
  description: 'Create a new discount coupon',
  inputSchema: z.object({
    code: z.string().describe('Coupon code (uppercase, no spaces)'),
    discountType: z.enum(['percentage', 'fixed']).describe('Type of discount'),
    discountValue: z.number().min(0).describe('Discount amount (percentage or fixed INR)'),
    minOrderValue: z.number().min(0).optional().describe('Minimum order value required'),
    maxUses: z.number().min(1).optional().describe('Maximum number of uses'),
    expiresAt: z.string().optional().describe('Expiration date (ISO format)'),
    description: z.string().optional().describe('Internal description'),
  }),
}

export const updateCoupon: ToolDefinition = {
  description: 'Update an existing coupon',
  inputSchema: z.object({
    couponId: z.string().describe('Coupon ID to update'),
    code: z.string().optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    discountValue: z.number().min(0).optional(),
    minOrderValue: z.number().min(0).optional(),
    maxUses: z.number().min(1).optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
}

export const createCollection: ToolDefinition = {
  description: 'Create a new product collection',
  inputSchema: z.object({
    name: z.string().describe('Collection name'),
    description: z.string().optional().describe('Collection description'),
    productIds: z.array(z.string()).optional().describe('Product IDs to include'),
    tags: z.array(z.string()).optional().describe('Auto-populate from these product tags'),
  }),
}

export const updateCollection: ToolDefinition = {
  description: 'Update an existing collection',
  inputSchema: z.object({
    collectionId: z.string().describe('Collection ID to update'),
    name: z.string().optional(),
    description: z.string().optional(),
    addProductIds: z.array(z.string()).optional().describe('Product IDs to add'),
    removeProductIds: z.array(z.string()).optional().describe('Product IDs to remove'),
  }),
}

export const updateSettings: ToolDefinition = {
  description: 'Update store settings',
  inputSchema: z.object({
    storeName: z.string().optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    currency: z.string().optional(),
  }),
}

export const updateBranding: ToolDefinition = {
  description: 'Update store branding (colors, logo)',
  inputSchema: z.object({
    primaryColor: z.string().optional().describe('Primary brand color (hex code)'),
    secondaryColor: z.string().optional().describe('Secondary brand color (hex code)'),
    logoUrl: z.string().url().optional().describe('Logo URL'),
  }),
}

export const updateOrderStatus: ToolDefinition = {
  description: 'Update the status of an order. Requires confirmation for status changes.',
  inputSchema: z.object({
    orderId: z.string().describe('Order ID to update'),
    status: z.enum(['confirmed', 'shipped', 'delivered', 'cancelled']).describe('New status'),
    trackingNumber: z.string().optional().describe('Tracking number (for shipped status)'),
    trackingUrl: z.string().url().optional().describe('Tracking URL'),
    notes: z.string().optional().describe('Notes about the status change'),
  }),
}

export const addTrackingNumber: ToolDefinition = {
  description: 'Add tracking information to an order',
  inputSchema: z.object({
    orderId: z.string().describe('Order ID'),
    trackingNumber: z.string().describe('Tracking number'),
    courier: z.string().optional().describe('Courier name'),
    trackingUrl: z.string().url().optional().describe('Tracking URL'),
  }),
}

// =============================================================================
// DESTRUCTIVE TOOLS (Require confirmation)
// =============================================================================

export const deleteProduct: ToolDefinition = {
  description: 'Delete a product. REQUIRES CONFIRMATION.',
  inputSchema: z.object({
    productId: z.string().describe('Product ID to delete'),
    productTitle: z.string().optional().describe('Product title for confirmation message'),
  }),
}

export const deleteCoupon: ToolDefinition = {
  description: 'Delete a coupon. REQUIRES CONFIRMATION.',
  inputSchema: z.object({
    couponId: z.string().describe('Coupon ID to delete'),
    couponCode: z.string().optional().describe('Coupon code for confirmation message'),
  }),
}

export const deleteCollection: ToolDefinition = {
  description: 'Delete a collection. REQUIRES CONFIRMATION.',
  inputSchema: z.object({
    collectionId: z.string().describe('Collection ID to delete'),
    collectionName: z.string().optional().describe('Collection name for confirmation message'),
  }),
}

export const deleteReview: ToolDefinition = {
  description: 'Delete a product review. REQUIRES CONFIRMATION.',
  inputSchema: z.object({
    reviewId: z.string().describe('Review ID to delete'),
  }),
}

export const processRefund: ToolDefinition = {
  description: 'Process a refund for an order. REQUIRES CONFIRMATION.',
  inputSchema: z.object({
    orderId: z.string().describe('Order ID to refund'),
    amount: z.number().min(0).optional().describe('Refund amount (full refund if not specified)'),
    reason: z.string().optional().describe('Reason for refund'),
  }),
}

export const bulkDeleteProducts: ToolDefinition = {
  description: 'Delete multiple products at once. REQUIRES CONFIRMATION.',
  inputSchema: z.object({
    productIds: z.array(z.string()).describe('Array of product IDs to delete'),
  }),
}

// =============================================================================
// UI TOOLS (Instant)
// =============================================================================

export const navigateTo: ToolDefinition = {
  description: 'Navigate to a dashboard page',
  inputSchema: z.object({
    page: z.enum([
      'dashboard',
      'products',
      'products/new',
      'orders',
      'coupons',
      'collections',
      'reviews',
      'analytics',
      'settings',
      'settings/branding',
      'settings/shipping',
      'settings/payments',
    ]).describe('Page to navigate to'),
  }),
}

export const showNotification: ToolDefinition = {
  description: 'Show a notification toast to the user',
  inputSchema: z.object({
    message: z.string().describe('Notification message'),
    type: z.enum(['success', 'error', 'info', 'warning']).optional(),
  }),
}

// =============================================================================
// AI GENERATION TOOLS (Auto-execute)
// =============================================================================

export const generateProductDescription: ToolDefinition = {
  description: 'Generate an AI product description',
  inputSchema: z.object({
    title: z.string().describe('Product title'),
    category: z.string().optional().describe('Product category'),
    attributes: z.record(z.string()).optional().describe('Product attributes'),
  }),
}

export const generateLogo: ToolDefinition = {
  description: 'Generate an AI logo for the store',
  inputSchema: z.object({
    style: z.enum(['modern', 'classic', 'playful', 'minimal']).optional(),
    feedback: z.string().optional().describe('Feedback on previous logos'),
  }),
}

export const suggestPricing: ToolDefinition = {
  description: 'Get AI pricing suggestions for a product',
  inputSchema: z.object({
    productId: z.string().optional().describe('Existing product ID'),
    title: z.string().optional().describe('Product title'),
    category: z.string().optional().describe('Product category'),
    cost: z.number().min(0).optional().describe('Product cost'),
  }),
}

// =============================================================================
// ALL TOOLS EXPORT
// =============================================================================

export const botTools = {
  // Read tools
  getProducts,
  getProduct,
  getOrders,
  getOrder,
  getAnalytics,
  getSettings,
  getCoupons,
  getCollections,
  getReviews,

  // Write tools
  createProduct,
  updateProduct,
  createCoupon,
  updateCoupon,
  createCollection,
  updateCollection,
  updateSettings,
  updateBranding,
  updateOrderStatus,
  addTrackingNumber,

  // Destructive tools
  deleteProduct,
  deleteCoupon,
  deleteCollection,
  deleteReview,
  processRefund,
  bulkDeleteProducts,

  // UI tools
  navigateTo,
  showNotification,

  // AI tools
  generateProductDescription,
  generateLogo,
  suggestPricing,
}

// Tools that require confirmation before execution
export const DESTRUCTIVE_TOOLS = new Set([
  'deleteProduct',
  'deleteCoupon',
  'deleteCollection',
  'deleteReview',
  'processRefund',
  'bulkDeleteProducts',
  'updateOrderStatus', // Status changes like 'cancelled' need confirmation
])

// Check if a tool requires confirmation
export function requiresConfirmation(toolName: string, args?: Record<string, unknown>): boolean {
  if (DESTRUCTIVE_TOOLS.has(toolName)) {
    // Special case: updateOrderStatus only needs confirmation for certain statuses
    if (toolName === 'updateOrderStatus' && args) {
      return args.status === 'cancelled' || args.status === 'delivered'
    }
    return true
  }
  return false
}
