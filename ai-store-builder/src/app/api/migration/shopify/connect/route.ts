// Direct Shopify token connection (for Custom Apps / manual token entry)
// Bypasses OAuth flow - sellers paste their Admin API access token directly

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/encryption'
import { validateShopDomain, fetchShopifyShopInfo } from '@/lib/migration/shopify/oauth'

export async function POST(request: NextRequest) {
  try {
    // --- Authentication ---
    // Try cookie-based auth first, fall back to Authorization header
    let userId: string | null = null

    // Method 1: Cookie-based auth
    const supabase = await createClient()
    const { data: cookieAuth } = await supabase.auth.getUser()
    if (cookieAuth?.user) {
      userId = cookieAuth.user.id
    }

    // Method 2: Authorization header (fallback for production)
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (supabaseUrl && supabaseKey) {
          const tokenClient = createServiceClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          })
          const { data: tokenAuth } = await tokenClient.auth.getUser(token)
          if (tokenAuth?.user) {
            userId = tokenAuth.user.id
          }
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, shop_url, access_token } = body

    if (!store_id || !shop_url || !access_token) {
      return NextResponse.json(
        { error: 'Missing required fields: store_id, shop_url, access_token' },
        { status: 400 }
      )
    }

    // Validate store ownership using admin client (bypasses RLS)
    const { data: userStores } = await getSupabaseAdmin()
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .eq('owner_id', userId)
      .limit(1)

    if (!userStores || userStores.length === 0) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Validate shop domain
    const shopDomain = validateShopDomain(shop_url)
    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Invalid Shopify store URL. Use format: myshop.myshopify.com' },
        { status: 400 }
      )
    }

    // Validate the access token by fetching shop info
    let shopInfo: { id: number; name: string }
    try {
      shopInfo = await fetchShopifyShopInfo(shopDomain, access_token)
    } catch {
      return NextResponse.json(
        { error: 'Invalid access token. Could not connect to your Shopify store. Please check that the token has read_products, read_orders, read_customers, and read_discounts scopes.' },
        { status: 400 }
      )
    }

    // Encrypt the access token
    const encryptedToken = encrypt(access_token)

    // Check for existing migration for this store using admin client
    const admin = getSupabaseAdmin()
    const { data: existingMigration } = await admin
      .from('store_migrations')
      .select('id')
      .eq('store_id', store_id)
      .eq('platform', 'shopify')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let migrationId: string

    if (existingMigration) {
      // Update existing migration record
      const { error: updateError } = await admin
        .from('store_migrations')
        .update({
          source_shop_id: shopDomain,
          source_shop_name: shopInfo.name,
          access_token_encrypted: encryptedToken,
          status: 'connected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMigration.id)

      if (updateError) {
        console.error('Failed to update migration:', updateError)
        return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
      }

      migrationId = existingMigration.id
    } else {
      // Create new migration record
      const { data: newMigration, error: insertError } = await admin
        .from('store_migrations')
        .insert({
          store_id,
          platform: 'shopify',
          source_shop_id: shopDomain,
          source_shop_name: shopInfo.name,
          access_token_encrypted: encryptedToken,
          status: 'connected',
        })
        .select('id')
        .single()

      if (insertError || !newMigration) {
        console.error('Failed to create migration:', insertError)
        return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
      }

      migrationId = newMigration.id
    }

    return NextResponse.json({
      success: true,
      migration_id: migrationId,
      shop_name: shopInfo.name,
    })
  } catch (error) {
    console.error('Shopify direct connect error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Shopify store' },
      { status: 500 }
    )
  }
}
