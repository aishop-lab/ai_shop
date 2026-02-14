// Shopify GraphQL Admin API client for fetching products and collections

import { SHOPIFY_API_VERSION, PRODUCTS_PER_PAGE } from '../constants'
import type { ShopifyProduct, ShopifyCollection } from '../types'

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
                weight
                weightUnit
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

/**
 * Get total product count from Shopify store
 */
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

/**
 * Get total collection count from Shopify store
 */
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

/**
 * Fetch a page of products from Shopify
 */
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

/**
 * Fetch a page of collections from Shopify
 */
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
