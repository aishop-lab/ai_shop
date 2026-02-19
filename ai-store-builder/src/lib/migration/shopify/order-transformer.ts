// Transform Shopify orders to StoreForge normalized format

import type { ShopifyOrder, MigrationOrder, MigrationOrderItem } from '../types'

/**
 * Extract numeric ID from Shopify GID (e.g. "gid://shopify/Product/123" -> "123")
 */
function extractGid(gid: string): string {
  const parts = gid.split('/')
  return parts[parts.length - 1]
}

/**
 * Map Shopify financial status to StoreForge payment status
 */
function mapPaymentStatus(status: ShopifyOrder['displayFinancialStatus']): 'pending' | 'paid' | 'failed' | 'refunded' {
  switch (status) {
    case 'PAID':
    case 'PARTIALLY_PAID':
      return 'paid'
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'refunded'
    case 'VOIDED':
      return 'failed'
    case 'PENDING':
    case 'AUTHORIZED':
    default:
      return 'pending'
  }
}

/**
 * Map Shopify fulfillment status to StoreForge order status
 */
function mapOrderStatus(
  fulfillment: ShopifyOrder['displayFulfillmentStatus'],
  financial: ShopifyOrder['displayFinancialStatus']
): 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' {
  if (financial === 'REFUNDED') return 'refunded'
  if (financial === 'VOIDED') return 'cancelled'

  switch (fulfillment) {
    case 'FULFILLED':
      return 'delivered'
    case 'PARTIALLY_FULFILLED':
    case 'IN_PROGRESS':
      return 'shipped'
    case 'PENDING_FULFILLMENT':
    case 'OPEN':
      return 'processing'
    case 'RESTOCKED':
      return 'cancelled'
    case 'UNFULFILLED':
    default:
      if (financial === 'PAID') return 'confirmed'
      return 'pending'
  }
}

/**
 * Transform a Shopify order to StoreForge format
 */
export function transformShopifyOrder(order: ShopifyOrder): MigrationOrder {
  // Strip # prefix from order name and add IMP- prefix
  const rawNumber = order.name.replace(/^#/, '')
  const orderNumber = `IMP-${rawNumber}`

  const shippingAddress = order.shippingAddress
    ? {
        name: order.shippingAddress.name || order.customer?.firstName || 'Unknown',
        phone: order.shippingAddress.phone || order.customer?.phone || '',
        address_line1: order.shippingAddress.address1 || '',
        address_line2: order.shippingAddress.address2 || undefined,
        city: order.shippingAddress.city || '',
        state: order.shippingAddress.province || '',
        pincode: order.shippingAddress.zip || '',
        country: order.shippingAddress.country || 'India',
      }
    : {
        name: order.customer?.firstName || 'Unknown',
        phone: order.customer?.phone || '',
        address_line1: 'N/A',
        city: 'N/A',
        state: 'N/A',
        pincode: '000000',
        country: 'India',
      }

  const customerName = order.customer
    ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ') || 'Unknown'
    : shippingAddress.name || 'Unknown'

  // Map line items
  const lineItems: MigrationOrderItem[] = order.lineItems.edges.map(e => {
    const item = e.node
    const unitPrice = parseFloat(item.discountedUnitPriceSet.shopMoney.amount)
    return {
      source_product_id: item.product ? extractGid(item.product.id) : '',
      title: item.title,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: unitPrice * item.quantity,
    }
  })

  // Map payment method from gateway names
  const gateway = (order.paymentGatewayNames[0] || '').toLowerCase()
  let paymentMethod = 'cod'
  if (gateway.includes('razorpay')) paymentMethod = 'razorpay'

  return {
    source_id: extractGid(order.id),
    order_number: orderNumber,
    customer_email: order.customer?.email || '',
    customer_name: customerName,
    customer_phone: order.customer?.phone || shippingAddress.phone || undefined,
    shipping_address: shippingAddress,
    subtotal: parseFloat(order.currentSubtotalPriceSet.shopMoney.amount),
    shipping_cost: parseFloat(order.totalShippingPriceSet.shopMoney.amount),
    tax_amount: parseFloat(order.currentTotalTaxSet.shopMoney.amount),
    discount_amount: parseFloat(order.currentTotalDiscountsSet.shopMoney.amount),
    total_amount: parseFloat(order.currentTotalPriceSet.shopMoney.amount),
    payment_method: paymentMethod,
    payment_status: mapPaymentStatus(order.displayFinancialStatus),
    order_status: mapOrderStatus(order.displayFulfillmentStatus, order.displayFinancialStatus),
    line_items: lineItems,
    created_at: order.createdAt,
  }
}
