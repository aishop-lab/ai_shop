import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/utils'
import { sendRecoveryEmail } from '@/lib/cart/abandoned-cart'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cart_id } = body

    if (!cart_id) {
      return NextResponse.json({ error: 'Cart ID required' }, { status: 400 })
    }

    // Fetch the cart with store info
    const { data: cart, error: cartError } = await supabase
      .from('abandoned_carts')
      .select(`
        *,
        stores!inner(id, name, slug, owner_id)
      `)
      .eq('id', cart_id)
      .single()

    if (cartError || !cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    // Verify user owns the store
    if (cart.stores.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if cart is still active
    if (cart.recovery_status !== 'active') {
      return NextResponse.json(
        { error: 'Cart is no longer active' },
        { status: 400 }
      )
    }

    // Check if cart has email
    if (!cart.email) {
      return NextResponse.json(
        { error: 'Cart has no email address' },
        { status: 400 }
      )
    }

    // Determine which email sequence to send (based on emails already sent)
    const emailNumber = Math.min(cart.recovery_emails_sent + 1, 3) as 1 | 2 | 3

    // Get store cart recovery settings for discount code (if email 3)
    let discountCode: string | undefined
    let discountPercentage: number | undefined

    if (emailNumber === 3) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('cart_recovery_settings')
        .eq('id', cart.stores.id)
        .single()

      if (storeData?.cart_recovery_settings) {
        const settings = storeData.cart_recovery_settings as {
          discount_code?: string
          discount_percentage?: number
        }
        discountCode = settings.discount_code
        discountPercentage = settings.discount_percentage
      }
    }

    // Send recovery email
    const result = await sendRecoveryEmail({
      cart: {
        id: cart.id,
        store_id: cart.store_id,
        customer_id: cart.customer_id,
        email: cart.email,
        phone: cart.phone,
        items: cart.items,
        subtotal: cart.subtotal,
        item_count: cart.item_count,
        recovery_status: cart.recovery_status,
        recovery_emails_sent: cart.recovery_emails_sent,
        recovery_token: cart.recovery_token,
        created_at: cart.created_at,
        updated_at: cart.updated_at,
        abandoned_at: cart.abandoned_at,
      },
      store: {
        id: cart.stores.id,
        name: cart.stores.name,
        slug: cart.stores.slug,
      },
      sequenceNumber: emailNumber,
      discountCode,
      discountPercentage,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Recovery email #${emailNumber} sent successfully`,
    })
  } catch (error) {
    console.error('Send recovery email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
