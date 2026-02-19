// Shopify GraphQL Admin API client for fetching products, collections, orders, customers, and discounts

import { SHOPIFY_API_VERSION, PRODUCTS_PER_PAGE } from '../constants'
import type { ShopifyProduct, ShopifyCollection, ShopifyOrder, ShopifyCustomer, ShopifyDiscount } from '../types'

interface GraphQLResponse<T> {
  data: T
  errors?: Array<{ message: string }>
  extensions?: { cost: { requestedQueryCost: number; actualQueryCost: number; throttleStatus: { maximumAvailable: number; currentlyAvailable: number; restoreRate: number } } }
}

async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  )

  if (response.status === 429) {
    throw new ShopifyRateLimitError(response.headers.get('Retry-After'))
  }

  if (!response.ok) {
    throw new Error(`Shopify GraphQL error: ${response.status} ${await response.text()}`)
  }

  const result: GraphQLResponse<T> = await response.json()

  if (result.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`)
  }

  return result.data
}

export class ShopifyRateLimitError extends Error {
  retryAfter: number
  constructor(retryAfterHeader: string | null) {
    super('Shopify rate limit exceeded')
    this.name = 'ShopifyRateLimitError'
    this.retryAfter = retryAfterHeader ? parseFloat(retryAfterHeader) : 2
  }
}

// =====================
// Product queries
// =====================

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          title
          descriptionHtml
          productType
          tags
          status
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price
                compareAtPrice
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          images(first: 20) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const PRODUCT_COUNT_QUERY = `
  query ProductCount {
    productsCount {
      count
    }
  }
`

// =====================
// Collection queries
// =====================

const COLLECTIONS_QUERY = `
  query GetCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          title
          descriptionHtml
          products(first: 250) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const COLLECTION_COUNT_QUERY = `
  query CollectionCount {
    collectionsCount {
      count
    }
  }
`

// =====================
// Order queries
// =====================

const ORDERS_QUERY = `
  query GetOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          customer {
            id
            email
            firstName
            lastName
            phone
          }
          shippingAddress {
            name
            phone
            address1
            address2
            city
            province
            zip
            country
          }
          currentTotalPriceSet { shopMoney { amount } }
          currentSubtotalPriceSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          currentTotalTaxSet { shopMoney { amount } }
          currentTotalDiscountsSet { shopMoney { amount } }
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                product { id }
                discountedUnitPriceSet { shopMoney { amount } }
              }
            }
          }
          paymentGatewayNames
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const ORDER_COUNT_QUERY = `
  query OrderCount {
    ordersCount {
      count
    }
  }
`

// =====================
// Customer queries
// =====================

const CUSTOMERS_QUERY = `
  query GetCustomers($first: Int!, $after: String) {
    customers(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          firstName
          lastName
          email
          phone
          numberOfOrders
          amountSpent { amount }
          tags
          addressesV2(first: 10) {
            edges {
              node {
                name
                phone
                address1
                address2
                city
                province
                zip
                country
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const CUSTOMER_COUNT_QUERY = `
  query CustomerCount {
    customersCount {
      count
    }
  }
`

// =====================
// Discount queries
// =====================

const DISCOUNTS_QUERY = `
  query GetDiscounts($first: Int!, $after: String) {
    discountNodes(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          discount {
            ... on DiscountCodeBasic {
              __typename
              title
              status
              startsAt
              endsAt
              usageLimit
              asyncUsageCount
              codes(first: 1) {
                edges {
                  node { code }
                }
              }
              customerGets {
                value {
                  ... on DiscountPercentage {
                    __typename
                    percentage
                  }
                  ... on DiscountAmount {
                    __typename
                    amount { amount }
                  }
                }
              }
              minimumRequirement {
                ... on DiscountMinimumSubtotal {
                  __typename
                  greaterThanOrEqualToSubtotal { amount }
                }
              }
            }
            ... on DiscountCodeFreeShipping {
              __typename
              title
              status
              startsAt
              endsAt
              usageLimit
              asyncUsageCount
              codes(first: 1) {
                edges {
                  node { code }
                }
              }
              minimumRequirement {
                ... on DiscountMinimumSubtotal {
                  __typename
                  greaterThanOrEqualToSubtotal { amount }
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const DISCOUNT_COUNT_QUERY = `
  query DiscountCount {
    discountNodes(first: 1) {
      edges { node { id } }
    }
  }
`

// =====================
// Result interfaces
// =====================

export interface ShopifyProductPage {
  products: ShopifyProduct[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface ShopifyCollectionPage {
  collections: ShopifyCollection[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface ShopifyOrderPage {
  orders: ShopifyOrder[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface ShopifyCustomerPage {
  customers: ShopifyCustomer[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface ShopifyDiscountPage {
  discounts: ShopifyDiscount[]
  hasNextPage: boolean
  endCursor: string | null
}

// =====================
// Product functions
// =====================

export async function getShopifyProductCount(
  shop: string,
  accessToken: string
): Promise<number> {
  const data = await shopifyGraphQL<{ productsCount: { count: number } }>(
    shop,
    accessToken,
    PRODUCT_COUNT_QUERY
  )
  return data.productsCount.count
}

export async function getShopifyCollectionCount(
  shop: string,
  accessToken: string
): Promise<number> {
  const data = await shopifyGraphQL<{ collectionsCount: { count: number } }>(
    shop,
    accessToken,
    COLLECTION_COUNT_QUERY
  )
  return data.collectionsCount.count
}

export async function fetchShopifyProducts(
  shop: string,
  accessToken: string,
  cursor?: string | null
): Promise<ShopifyProductPage> {
  const data = await shopifyGraphQL<{
    products: {
      edges: Array<{ cursor: string; node: ShopifyProduct }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }>(shop, accessToken, PRODUCTS_QUERY, {
    first: PRODUCTS_PER_PAGE,
    after: cursor || null,
  })

  return {
    products: data.products.edges.map(e => e.node),
    hasNextPage: data.products.pageInfo.hasNextPage,
    endCursor: data.products.pageInfo.endCursor,
  }
}

export async function fetchShopifyCollections(
  shop: string,
  accessToken: string,
  cursor?: string | null
): Promise<ShopifyCollectionPage> {
  const data = await shopifyGraphQL<{
    collections: {
      edges: Array<{ cursor: string; node: ShopifyCollection }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }>(shop, accessToken, COLLECTIONS_QUERY, {
    first: PRODUCTS_PER_PAGE,
    after: cursor || null,
  })

  return {
    collections: data.collections.edges.map(e => e.node),
    hasNextPage: data.collections.pageInfo.hasNextPage,
    endCursor: data.collections.pageInfo.endCursor,
  }
}

// =====================
// Order functions
// =====================

export async function getShopifyOrderCount(
  shop: string,
  accessToken: string
): Promise<number> {
  const data = await shopifyGraphQL<{ ordersCount: { count: number } }>(
    shop,
    accessToken,
    ORDER_COUNT_QUERY
  )
  return data.ordersCount.count
}

export async function fetchShopifyOrders(
  shop: string,
  accessToken: string,
  cursor?: string | null
): Promise<ShopifyOrderPage> {
  const data = await shopifyGraphQL<{
    orders: {
      edges: Array<{ cursor: string; node: ShopifyOrder }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }>(shop, accessToken, ORDERS_QUERY, {
    first: PRODUCTS_PER_PAGE,
    after: cursor || null,
  })

  return {
    orders: data.orders.edges.map(e => e.node),
    hasNextPage: data.orders.pageInfo.hasNextPage,
    endCursor: data.orders.pageInfo.endCursor,
  }
}

// =====================
// Customer functions
// =====================

export async function getShopifyCustomerCount(
  shop: string,
  accessToken: string
): Promise<number> {
  const data = await shopifyGraphQL<{ customersCount: { count: number } }>(
    shop,
    accessToken,
    CUSTOMER_COUNT_QUERY
  )
  return data.customersCount.count
}

export async function fetchShopifyCustomers(
  shop: string,
  accessToken: string,
  cursor?: string | null
): Promise<ShopifyCustomerPage> {
  const data = await shopifyGraphQL<{
    customers: {
      edges: Array<{ cursor: string; node: ShopifyCustomer }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }>(shop, accessToken, CUSTOMERS_QUERY, {
    first: PRODUCTS_PER_PAGE,
    after: cursor || null,
  })

  return {
    customers: data.customers.edges.map(e => e.node),
    hasNextPage: data.customers.pageInfo.hasNextPage,
    endCursor: data.customers.pageInfo.endCursor,
  }
}

// =====================
// Discount functions
// =====================

export async function fetchShopifyDiscounts(
  shop: string,
  accessToken: string,
  cursor?: string | null
): Promise<ShopifyDiscountPage> {
  const data = await shopifyGraphQL<{
    discountNodes: {
      edges: Array<{ cursor: string; node: { id: string; discount: ShopifyDiscount | null } }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }>(shop, accessToken, DISCOUNTS_QUERY, {
    first: PRODUCTS_PER_PAGE,
    after: cursor || null,
  })

  // Filter out null discounts (automatic discounts won't match our fragments)
  const discounts = data.discountNodes.edges
    .filter(e => e.node.discount !== null && e.node.discount.__typename)
    .map(e => ({
      ...e.node.discount!,
      id: e.node.id,
    }))

  return {
    discounts,
    hasNextPage: data.discountNodes.pageInfo.hasNextPage,
    endCursor: data.discountNodes.pageInfo.endCursor,
  }
}
