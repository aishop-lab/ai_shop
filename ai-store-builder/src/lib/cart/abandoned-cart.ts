/**
 * Abandoned Cart Recovery Service
 *
 * Handles cart persistence, recovery email sequences, and cart restoration.
 */

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import AbandonedCartEmail from '@/../emails/abandoned-cart'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const fromEmail = process.env.RESEND_FROM_EMAIL || 'cart@storeforge.site'
const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN || 'storeforge.site'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function getStoreUrl(storeSlug: string): string {
  if (IS_PRODUCTION) {
    return `https://${storeSlug}.${PRODUCTION_DOMAIN}`
  }
  return `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/${storeSlug}`
}

interface CartItem {
  product_id: string
  variant_id?: string
  title: string
  variant_title?: string
  price: number
  quantity: number
  image_url?: string
}

interface SaveCartParams {
  storeId: string
  customerId?: string
  email?: string
  phone?: string
  items: CartItem[]
}

interface AbandonedCart {
  id: string
  store_id: string
  customer_id?: string
  email?: string
  phone?: string
  items: CartItem[]
  subtotal: number
  item_count: number
  recovery_status: string
  recovery_emails_sent: number
  recovery_token: string
  created_at: string
  updated_at: string
  abandoned_at?: string
}

/**
 * Save or update cart for recovery tracking
 */
export async function saveCart(params: SaveCartParams): Promise<{ success: boolean; cartId?: string }> {
  try {
    const { storeId, customerId, email, phone, items } = params

    if (!email && !customerId) {
      // Can't track cart without email or customer ID
      return { success: false }
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

    // Check for existing active cart
    let existingCart = null
    if (email) {
      const { data } = await supabase
        .from('abandoned_carts')
        .select('id')
        .eq('store_id', storeId)
        .eq('email', email.toLowerCase())
        .eq('recovery_status', 'active')
        .single()
      existingCart = data
    } else if (customerId) {
      const { data } = await supabase
        .from('abandoned_carts')
        .select('id')
        .eq('store_id', storeId)
        .eq('customer_id', customerId)
        .eq('recovery_status', 'active')
        .single()
      existingCart = data
    }

    if (existingCart) {
      // Update existing cart
      const { error } = await supabase
        .from('abandoned_carts')
        .update({
          items,
          subtotal,
          item_count: itemCount,
          updated_at: new Date().toISOString(),
          abandoned_at: null, // Reset abandoned status on activity
          recovery_emails_sent: 0 // Reset email count on activity
        })
        .eq('id', existingCart.id)

      if (error) {
        console.error('Failed to update cart:', error)
        return { success: false }
      }

      return { success: true, cartId: existingCart.id }
    }

    // Create new cart
    const { data: newCart, error } = await supabase
      .from('abandoned_carts')
      .insert({
        store_id: storeId,
        customer_id: customerId,
        email: email?.toLowerCase(),
        phone,
        items,
        subtotal,
        item_count: itemCount
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create cart:', error)
      return { success: false }
    }

    return { success: true, cartId: newCart.id }
  } catch (error) {
    console.error('Save cart error:', error)
    return { success: false }
  }
}

/**
 * Mark cart as recovered (order completed)
 */
export async function markCartRecovered(params: {
  storeId: string
  email: string
  orderId: string
}): Promise<void> {
  try {
    await supabase
      .from('abandoned_carts')
      .update({
        recovery_status: 'recovered',
        recovered_at: new Date().toISOString(),
        recovered_order_id: params.orderId
      })
      .eq('store_id', params.storeId)
      .eq('email', params.email.toLowerCase())
      .eq('recovery_status', 'active')
  } catch (error) {
    console.error('Mark cart recovered error:', error)
  }
}

/**
 * Get cart by recovery token
 */
export async function getCartByToken(token: string): Promise<AbandonedCart | null> {
  try {
    const { data, error } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('recovery_token', token)
      .eq('recovery_status', 'active')
      .single()

    if (error || !data) {
      return null
    }

    return data as AbandonedCart
  } catch (error) {
    console.error('Get cart by token error:', error)
    return null
  }
}

/**
 * Send abandoned cart recovery email
 */
export async function sendRecoveryEmail(params: {
  cart: AbandonedCart
  store: { name: string; slug: string }
  sequenceNumber: 1 | 2 | 3
  discountCode?: string
  discountPercentage?: number
}): Promise<{ success: boolean }> {
  try {
    const { cart, store, sequenceNumber, discountCode, discountPercentage } = params

    if (!cart.email) {
      return { success: false }
    }

    const storeUrl = getStoreUrl(store.slug)
    const recoveryUrl = `${storeUrl}/cart/recover?token=${cart.recovery_token}`

    // Subject lines for each sequence
    const subjects = {
      1: 'You left something behind!',
      2: `Your cart at ${store.name} is waiting`,
      3: `Last chance: Your ${store.name} cart expires soon`
    }

    // Log if Resend not configured
    if (!resend) {
      console.log('=== ABANDONED CART EMAIL (Resend not configured) ===')
      console.log('To:', cart.email)
      console.log('Sequence:', sequenceNumber)
      console.log('Recovery URL:', recoveryUrl)
      console.log('Items:', cart.items.length)
      console.log('=================================================')
      return { success: true }
    }

    const { error } = await resend.emails.send({
      from: `${store.name} <${fromEmail}>`,
      to: cart.email,
      subject: subjects[sequenceNumber],
      react: AbandonedCartEmail({
        customerName: cart.email.split('@')[0],
        storeName: store.name,
        storeUrl,
        recoveryUrl,
        items: cart.items,
        subtotal: cart.subtotal,
        discountCode,
        discountPercentage,
        sequenceNumber
      })
    })

    if (error) {
      console.error('Failed to send recovery email:', error)
      return { success: false }
    }

    // Update cart and log email
    await supabase
      .from('abandoned_carts')
      .update({
        recovery_emails_sent: cart.recovery_emails_sent + 1,
        last_email_sent_at: new Date().toISOString()
      })
      .eq('id', cart.id)

    await supabase
      .from('cart_recovery_emails')
      .insert({
        cart_id: cart.id,
        sequence_number: sequenceNumber
      })

    console.log(`[Cart Recovery] Email ${sequenceNumber} sent to ${cart.email}`)
    return { success: true }
  } catch (error) {
    console.error('Send recovery email error:', error)
    return { success: false }
  }
}

/**
 * Process abandoned carts and send recovery emails
 * Called by cron job
 */
export async function processAbandonedCarts(): Promise<{
  processed: number
  emailsSent: number
  errors: string[]
}> {
  const result = { processed: 0, emailsSent: 0, errors: [] as string[] }

  try {
    const now = new Date()

    // Get all active stores with cart recovery enabled
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, slug, cart_recovery_settings')
      .eq('status', 'active')

    if (storesError || !stores) {
      result.errors.push('Failed to fetch stores')
      return result
    }

    for (const store of stores) {
      const settings = store.cart_recovery_settings as {
        enabled: boolean
        email_sequence: { delay_hours: number; subject: string }[]
        discount_code?: string
        discount_percentage?: number
      }

      if (!settings?.enabled) continue

      // Get abandoned carts for this store
      // Cart is considered abandoned if not updated for 1 hour
      const abandonedThreshold = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

      const { data: carts, error: cartsError } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('store_id', store.id)
        .eq('recovery_status', 'active')
        .lt('updated_at', abandonedThreshold)
        .lt('recovery_emails_sent', 3)
        .not('email', 'is', null)

      if (cartsError) {
        result.errors.push(`Store ${store.id}: ${cartsError.message}`)
        continue
      }

      if (!carts || carts.length === 0) continue

      for (const cart of carts) {
        result.processed++

        // Mark as abandoned if not already
        if (!cart.abandoned_at) {
          await supabase
            .from('abandoned_carts')
            .update({
              abandoned_at: cart.updated_at,
              expires_at: new Date(new Date(cart.updated_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', cart.id)

          cart.abandoned_at = cart.updated_at
        }

        // Check if cart has expired
        if (cart.expires_at && new Date(cart.expires_at) < now) {
          await supabase
            .from('abandoned_carts')
            .update({ recovery_status: 'expired' })
            .eq('id', cart.id)
          continue
        }

        // Determine which email to send based on time elapsed
        const abandonedAt = new Date(cart.abandoned_at)
        const hoursElapsed = (now.getTime() - abandonedAt.getTime()) / (1000 * 60 * 60)

        let sequenceToSend: 1 | 2 | 3 | null = null

        for (let i = 0; i < settings.email_sequence.length; i++) {
          const sequence = settings.email_sequence[i]
          const sequenceNum = (i + 1) as 1 | 2 | 3

          // Check if we should send this sequence
          if (
            cart.recovery_emails_sent < sequenceNum &&
            hoursElapsed >= sequence.delay_hours
          ) {
            // Check if enough time has passed since last email (at least 4 hours)
            if (cart.last_email_sent_at) {
              const hoursSinceLastEmail =
                (now.getTime() - new Date(cart.last_email_sent_at).getTime()) / (1000 * 60 * 60)
              if (hoursSinceLastEmail < 4) continue
            }

            sequenceToSend = sequenceNum
            break
          }
        }

        if (sequenceToSend) {
          const emailResult = await sendRecoveryEmail({
            cart: cart as AbandonedCart,
            store: { name: store.name, slug: store.slug },
            sequenceNumber: sequenceToSend,
            discountCode: sequenceToSend === 3 ? settings.discount_code : undefined,
            discountPercentage: sequenceToSend === 3 ? settings.discount_percentage : undefined
          })

          if (emailResult.success) {
            result.emailsSent++
          } else {
            result.errors.push(`Cart ${cart.id}: Failed to send email`)
          }
        }
      }
    }

    return result
  } catch (error) {
    result.errors.push(`Processing error: ${error instanceof Error ? error.message : 'Unknown'}`)
    return result
  }
}

/**
 * Unsubscribe cart from recovery emails
 */
export async function unsubscribeCart(token: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('abandoned_carts')
      .update({ recovery_status: 'unsubscribed' })
      .eq('recovery_token', token)

    return { success: !error }
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return { success: false }
  }
}
