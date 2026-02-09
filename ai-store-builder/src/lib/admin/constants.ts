/**
 * Admin Configuration Constants
 */

// Platform admin email - hardcoded for simplicity
export const ADMIN_EMAIL = 'aishop@middlefieldbrands.com'

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
