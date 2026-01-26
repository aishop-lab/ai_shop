import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveCart } from '@/lib/cart/abandoned-cart'

const saveCartSchema = z.object({
  storeId: z.string().uuid(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().optional(),
    title: z.string(),
    variant_title: z.string().optional(),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    image_url: z.string().url().optional()
  }))
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = saveCartSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { storeId, email, phone, items } = validation.data

    // Don't save empty carts
    if (items.length === 0) {
      return NextResponse.json({ success: true, message: 'Empty cart not saved' })
    }

    const result = await saveCart({
      storeId,
      email,
      phone,
      items
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Save cart error:', error)
    return NextResponse.json(
      { error: 'Failed to save cart' },
      { status: 500 }
    )
  }
}
