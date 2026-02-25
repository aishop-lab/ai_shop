/**
 * Admin Configuration Constants
 */

// Platform admin email - prefer env var, fall back to default for backwards compatibility
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'aishop@middlefieldbrands.com'

// Admin dashboard routes
export const ADMIN_ROUTES = {
  overview: '/admin',
  stores: '/admin/stores',
  sellers: '/admin/sellers',
  customers: '/admin/customers',
  orders: '/admin/orders',
  products: '/admin/products',
  analytics: '/admin/analytics',
} as const
