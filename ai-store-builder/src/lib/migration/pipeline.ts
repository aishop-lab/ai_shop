// Core migration pipeline: fetch -> transform -> create -> images

import { createClient } from '@/lib/supabase/server'
import { decrypt, encrypt } from '@/lib/encryption'
import { createProduct } from '@/lib/products/db-operations'
import { downloadAndUploadImages } from './image-downloader'
import {
  getMigration,
  updateMigrationStatus,
  updateMigrationCounts,
  incrementMigrationCount,
  addMigrationError,
  updateProductIdMap,
  updateCollectionIdMap,
  updateCustomerIdMap,
  updateOrderIdMap,
  updateCouponIdMap,
  saveMigrationCursor,
} from './progress'
import {
  MAX_MIGRATION_DURATION_MS,
  RATE_LIMIT_BACKOFF_BASE_MS,
  RATE_LIMIT_BACKOFF_MAX_MS,
} from './constants'
import type {
  MigrationConfig,
  MigrationProduct,
  MigrationCollection,
  MigrationCustomer,
  MigrationCoupon,
  MigrationOrder,
  StoreMigration,
} from './types'

// Shopify imports
import {
  fetchShopifyProducts, fetchShopifyCollections,
  getShopifyProductCount, getShopifyCollectionCount,
  fetchShopifyOrders, getShopifyOrderCount,
  fetchShopifyCustomers, getShopifyCustomerCount,
  fetchShopifyDiscounts,
  ShopifyRateLimitError,
} from './shopify/client'
import { transformShopifyProduct, transformShopifyCollection } from './shopify/transformer'
import { transformShopifyOrder } from './shopify/order-transformer'
import { transformShopifyCustomer } from './shopify/customer-transformer'
import { transformShopifyDiscount } from './shopify/discount-transformer'

// Etsy imports
import { fetchEtsyListings, fetchEtsySections, fetchEtsySectionListings, getEtsyListingCount, EtsyRateLimitError } from './etsy/client'
import { refreshEtsyToken } from './etsy/oauth'
import { transformEtsyListing, transformEtsySection } from './etsy/transformer'

/**
 * Sleep utility with exponential backoff
 */
async function backoff(attempt: number): Promise<void> {
  const delay = Math.min(
    RATE_LIMIT_BACKOFF_BASE_MS * Math.pow(2, attempt),
    RATE_LIMIT_BACKOFF_MAX_MS
  )
  await new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Get decrypted access token, refreshing if needed (Etsy)
 */
async function getAccessToken(migration: StoreMigration): Promise<string> {
  if (!migration.access_token_encrypted) {
    throw new Error('No access token stored for this migration')
  }

  const accessToken = decrypt(migration.access_token_encrypted)

  // Check if Etsy token needs refresh
  if (
    migration.platform === 'etsy' &&
    migration.token_expires_at &&
    new Date(migration.token_expires_at) < new Date()
  ) {
    if (!migration.refresh_token_encrypted) {
      throw new Error('Etsy token expired and no refresh token available')
    }

    const refreshToken = decrypt(migration.refresh_token_encrypted)
    const newTokens = await refreshEtsyToken(refreshToken)

    // Update tokens in DB
    const supabase = await createClient()
    await supabase
      .from('store_migrations')
      .update({
        access_token_encrypted: encrypt(newTokens.access_token),
        refresh_token_encrypted: encrypt(newTokens.refresh_token),
        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', migration.id)

    return newTokens.access_token
  }

  return accessToken
}

/**
 * Remove demo products before first migrated product
 */
async function removeDemoProducts(storeId: string): Promise<void> {
  const supabase = await createClient()

  const { data: demoProducts } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
    .eq('is_demo', true)

  if (demoProducts && demoProducts.length > 0) {
    const demoIds = demoProducts.map(p => p.id)
    console.log(`[Migration] Removing ${demoIds.length} demo products`)

    await supabase.from('product_images').delete().in('product_id', demoIds)
    await supabase.from('products').delete().in('id', demoIds)
  }
}

/**
 * Create a StoreForge product from normalized migration data
 */
async function createMigratedProduct(
  storeId: string,
  product: MigrationProduct,
  productStatus: 'draft' | 'active'
): Promise<string> {
  const created = await createProduct(storeId, {
    title: product.title,
    description: product.description,
    price: product.price,
    compare_at_price: product.compare_at_price,
    sku: product.sku,
    quantity: product.quantity,
    track_quantity: product.track_quantity,
    weight: product.weight,
    requires_shipping: true,
    categories: product.categories,
    tags: product.tags,
    status: productStatus,
    featured: false,
  })

  // Create variants if any
  if (product.variants.length > 0) {
    const supabase = await createClient()
    for (const variant of product.variants) {
      await supabase.from('product_variants').insert({
        product_id: created.id,
        title: variant.title,
        sku: variant.sku || null,
        price: variant.price,
        compare_at_price: variant.compare_at_price || null,
        quantity: variant.quantity,
        options: variant.options,
        weight: variant.weight || null,
      })
    }
  }

  return created.id
}

/**
 * Create a StoreForge collection from normalized migration data
 */
async function createMigratedCollection(
  storeId: string,
  collection: MigrationCollection,
  productIdMap: Record<string, string>
): Promise<string> {
  const supabase = await createClient()

  const slug = collection.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: created, error } = await supabase
    .from('collections')
    .insert({
      store_id: storeId,
      title: collection.title,
      slug,
      description: collection.description || null,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create collection: ${error?.message}`)
  }

  // Link products to collection
  const productLinks = collection.product_source_ids
    .map(sourceId => productIdMap[sourceId])
    .filter(Boolean)
    .map(productId => ({
      collection_id: created.id,
      product_id: productId,
    }))

  if (productLinks.length > 0) {
    await supabase.from('collection_products').insert(productLinks)
  }

  return created.id
}

/**
 * Create a StoreForge customer from normalized migration data
 */
async function createMigratedCustomer(
  storeId: string,
  customer: MigrationCustomer
): Promise<string> {
  const supabase = await createClient()

  const { data: created, error } = await supabase
    .from('customers')
    .insert({
      store_id: storeId,
      email: customer.email,
      full_name: customer.full_name,
      phone: customer.phone || null,
      total_orders: customer.total_orders,
      total_spent: customer.total_spent,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create customer: ${error?.message}`)
  }

  // Create addresses
  if (customer.addresses.length > 0) {
    const addressRows = customer.addresses.map(addr => ({
      customer_id: created.id,
      full_name: addr.full_name,
      phone: addr.phone || '',
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || null,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      country: addr.country,
      is_default: addr.is_default,
    }))

    await supabase.from('customer_addresses').insert(addressRows)
  }

  return created.id
}

/**
 * Create a StoreForge coupon from normalized migration data
 */
async function createMigratedCoupon(
  storeId: string,
  coupon: MigrationCoupon
): Promise<string> {
  const supabase = await createClient()

  const { data: created, error } = await supabase
    .from('coupons')
    .insert({
      store_id: storeId,
      code: coupon.code,
      description: coupon.description || null,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_type === 'free_shipping' ? 1 : coupon.discount_value,
      minimum_order_value: coupon.minimum_order_value || null,
      usage_limit: coupon.usage_limit || null,
      usage_count: coupon.usage_count,
      starts_at: coupon.starts_at || null,
      expires_at: coupon.expires_at || null,
      active: coupon.active,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create coupon: ${error?.message}`)
  }

  return created.id
}

/**
 * Create a StoreForge order from normalized migration data
 */
async function createMigratedOrder(
  storeId: string,
  order: MigrationOrder,
  customerEmailMap: Record<string, string>,
  productIdMap: Record<string, string>
): Promise<string> {
  const supabase = await createClient()

  // Resolve customer_id from email
  const customerId = order.customer_email ? customerEmailMap[order.customer_email] : undefined

  const { data: created, error } = await supabase
    .from('orders')
    .insert({
      store_id: storeId,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email || 'unknown@import.storeforge',
      customer_phone: order.customer_phone || null,
      shipping_address: order.shipping_address,
      subtotal: order.subtotal,
      shipping_cost: order.shipping_cost,
      tax_amount: order.tax_amount,
      discount_amount: order.discount_amount,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      coupon_code: order.coupon_code || null,
      customer_id: customerId || null,
      created_at: order.created_at,
      ...(order.payment_status === 'paid' ? { paid_at: order.created_at } : {}),
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create order: ${error?.message}`)
  }

  // Create order items
  if (order.line_items.length > 0) {
    const itemRows = order.line_items.map(item => ({
      order_id: created.id,
      product_id: item.source_product_id ? (productIdMap[item.source_product_id] || null) : null,
      product_title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }))

    await supabase.from('order_items').insert(itemRows)
  }

  return created.id
}

/**
 * Main migration pipeline - orchestrates the entire process
 */
export async function runMigrationPipeline(config: MigrationConfig): Promise<void> {
  const startTime = Date.now()
  const migration = await getMigration(config.migration_id)

  if (!migration) {
    throw new Error('Migration not found')
  }

  // Set status to running
  await updateMigrationStatus(migration.id, 'running')

  const accessToken = await getAccessToken(migration)
  let demoProductsRemoved = false

  try {
    // =====================
    // Phase 1: Products
    // =====================
    if (config.import_products) {
      await migrateProducts(
        migration,
        accessToken,
        config.product_status,
        startTime,
        () => {
          if (!demoProductsRemoved) {
            demoProductsRemoved = true
            return removeDemoProducts(migration.store_id)
          }
          return Promise.resolve()
        }
      )

      // Check if we paused due to timeout
      const updatedMigration = await getMigration(migration.id)
      if (updatedMigration?.status === 'paused' || updatedMigration?.status === 'cancelled') {
        return
      }
    }

    // =====================
    // Phase 2: Collections
    // =====================
    if (config.import_collections) {
      await migrateCollections(migration, accessToken, startTime)

      const updatedMigration = await getMigration(migration.id)
      if (updatedMigration?.status === 'paused' || updatedMigration?.status === 'cancelled') {
        return
      }
    }

    // =====================
    // Phase 3: Customers (Shopify only)
    // =====================
    if (config.import_customers && migration.platform === 'shopify') {
      await migrateCustomers(migration, accessToken, startTime)

      const updatedMigration = await getMigration(migration.id)
      if (updatedMigration?.status === 'paused' || updatedMigration?.status === 'cancelled') {
        return
      }
    }

    // =====================
    // Phase 4: Coupons (Shopify only)
    // =====================
    if (config.import_coupons && migration.platform === 'shopify') {
      await migrateCoupons(migration, accessToken, startTime)

      const updatedMigration = await getMigration(migration.id)
      if (updatedMigration?.status === 'paused' || updatedMigration?.status === 'cancelled') {
        return
      }
    }

    // =====================
    // Phase 5: Orders (Shopify only, runs last to link customers)
    // =====================
    if (config.import_orders && migration.platform === 'shopify') {
      await migrateOrders(migration, accessToken, startTime)

      const updatedMigration = await getMigration(migration.id)
      if (updatedMigration?.status === 'paused' || updatedMigration?.status === 'cancelled') {
        return
      }
    }

    // All done
    await updateMigrationStatus(migration.id, 'completed')
  } catch (error) {
    console.error('[Migration] Pipeline error:', error)
    await addMigrationError(migration.id, {
      type: 'product',
      message: error instanceof Error ? error.message : 'Unknown pipeline error',
      timestamp: new Date().toISOString(),
    })
    await updateMigrationStatus(migration.id, 'failed')
  }
}

/**
 * Migrate products from source platform
 */
async function migrateProducts(
  migration: StoreMigration,
  accessToken: string,
  productStatus: 'draft' | 'active',
  startTime: number,
  onFirstProduct: () => Promise<void>
): Promise<void> {
  let cursor: string | null = migration.last_cursor
  let rateLimitAttempts = 0
  let isFirstProduct = Object.keys(migration.product_id_map).length === 0

  // Get total count
  if (migration.total_products === 0) {
    let totalCount: number
    if (migration.platform === 'shopify') {
      totalCount = await getShopifyProductCount(
        migration.source_shop_id!,
        accessToken
      )
    } else {
      totalCount = await getEtsyListingCount(
        parseInt(migration.source_shop_id!),
        accessToken
      )
    }
    await updateMigrationCounts(migration.id, { total_products: totalCount })
  }

  // Paginate through products
  let hasMore = true
  let etsyOffset = cursor ? parseInt(cursor) : 0

  while (hasMore) {
    // Check for timeout
    if (Date.now() - startTime > MAX_MIGRATION_DURATION_MS) {
      console.log('[Migration] Approaching timeout, pausing migration')
      await saveMigrationCursor(migration.id, migration.platform === 'etsy' ? etsyOffset.toString() : cursor)
      await updateMigrationStatus(migration.id, 'paused')
      return
    }

    // Check for cancellation
    const current = await getMigration(migration.id)
    if (current?.status === 'cancelled') return

    try {
      let products: MigrationProduct[]

      if (migration.platform === 'shopify') {
        const page = await fetchShopifyProducts(
          migration.source_shop_id!,
          accessToken,
          cursor
        )
        products = page.products
          .map(transformShopifyProduct)
          .filter((p): p is MigrationProduct => p !== null)
        hasMore = page.hasNextPage
        cursor = page.endCursor
      } else {
        const page = await fetchEtsyListings(
          parseInt(migration.source_shop_id!),
          accessToken,
          etsyOffset
        )
        products = page.listings
          .map(transformEtsyListing)
          .filter((p): p is MigrationProduct => p !== null)
        hasMore = page.hasMore
        etsyOffset += page.listings.length
      }

      rateLimitAttempts = 0 // Reset on success

      // Process each product
      for (const product of products) {
        // Check idempotency
        if (migration.product_id_map[product.source_id]) {
          continue // Already migrated
        }

        try {
          // Remove demo products before first real product
          if (isFirstProduct) {
            await onFirstProduct()
            isFirstProduct = false
          }

          // Count total images for this product
          await incrementMigrationCount(migration.id, 'migrated_images', 0) // no-op to refresh
          const imageCount = product.images.length

          // Create product
          const newProductId = await createMigratedProduct(
            migration.store_id,
            product,
            productStatus
          )

          // Download and upload images
          if (product.images.length > 0) {
            const imageResults = await downloadAndUploadImages(
              migration.store_id,
              newProductId,
              product.images
            )

            const successImages = imageResults.filter(r => r.success).length
            const failedImages = imageResults.filter(r => !r.success).length

            // Update image counts
            const currentMigration = await getMigration(migration.id)
            await updateMigrationCounts(migration.id, {
              total_images: (currentMigration?.total_images || 0) + imageCount,
              migrated_images: (currentMigration?.migrated_images || 0) + successImages,
              failed_images: (currentMigration?.failed_images || 0) + failedImages,
            })

            // Log image failures
            for (const result of imageResults) {
              if (!result.success) {
                await addMigrationError(migration.id, {
                  type: 'image',
                  source_id: product.source_id,
                  source_title: product.title,
                  message: `Image ${result.position}: ${result.error}`,
                  timestamp: new Date().toISOString(),
                })
              }
            }
          }

          // Track the mapping
          await updateProductIdMap(migration.id, product.source_id, newProductId)
          await incrementMigrationCount(migration.id, 'migrated_products')

          // Update the in-memory map for collection linking later
          migration.product_id_map[product.source_id] = newProductId
        } catch (error) {
          console.error(`[Migration] Failed to migrate product ${product.source_id}:`, error)
          await addMigrationError(migration.id, {
            type: 'product',
            source_id: product.source_id,
            source_title: product.title,
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          })
          await incrementMigrationCount(migration.id, 'failed_products')
        }
      }

      // Save cursor after each page
      await saveMigrationCursor(
        migration.id,
        migration.platform === 'etsy' ? etsyOffset.toString() : cursor
      )
    } catch (error) {
      if (
        error instanceof ShopifyRateLimitError ||
        error instanceof EtsyRateLimitError
      ) {
        rateLimitAttempts++
        console.log(`[Migration] Rate limited, backing off (attempt ${rateLimitAttempts})`)
        await backoff(rateLimitAttempts)

        if (rateLimitAttempts > 10) {
          await addMigrationError(migration.id, {
            type: 'rate_limit',
            message: 'Too many rate limit retries, pausing migration',
            timestamp: new Date().toISOString(),
          })
          await updateMigrationStatus(migration.id, 'paused')
          return
        }
        continue // Retry the same page
      }
      throw error
    }
  }
}

/**
 * Migrate collections from source platform
 */
async function migrateCollections(
  migration: StoreMigration,
  accessToken: string,
  startTime: number
): Promise<void> {
  try {
    let collections: MigrationCollection[]

    if (migration.platform === 'shopify') {
      // Get total count
      const totalCollections = await getShopifyCollectionCount(
        migration.source_shop_id!,
        accessToken
      )
      await updateMigrationCounts(migration.id, { total_collections: totalCollections })

      // Fetch all collections (usually not many)
      collections = []
      let cursor: string | null = null
      let hasMore = true

      while (hasMore) {
        if (Date.now() - startTime > MAX_MIGRATION_DURATION_MS) {
          await updateMigrationStatus(migration.id, 'paused')
          return
        }

        const page = await fetchShopifyCollections(
          migration.source_shop_id!,
          accessToken,
          cursor
        )
        collections.push(...page.collections.map(transformShopifyCollection))
        hasMore = page.hasNextPage
        cursor = page.endCursor
      }
    } else {
      // Etsy sections
      const sections = await fetchEtsySections(
        parseInt(migration.source_shop_id!),
        accessToken
      )
      await updateMigrationCounts(migration.id, { total_collections: sections.length })

      collections = []
      for (const section of sections) {
        const listingIds = await fetchEtsySectionListings(
          parseInt(migration.source_shop_id!),
          section.shop_section_id,
          accessToken
        )
        collections.push(transformEtsySection(section, listingIds))
      }
    }

    // Refresh product_id_map from DB
    const refreshed = await getMigration(migration.id)
    const productIdMap = refreshed?.product_id_map || migration.product_id_map

    // Create each collection
    for (const collection of collections) {
      if (migration.collection_id_map[collection.source_id]) {
        continue // Already migrated
      }

      try {
        const newCollectionId = await createMigratedCollection(
          migration.store_id,
          collection,
          productIdMap
        )
        await updateCollectionIdMap(migration.id, collection.source_id, newCollectionId)
        await incrementMigrationCount(migration.id, 'migrated_collections')
      } catch (error) {
        console.error(`[Migration] Failed to migrate collection ${collection.source_id}:`, error)
        await addMigrationError(migration.id, {
          type: 'collection',
          source_id: collection.source_id,
          source_title: collection.title,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
        await incrementMigrationCount(migration.id, 'failed_collections')
      }
    }
  } catch (error) {
    console.error('[Migration] Collection migration error:', error)
    await addMigrationError(migration.id, {
      type: 'collection',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Migrate customers from Shopify
 */
async function migrateCustomers(
  migration: StoreMigration,
  accessToken: string,
  startTime: number
): Promise<void> {
  try {
    const totalCustomers = await getShopifyCustomerCount(
      migration.source_shop_id!,
      accessToken
    )
    await updateMigrationCounts(migration.id, { total_customers: totalCustomers })

    let cursor: string | null = null
    let hasMore = true
    let rateLimitAttempts = 0

    while (hasMore) {
      if (Date.now() - startTime > MAX_MIGRATION_DURATION_MS) {
        await updateMigrationStatus(migration.id, 'paused')
        return
      }

      const current = await getMigration(migration.id)
      if (current?.status === 'cancelled') return

      try {
        const page = await fetchShopifyCustomers(
          migration.source_shop_id!,
          accessToken,
          cursor
        )

        rateLimitAttempts = 0

        const customers = page.customers
          .map(transformShopifyCustomer)
          .filter((c): c is MigrationCustomer => c !== null)

        for (const customer of customers) {
          // Idempotency check
          if (migration.customer_id_map[customer.source_id]) continue

          try {
            const newCustomerId = await createMigratedCustomer(
              migration.store_id,
              customer
            )
            await updateCustomerIdMap(migration.id, customer.source_id, newCustomerId)
            await incrementMigrationCount(migration.id, 'migrated_customers')

            // Store email->id mapping in memory for order linking
            migration.customer_id_map[customer.source_id] = newCustomerId
          } catch (error) {
            console.error(`[Migration] Failed to migrate customer ${customer.source_id}:`, error)
            await addMigrationError(migration.id, {
              type: 'customer',
              source_id: customer.source_id,
              source_title: customer.full_name,
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            })
            await incrementMigrationCount(migration.id, 'failed_customers')
          }
        }

        hasMore = page.hasNextPage
        cursor = page.endCursor
      } catch (error) {
        if (error instanceof ShopifyRateLimitError) {
          rateLimitAttempts++
          await backoff(rateLimitAttempts)
          if (rateLimitAttempts > 10) {
            await addMigrationError(migration.id, {
              type: 'rate_limit',
              message: 'Too many rate limit retries during customer import, pausing',
              timestamp: new Date().toISOString(),
            })
            await updateMigrationStatus(migration.id, 'paused')
            return
          }
          continue
        }
        throw error
      }
    }
  } catch (error) {
    console.error('[Migration] Customer migration error:', error)
    await addMigrationError(migration.id, {
      type: 'customer',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Migrate discount codes / coupons from Shopify
 */
async function migrateCoupons(
  migration: StoreMigration,
  accessToken: string,
  startTime: number
): Promise<void> {
  try {
    let cursor: string | null = null
    let hasMore = true
    let rateLimitAttempts = 0
    let totalCounted = false

    while (hasMore) {
      if (Date.now() - startTime > MAX_MIGRATION_DURATION_MS) {
        await updateMigrationStatus(migration.id, 'paused')
        return
      }

      const current = await getMigration(migration.id)
      if (current?.status === 'cancelled') return

      try {
        const page = await fetchShopifyDiscounts(
          migration.source_shop_id!,
          accessToken,
          cursor
        )

        rateLimitAttempts = 0

        // We count as we go since discountNodes doesn't have a count query
        if (!totalCounted && !page.hasNextPage) {
          // Last page — set total from what we've seen
          totalCounted = true
        }

        const coupons = page.discounts
          .map(transformShopifyDiscount)
          .filter((c): c is MigrationCoupon => c !== null)

        // Update total on first page (approximate from page size)
        if (migration.total_coupons === 0) {
          await updateMigrationCounts(migration.id, {
            total_coupons: coupons.length + (page.hasNextPage ? coupons.length : 0),
          })
        }

        for (const coupon of coupons) {
          if (migration.coupon_id_map[coupon.source_id]) continue

          try {
            const newCouponId = await createMigratedCoupon(
              migration.store_id,
              coupon
            )
            await updateCouponIdMap(migration.id, coupon.source_id, newCouponId)
            await incrementMigrationCount(migration.id, 'migrated_coupons')
            migration.coupon_id_map[coupon.source_id] = newCouponId
          } catch (error) {
            console.error(`[Migration] Failed to migrate coupon ${coupon.source_id}:`, error)
            await addMigrationError(migration.id, {
              type: 'coupon',
              source_id: coupon.source_id,
              source_title: coupon.code,
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            })
            await incrementMigrationCount(migration.id, 'failed_coupons')
          }
        }

        hasMore = page.hasNextPage
        cursor = page.endCursor
      } catch (error) {
        if (error instanceof ShopifyRateLimitError) {
          rateLimitAttempts++
          await backoff(rateLimitAttempts)
          if (rateLimitAttempts > 10) {
            await addMigrationError(migration.id, {
              type: 'rate_limit',
              message: 'Too many rate limit retries during coupon import, pausing',
              timestamp: new Date().toISOString(),
            })
            await updateMigrationStatus(migration.id, 'paused')
            return
          }
          continue
        }
        throw error
      }
    }

    // Update final total count
    const refreshed = await getMigration(migration.id)
    if (refreshed) {
      await updateMigrationCounts(migration.id, {
        total_coupons: refreshed.migrated_coupons + refreshed.failed_coupons,
      })
    }
  } catch (error) {
    console.error('[Migration] Coupon migration error:', error)
    await addMigrationError(migration.id, {
      type: 'coupon',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Migrate orders from Shopify (runs last to link customers and coupons)
 */
async function migrateOrders(
  migration: StoreMigration,
  accessToken: string,
  startTime: number
): Promise<void> {
  try {
    const totalOrders = await getShopifyOrderCount(
      migration.source_shop_id!,
      accessToken
    )
    await updateMigrationCounts(migration.id, { total_orders: totalOrders })

    // Build email -> customer_id map for linking orders to customers
    const supabase = await createClient()
    const { data: customers } = await supabase
      .from('customers')
      .select('id, email')
      .eq('store_id', migration.store_id)

    const customerEmailMap: Record<string, string> = {}
    if (customers) {
      for (const c of customers) {
        customerEmailMap[c.email] = c.id
      }
    }

    // Refresh product_id_map from DB for order item linking
    const refreshed = await getMigration(migration.id)
    const productIdMap = refreshed?.product_id_map || migration.product_id_map

    let cursor: string | null = null
    let hasMore = true
    let rateLimitAttempts = 0

    while (hasMore) {
      if (Date.now() - startTime > MAX_MIGRATION_DURATION_MS) {
        await updateMigrationStatus(migration.id, 'paused')
        return
      }

      const current = await getMigration(migration.id)
      if (current?.status === 'cancelled') return

      try {
        const page = await fetchShopifyOrders(
          migration.source_shop_id!,
          accessToken,
          cursor
        )

        rateLimitAttempts = 0

        const orders = page.orders.map(transformShopifyOrder)

        for (const order of orders) {
          if (migration.order_id_map[order.source_id]) continue

          try {
            const newOrderId = await createMigratedOrder(
              migration.store_id,
              order,
              customerEmailMap,
              productIdMap
            )
            await updateOrderIdMap(migration.id, order.source_id, newOrderId)
            await incrementMigrationCount(migration.id, 'migrated_orders')
            migration.order_id_map[order.source_id] = newOrderId
          } catch (error) {
            console.error(`[Migration] Failed to migrate order ${order.source_id}:`, error)
            await addMigrationError(migration.id, {
              type: 'order',
              source_id: order.source_id,
              source_title: order.order_number,
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            })
            await incrementMigrationCount(migration.id, 'failed_orders')
          }
        }

        hasMore = page.hasNextPage
        cursor = page.endCursor
      } catch (error) {
        if (error instanceof ShopifyRateLimitError) {
          rateLimitAttempts++
          await backoff(rateLimitAttempts)
          if (rateLimitAttempts > 10) {
            await addMigrationError(migration.id, {
              type: 'rate_limit',
              message: 'Too many rate limit retries during order import, pausing',
              timestamp: new Date().toISOString(),
            })
            await updateMigrationStatus(migration.id, 'paused')
            return
          }
          continue
        }
        throw error
      }
    }
  } catch (error) {
    console.error('[Migration] Order migration error:', error)
    await addMigrationError(migration.id, {
      type: 'order',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}
