// Transform Shopify customers to StoreForge normalized format

import type { ShopifyCustomer, MigrationCustomer, MigrationCustomerAddress } from '../types'

/**
 * Extract numeric ID from Shopify GID
 */
function extractGid(gid: string): string {
  const parts = gid.split('/')
  return parts[parts.length - 1]
}

/**
 * Transform a Shopify customer to StoreForge format
 */
export function transformShopifyCustomer(customer: ShopifyCustomer): MigrationCustomer | null {
  // Skip customers without email (can't create an account without one)
  if (!customer.email) return null

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ') || customer.email.split('@')[0]

  // Transform addresses
  const addresses: MigrationCustomerAddress[] = customer.addressesV2.edges.map((e, idx) => {
    const addr = e.node
    return {
      full_name: addr.name || fullName,
      phone: addr.phone || customer.phone || '',
      address_line1: addr.address1 || '',
      address_line2: addr.address2 || undefined,
      city: addr.city || '',
      state: addr.province || '',
      pincode: addr.zip || '',
      country: addr.country || 'India',
      is_default: idx === 0,
    }
  })

  return {
    source_id: extractGid(customer.id),
    email: customer.email,
    full_name: fullName,
    phone: customer.phone || undefined,
    total_orders: parseInt(customer.numberOfOrders) || 0,
    total_spent: parseFloat(customer.amountSpent.amount) || 0,
    addresses,
  }
}
