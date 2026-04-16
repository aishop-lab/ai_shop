/**
 * Admin Configuration Constants
 */

// Platform admin email — must be set via ADMIN_EMAIL env var
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL
if (!ADMIN_EMAIL) {
  console.error('ADMIN_EMAIL environment variable is not set — admin access will be denied')
}

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
