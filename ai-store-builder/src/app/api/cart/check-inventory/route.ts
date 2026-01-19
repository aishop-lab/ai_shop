// Inventory Check API Route

import { NextResponse } from 'next/server'
import { inventoryCheckSchema, checkInventory } from '@/lib/cart/validation'
import type { InventoryCheckResult } from '@/lib/types/cart'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cart/check-inventory
 *
 * Quick inventory check for cart items.
 * Used to verify stock availability before adding to cart or during checkout.
 *
 * Request body:
 * {
 *   items: Array<{ product_id: string, quantity: number }>
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   available: boolean,
 *   items: Array<{
 *     product_id: string,
 *     available_quantity: number,
 *     requested_quantity: number,
 *     in_stock: boolean
 *   }>
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate request schema
    const parseResult = inventoryCheckSchema.safeParse(body)

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return NextResponse.json(
        {
          success: false,
          available: false,
          items: [],
          errors
        },
        { status: 400 }
      )
    }

    const { items } = parseResult.data

    // Check inventory for all items
    const result = await checkInventory(items)

    const response: InventoryCheckResult = {
      success: true,
      available: result.available,
      items: result.items
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Inventory check error:', error)
    return NextResponse.json(
      {
        success: false,
        available: false,
        items: [],
        errors: ['Failed to check inventory']
      },
      { status: 500 }
    )
  }
}
