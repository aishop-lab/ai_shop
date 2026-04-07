// CIPHER (Technical) Sub-Agent Tool Definitions
// AI SDK tool syntax using `tool()` from 'ai' + zod parameters

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// IMAGE-OPTIMIZER tools
// ---------------------------------------------------------------------------

const get_unoptimized_images = tool({
  description:
    'Query product_images to find images that may need optimization — ' +
    'missing alt text, large file sizes, or images that have not been processed by the enhancement pipeline.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    limit: z.number().optional().describe('Max images to return (default: 100)'),
    include_processed: z
      .boolean()
      .optional()
      .describe('Include already-processed images in results (default: false)'),
  }),
  execute: async ({ store_id, limit = 100, include_processed = false }) => {
    const supabase = getSupabaseAdmin()

    // Get product images along with their product info
    let query = supabase
      .from('product_images')
      .select(
        `
        id,
        product_id,
        original_url,
        thumbnail_url,
        alt_text,
        position,
        is_primary,
        created_at,
        products!inner (
          id,
          title,
          store_id,
          status
        )
      `
      )
      .eq('products.store_id', store_id)
      .eq('products.is_demo', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!include_processed) {
      // Images without alt text are prime optimization candidates
      query = query.is('alt_text', null)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, images: [] }
    }

    // Identify optimization opportunities
    const images = (data ?? []).map((img) => ({
      id: img.id,
      product_id: img.product_id,
      product_title: (img.products as unknown as { title: string })?.title ?? 'Unknown',
      original_url: img.original_url,
      thumbnail_url: img.thumbnail_url,
      alt_text: img.alt_text,
      is_primary: img.is_primary,
      position: img.position,
      issues: [
        ...(!img.alt_text ? ['missing_alt_text'] : []),
        ...(!img.thumbnail_url ? ['missing_thumbnail'] : []),
      ],
    }))

    return {
      success: true,
      count: images.length,
      images,
      summary: {
        missing_alt_text: images.filter((i) => i.issues.includes('missing_alt_text')).length,
        missing_thumbnail: images.filter((i) => i.issues.includes('missing_thumbnail')).length,
      },
    }
  },
})

const optimize_image = tool({
  description:
    'Identify a specific product image for optimization and log it for the Sharp processing pipeline. ' +
    'Returns the image details and recommended optimizations. ' +
    'Actual Sharp processing is handled by the image-processor module after chief approval.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    image_id: z.string().describe('The product_images row UUID to optimize'),
    optimization_type: z
      .enum(['compress', 'resize', 'add_alt_text', 'convert_format', 'enhance'])
      .describe('Type of optimization to perform'),
    alt_text: z
      .string()
      .optional()
      .describe('Alt text to set on the image (required when optimization_type is add_alt_text)'),
    target_max_kb: z
      .number()
      .optional()
      .describe('Target max file size in KB (for compress optimization, default: 200)'),
  }),
  execute: async ({ store_id, image_id, optimization_type, alt_text, target_max_kb = 200 }) => {
    const supabase = getSupabaseAdmin()

    // If adding alt text, we can do that directly
    if (optimization_type === 'add_alt_text' && alt_text) {
      const { data, error } = await supabase
        .from('product_images')
        .update({ alt_text })
        .eq('id', image_id)
        .select(
          `
          id,
          product_id,
          original_url,
          alt_text,
          products!inner ( store_id )
        `
        )
        .eq('products.store_id', store_id)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        image_id,
        optimization_applied: 'add_alt_text',
        result: data,
        message: `Alt text set: "${alt_text}"`,
      }
    }

    // For other optimizations, log as queued for Sharp processing
    const { data: image, error: fetchError } = await supabase
      .from('product_images')
      .select('id, product_id, original_url, thumbnail_url')
      .eq('id', image_id)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    // Log optimization request to agent_actions for the cron processing pipeline
    await supabase.from('agent_actions').insert({
      store_id,
      agent_type: 'technical',
      sub_agent_type: 'image-optimizer',
      action_type: 'optimize_image',
      action_category: 'maintenance',
      summary: `Image optimization queued: ${optimization_type} for image ${image_id}`,
      details: {
        image_id,
        product_id: image?.product_id,
        original_url: image?.original_url,
        optimization_type,
        target_max_kb,
        status: 'queued',
      },
      status: 'pending',
      execution_mode: 'auto',
      started_at: new Date().toISOString(),
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost_usd: 0,
      api_costs: {},
    })

    return {
      success: true,
      image_id,
      optimization_queued: optimization_type,
      image,
      note: `${optimization_type} optimization queued for Sharp processing pipeline`,
    }
  },
})

export const IMAGE_OPTIMIZER_TOOLS = {
  get_unoptimized_images,
  optimize_image,
}

// ---------------------------------------------------------------------------
// BACKUP-MANAGER tools
// ---------------------------------------------------------------------------

const BACKUP_BUCKET = 'backups'

const export_store_data = tool({
  description:
    'Export all key store tables to a JSON backup file in Supabase Storage. ' +
    'Returns a signed download URL (valid 7 days), file size, and record counts.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID to export data for'),
    include_full_data: z
      .boolean()
      .optional()
      .describe(
        'If true, includes full data (up to 1000 rows per table). ' +
        'If false (default), returns only counts and metadata.'
      ),
  }),
  execute: async ({ store_id, include_full_data = false }) => {
    const supabase = getSupabaseAdmin()
    const limit = include_full_data ? 1000 : 1
    const exportTimestamp = new Date().toISOString()

    // Products
    const { count: productCount, data: products } = await supabase
      .from('products')
      .select('id, title, price, status, created_at', { count: 'exact' })
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .limit(limit)

    // Orders
    const { count: orderCount, data: orders } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, status, created_at', { count: 'exact' })
      .eq('store_id', store_id)
      .limit(limit)

    // Customers
    const { count: customerCount, data: customers } = await supabase
      .from('customers')
      .select('id, email, name, total_orders, created_at', { count: 'exact' })
      .eq('store_id', store_id)
      .limit(limit)

    // Collections
    const { count: collectionCount, data: collections } = await supabase
      .from('collections')
      .select('id, title, created_at', { count: 'exact' })
      .eq('store_id', store_id)
      .limit(limit)

    // Coupons
    const { count: couponCount, data: coupons } = await supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, created_at', { count: 'exact' })
      .eq('store_id', store_id)
      .limit(limit)

    // Store config
    const { data: storeConfig } = await supabase
      .from('stores')
      .select('id, name, slug, created_at, updated_at')
      .eq('id', store_id)
      .single()

    const exportData = {
      export_timestamp: exportTimestamp,
      store: storeConfig,
      summary: {
        products: productCount ?? 0,
        orders: orderCount ?? 0,
        customers: customerCount ?? 0,
        collections: collectionCount ?? 0,
        coupons: couponCount ?? 0,
      },
      data: include_full_data
        ? { products, orders, customers, collections, coupons }
        : null,
    }

    // -----------------------------------------------------------------------
    // Persist backup to Supabase Storage
    // -----------------------------------------------------------------------
    const fileName = `${store_id}/${exportTimestamp.replace(/[:.]/g, '-')}.json`
    const jsonData = JSON.stringify(exportData, null, 2)
    const fileSizeBytes = new TextEncoder().encode(jsonData).byteLength

    // Attempt upload – if the bucket doesn't exist yet, create it and retry
    let uploadError: { message: string } | null = null
    const attemptUpload = async () => {
      const result = await supabase.storage
        .from(BACKUP_BUCKET)
        .upload(fileName, jsonData, {
          contentType: 'application/json',
          upsert: false,
        })
      return result
    }

    let uploadResult = await attemptUpload()
    uploadError = uploadResult.error

    if (uploadError && /bucket.*not found/i.test(uploadError.message)) {
      // Try to create the bucket (private by default)
      const { error: bucketError } = await supabase.storage.createBucket(BACKUP_BUCKET, {
        public: false,
      })
      if (bucketError && !/already exists/i.test(bucketError.message)) {
        return {
          success: false,
          error: `Failed to create backups bucket: ${bucketError.message}`,
          export_timestamp: exportTimestamp,
          summary: exportData.summary,
        }
      }
      // Retry upload after bucket creation
      uploadResult = await attemptUpload()
      uploadError = uploadResult.error
    }

    if (uploadError) {
      return {
        success: false,
        error: `Backup upload failed: ${uploadError.message}`,
        export_timestamp: exportTimestamp,
        summary: exportData.summary,
      }
    }

    // Generate a signed URL valid for 7 days
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .createSignedUrl(fileName, 7 * 24 * 60 * 60) // 7 days in seconds

    if (urlError) {
      return {
        success: false,
        error: `Backup uploaded but signed URL generation failed: ${urlError.message}`,
        export_timestamp: exportTimestamp,
        storage_path: `${BACKUP_BUCKET}/${fileName}`,
        summary: exportData.summary,
      }
    }

    return {
      success: true,
      export_timestamp: exportTimestamp,
      store: storeConfig,
      backup: {
        storage_path: `${BACKUP_BUCKET}/${fileName}`,
        signed_url: urlData.signedUrl,
        expires_in: '7 days',
        file_size_bytes: fileSizeBytes,
        file_size_kb: Math.round(fileSizeBytes / 1024),
      },
      summary: exportData.summary,
    }
  },
})

const get_backup_status = tool({
  description:
    'Return the last backup timestamp and overall data health for a store. ' +
    'Uses the export history logged in agent_actions to determine recency.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID to check backup status for'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    // Check last backup/export action
    const { data: lastBackup } = await supabase
      .from('agent_actions')
      .select('completed_at, details, status')
      .eq('store_id', store_id)
      .eq('sub_agent_type', 'backup-manager')
      .eq('action_type', 'export_store_data')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    const lastBackupAt = lastBackup?.completed_at as string | null
    const now = Date.now()
    const backupAgeMs = lastBackupAt ? now - new Date(lastBackupAt).getTime() : null
    const backupAgeHours = backupAgeMs ? Math.round(backupAgeMs / (1000 * 60 * 60)) : null

    // Get current record counts for health assessment
    const { count: productCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id)
      .eq('is_demo', false)

    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id)

    const { count: customerCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id)

    let overallHealth: 'healthy' | 'at_risk' | 'failed'
    if (!lastBackupAt) {
      overallHealth = 'failed'
    } else if (backupAgeHours !== null && backupAgeHours > 48) {
      overallHealth = 'at_risk'
    } else {
      overallHealth = 'healthy'
    }

    return {
      success: true,
      report_timestamp: new Date().toISOString(),
      overall_backup_health: overallHealth,
      last_successful_backup: lastBackupAt ?? null,
      backup_age_hours: backupAgeHours,
      current_record_counts: {
        products: productCount ?? 0,
        orders: orderCount ?? 0,
        customers: customerCount ?? 0,
      },
      alerts:
        overallHealth !== 'healthy'
          ? [
              {
                severity: overallHealth === 'failed' ? 'critical' : 'warning',
                message:
                  overallHealth === 'failed'
                    ? 'No backup found — immediate backup recommended'
                    : `Last backup was ${backupAgeHours} hours ago — consider running a backup`,
              },
            ]
          : [],
    }
  },
})

export const BACKUP_MANAGER_TOOLS = {
  export_store_data,
  get_backup_status,
}
