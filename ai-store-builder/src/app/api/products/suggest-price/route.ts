import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTextModel } from '@/lib/ai/provider'
import { generateObject } from 'ai'
import { z } from 'zod'

const priceSchema = z.object({
    price: z.number().describe('Suggested selling price in INR'),
    compare_at: z.number().optional().describe('Optional compare-at/MRP price for showing discount'),
    reasoning: z.string().describe('Brief explanation of the pricing rationale')
})

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { title, category, description } = body

        if (!title || !category) {
            return NextResponse.json(
                { success: false, error: 'Title and category are required' },
                { status: 400 }
            )
        }

        console.log('[SuggestPrice] Generating price for:', title, category)

        // Use Gemini to suggest price
        const prompt = `You are a pricing expert for Indian e-commerce. Based on the product details below, suggest an optimal selling price in Indian Rupees (INR).

Consider:
- Market rates for similar products in India
- The category and target audience
- Competitive pricing that's attractive yet profitable
- A compare-at price (MRP) if it makes sense to show savings

Product Details:
- Title: ${title}
- Category: ${category}
${description ? `- Description: ${description.substring(0, 500)}` : ''}

Provide a realistic price range for Indian consumers. Most products should be priced between ₹100 and ₹50,000.`

        const result = await generateObject({
            model: getTextModel(),
            schema: priceSchema,
            prompt
        })

        return NextResponse.json({
            success: true,
            price: result.object.price,
            compare_at: result.object.compare_at,
            reasoning: result.object.reasoning
        })

    } catch (error) {
        console.error('[SuggestPrice] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate price suggestion'
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        )
    }
}
