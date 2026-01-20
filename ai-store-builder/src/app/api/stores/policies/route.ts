import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch store policies
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's store
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, policies')
            .eq('owner_id', user.id)
            .single()

        if (storeError || !store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        return NextResponse.json({ policies: store.policies })
    } catch (error) {
        console.error('Error fetching policies:', error)
        return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 })
    }
}

// PATCH - Update a specific policy
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { type, content } = body

        if (!type || !['returns', 'privacy', 'terms', 'shipping'].includes(type)) {
            return NextResponse.json({ error: 'Invalid policy type' }, { status: 400 })
        }

        // Get user's store
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, policies')
            .eq('owner_id', user.id)
            .single()

        if (storeError || !store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Update the specific policy
        const updatedPolicies = {
            ...store.policies,
            [type]: {
                content,
                updated_at: new Date().toISOString()
            }
        }

        const { error: updateError } = await supabase
            .from('stores')
            .update({ policies: updatedPolicies })
            .eq('id', store.id)

        if (updateError) {
            return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Policy updated' })
    } catch (error) {
        console.error('Error updating policy:', error)
        return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 })
    }
}
