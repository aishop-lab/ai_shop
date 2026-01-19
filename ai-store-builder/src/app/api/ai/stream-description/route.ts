// Streaming Description Generation API
// Streams product description generation for real-time UI feedback

import { vercelAI } from '@/lib/ai/vercel-ai-service'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const requestSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  attributes: z.record(z.string()).optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error.errors[0].message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { title, category, attributes } = validation.data

    console.log(`[StreamDescription] Streaming description for "${title}"`)

    // Get the streaming result
    const result = await vercelAI.streamProductDescription(title, category, attributes)

    // Return the stream as a response
    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[StreamDescription] Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to stream description' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
