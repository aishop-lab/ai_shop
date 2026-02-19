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
  StoreMigration,
} from './types'

// Shopify imports
import { fetchShopifyProducts, fetchShopifyCollections, getShopifyProductCount, getShopifyCollectionCount, ShopifyRateLimitError } from './shopify/client'
import { transformShopifyProduct, transformShopifyCollection } from './shopify/transformer'

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
