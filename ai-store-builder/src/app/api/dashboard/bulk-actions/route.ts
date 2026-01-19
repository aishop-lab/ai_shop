import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { BulkActionRequest, BulkActionResponse } from '@/lib/types/dashboard'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Validation schema
const bulkActionSchema = z.object({
  action: z.enum(['update_status', 'delete', 'feature', 'unfeature', 'archive', 'restore']),
  resource: z.enum(['products', 'orders']),
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
  data: z.object({
    status: z.string().optional(),
    featured: z.boolean().optional()
  }).optional()
})

export async function POST(request: NextRequest): Promise<NextResponse<BulkActionResponse>> {
  try {
    const body = await request.json()

    // Validate request
    const validationResult = bulkActionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          updated: 0,
          error: 'Invalid request',
        },
        { status: 400 }
      )
    }

    const { action, resource, ids, data } = validationResult.data as BulkActionRequest
    
    let result
    const timestamp = new Date().toISOString()

    switch (action) {
      case 'update_status':
        if (!data?.status) {
          return NextResponse.json(
            { success: false, updated: 0, error: 'Status is required for update_status action' },
            { status: 400 }
          )
        }

        // Validate status based on resource
        if (resource === 'products') {
          const validStatuses = ['draft', 'published', 'archived']
          if (!validStatuses.includes(data.status)) {
            return NextResponse.json(
              { success: false, updated: 0, error: `Invalid product status. Must be: ${validStatuses.join(', ')}` },
              { status: 400 }
            )
          }
        } else if (resource === 'orders') {
          const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
          if (!validStatuses.includes(data.status)) {
            return NextResponse.json(
              { success: false, updated: 0, error: `Invalid order status. Must be: ${validStatuses.join(', ')}` },
              { status: 400 }
            )
          }
        }

        result = await supabase
          .from(resource)
          .update({
            status: data.status,
            updated_at: timestamp
          })
          .in('id', ids)
        break

      case 'delete':
      case 'archive':
        // Soft delete - set status to archived
        result = await supabase
          .from(resource)
          .update({
            status: 'archived',
            updated_at: timestamp
          })
          .in('id', ids)
        break

      case 'restore':
        // Restore archived items - set status to draft
        result = await supabase
          .from(resource)
          .update({
            status: 'draft',
            updated_at: timestamp
          })
          .in('id', ids)
        break

      case 'feature':
        if (resource !== 'products') {
          return NextResponse.json(
            { success: false, updated: 0, error: 'Feature action only applies to products' },
            { status: 400 }
          )
        }

        result = await supabase
          .from('products')
          .update({
            featured: true,
            updated_at: timestamp
          })
          .in('id', ids)
        break

      case 'unfeature':
        if (resource !== 'products') {
          return NextResponse.json(
            { success: false, updated: 0, error: 'Unfeature action only applies to products' },
            { status: 400 }
          )
        }

        result = await supabase
          .from('products')
          .update({
            featured: false,
            updated_at: timestamp
          })
          .in('id', ids)
        break

      default:
        return NextResponse.json(
          { success: false, updated: 0, error: 'Invalid action' },
          { status: 400 }
        )
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({
      success: true,
      updated: ids.length
    })

  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json(
      { success: false, updated: 0, error: 'Bulk action failed' },
      { status: 500 }
    )
  }
}
