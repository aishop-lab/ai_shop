// Streaming Chat API - Real-time AI assistant chat
import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { geminiFlash } from '@/lib/ai/provider'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const E_COMMERCE_ASSISTANT_PROMPT = `You are a helpful e-commerce assistant for AI Store Builder.
You help store owners with:
- Product descriptions and titles
- Pricing strategies
- Category and tag suggestions
- Store optimization tips
- Marketing advice
- Customer service best practices

Be concise, helpful, and focused on e-commerce topics.
When suggesting product information, be specific and actionable.
Use a friendly, professional tone.`

export async function POST(request: Request) {
  // Apply AI rate limiting
  const rateLimitResult = rateLimit(request as NextRequest, RATE_LIMITS.AI)
  if (rateLimitResult) return rateLimitResult

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

    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const result = await streamText({
      model: geminiFlash,
      system: E_COMMERCE_ASSISTANT_PROMPT,
      messages,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
