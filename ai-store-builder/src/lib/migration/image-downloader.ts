// Batch download external images and re-upload via existing uploadProductImageFromUrl()

import { uploadProductImageFromUrl } from '@/lib/products/image-processor'
import { IMAGE_BATCH_SIZE } from './constants'
import type { MigrationImage } from './types'

export interface ImageDownloadResult {
  success: boolean
  position: number
  source_url: string
  error?: string
}

/**
 * Download and re-upload images for a migrated product in batches
 * Uses existing uploadProductImageFromUrl() which handles:
 *   - Fetching from URL
 *   - Processing with Sharp (resize + thumbnails)
 *   - Uploading to Supabase storage
 *   - Creating product_images DB record
 */
export async function downloadAndUploadImages(
  storeId: string,
  productId: string,
  images: MigrationImage[]
): Promise<ImageDownloadResult[]> {
  const results: ImageDownloadResult[] = []

  // Process in batches to avoid overwhelming the server
  for (let i = 0; i < images.length; i += IMAGE_BATCH_SIZE) {
    const batch = images.slice(i, i + IMAGE_BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map(async (image) => {
        try {
          await uploadProductImageFromUrl(
            storeId,
            productId,
            image.source_url,
            image.position
          )
          return {
            success: true,
            position: image.position,
            source_url: image.source_url,
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          console.error(
            `[Migration] Failed to download image ${image.source_url}:`,
            message
          )
          return {
            success: false,
            position: image.position,
            source_url: image.source_url,
            error: message,
          }
        }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({
          success: false,
          position: batch[results.length % batch.length]?.position ?? i,
          source_url: 'unknown',
          error: result.reason?.message || 'Promise rejected',
        })
      }
    }
  }

  return results
}
