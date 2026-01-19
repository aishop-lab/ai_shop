// Cart Validation API Route

import { NextResponse } from 'next/server'
import { cartValidationSchema, validateCartItems, verifyStore } from '@/lib/cart/validation'
import { calculateCartTotal } from '@/lib/cart/calculations'
import type { StoreSettings, DEFAULT_STORE_SETTINGS } from '@/lib/types/store'
import type { CartValidationResult } from '@/lib/types/cart'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cart/validate
 *
 * Validate cart items and calculate totals before checkout.
 *
 * Request body:
 * {
 *   store_id: string,
 *   items: Array<{ product_id: string, quantity: number }>,
 *   payment_method?: string,  // 'cod' | 'razorpay' | 'upi' | 'stripe'
 *   coupon_code?: string      // For future coupon implementation
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   valid: boolean,
 *   items: ValidatedCartItem[],
 *   totals: CartTotals,
 *   errors?: string[]
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate request schema
    const parseResult = cartValidationSchema.safeParse(body)

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return NextResponse.json(
        {
          success: false,
          valid: false,
          items: [],
          totals: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
          errors
        } as CartValidationResult,
        { status: 400 }
      )
    }

    const { store_id, items, payment_method, coupon_code } = parseResult.data

    // Verify store exists and is active
    const storeResult = await verifyStore(store_id)

    if (!storeResult.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          items: [],
          totals: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
          errors: [storeResult.error || 'Store not found']
        } as CartValidationResult,
        { status: 404 }
      )
    }

    // Validate cart items
    const validationResult = await validateCartItems(store_id, items)

    if (validationResult.errors.length > 0 && validationResult.validatedItems.length === 0) {
      // All items failed validation
      return NextResponse.json(
        {
          success: false,
          valid: false,
          items: [],
          totals: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
          errors: validationResult.errors
        } as CartValidationResult,
        { status: 400 }
      )
    }

    // Get store settings with defaults
    const rawSettings = storeResult.store?.settings as Record<string, Record<string, unknown>> | undefined
    const checkoutSettings = rawSettings?.checkout || {}
    const shippingSettings = rawSettings?.shipping || {}
    const paymentsSettings = rawSettings?.payments || {}

    const storeSettings: StoreSettings = {
      checkout: {
        guest_checkout_enabled: (checkoutSettings.guest_checkout_enabled as boolean) ?? true,
        phone_required: (checkoutSettings.phone_required as boolean) ?? true
      },
      shipping: {
        free_shipping_threshold: (shippingSettings.free_shipping_threshold as number) ?? 999,
        flat_rate_national: (shippingSettings.flat_rate_national as number) ?? 49,
        cod_enabled: (shippingSettings.cod_enabled as boolean) ?? true,
        cod_fee: (shippingSettings.cod_fee as number) ?? 20
      },
      payments: {
        razorpay_enabled: (paymentsSettings.razorpay_enabled as boolean) ?? true,
        stripe_enabled: (paymentsSettings.stripe_enabled as boolean) ?? false,
        upi_enabled: (paymentsSettings.upi_enabled as boolean) ?? true
      }
    }

    // Calculate totals
    const totals = calculateCartTotal(
      validationResult.validatedItems,
      storeSettings,
      payment_method,
      coupon_code
    )

    // Return validation result
    const response: CartValidationResult = {
      success: true,
      valid: validationResult.valid,
      items: validationResult.validatedItems,
      totals,
      errors: validationResult.errors.length > 0 ? validationResult.errors : undefined
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Cart validation error:', error)
    return NextResponse.json(
      {
        success: false,
        valid: false,
        items: [],
        totals: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
        errors: ['Failed to validate cart']
      } as CartValidationResult,
      { status: 500 }
    )
  }
}
