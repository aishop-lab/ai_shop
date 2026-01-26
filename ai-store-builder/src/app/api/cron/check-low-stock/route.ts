import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLowStockAlertEmail } from '@/lib/email/merchant-notifications'

// Use service role for cron jobs
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Default low stock threshold
const DEFAULT_LOW_STOCK_THRESHOLD = 5

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting low stock check...')

    // Get all active stores with their owner's email
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select(`
        id,
        name,
        slug,
        owner_id,
        settings,
        profiles!stores_owner_id_fkey (
          email:id
        )
      `)
      .eq('status', 'active')

    if (storesError) {
      console.error('[Cron] Failed to fetch stores:', storesError)
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }

    if (!stores || stores.length === 0) {
      console.log('[Cron] No active stores found')
      return NextResponse.json({ message: 'No active stores', alertsSent: 0 })
    }

    let alertsSent = 0
    const errors: string[] = []

    for (const store of stores) {
      try {
        // Get store's low stock threshold from settings
        const settings = store.settings as { low_stock_threshold?: number } | null
        const threshold = settings?.low_stock_threshold || DEFAULT_LOW_STOCK_THRESHOLD

        // Find products with low stock
        const { data: lowStockProducts, error: productsError } = await supabaseAdmin
          .from('products')
          .select('id, title, sku, quantity')
          .eq('store_id', store.id)
          .eq('track_quantity', true)
          .eq('status', 'published')
          .eq('is_demo', false)
          .lte('quantity', threshold)

        if (productsError) {
          console.error(`[Cron] Failed to fetch products for store ${store.id}:`, productsError)
          errors.push(`Store ${store.id}: ${productsError.message}`)
          continue
        }

        if (!lowStockProducts || lowStockProducts.length === 0) {
          continue // No low stock items
        }

        // Get merchant email from auth
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(store.owner_id)
        const merchantEmail = authUser?.user?.email

        if (!merchantEmail) {
          console.error(`[Cron] No email found for store owner ${store.owner_id}`)
          continue
        }

        // Check if we've already sent an alert for these products recently (within 24h)
        const { data: recentNotification } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('store_id', store.id)
          .eq('type', 'low_stock')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1)

        if (recentNotification && recentNotification.length > 0) {
          console.log(`[Cron] Skipping store ${store.id} - alert sent within 24h`)
          continue
        }

        // Format products for email
        const formattedProducts = lowStockProducts.map(p => ({
          id: p.id,
          title: p.title,
          sku: p.sku || undefined,
          current_stock: p.quantity || 0,
          threshold
        }))

        // Send email alert
        const result = await sendLowStockAlertEmail({
          merchantEmail,
          storeName: store.name,
          products: formattedProducts
        })

        if (result.success) {
          alertsSent++

          // Create notification record
          await supabaseAdmin.from('notifications').insert({
            store_id: store.id,
            user_id: store.owner_id,
            type: 'low_stock',
            title: `Low Stock Alert: ${formattedProducts.length} product(s)`,
            message: `${formattedProducts.map(p => p.title).join(', ')} ${formattedProducts.length === 1 ? 'is' : 'are'} running low on stock.`,
            data: { products: formattedProducts },
            read: false
          })

          console.log(`[Cron] Low stock alert sent for store ${store.name}`)
        } else {
          errors.push(`Store ${store.id}: ${result.error}`)
        }
      } catch (storeError) {
        console.error(`[Cron] Error processing store ${store.id}:`, storeError)
        errors.push(`Store ${store.id}: ${storeError instanceof Error ? storeError.message : 'Unknown error'}`)
      }
    }

    console.log(`[Cron] Low stock check complete. Alerts sent: ${alertsSent}`)

    return NextResponse.json({
      message: 'Low stock check complete',
      storesChecked: stores.length,
      alertsSent,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('[Cron] Low stock check failed:', error)
    return NextResponse.json(
      { error: 'Low stock check failed' },
      { status: 500 }
    )
  }
}

// Also support POST for Vercel Cron
export async function POST(request: Request) {
  return GET(request)
}
