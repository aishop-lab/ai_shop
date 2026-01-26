import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStorePolicies } from '@/lib/store/policies'

// POST - Regenerate all policies for a store
export async function POST() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's store
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_id', user.id)
            .single()

        if (storeError || !store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Generate policies directly
        const result = await generateStorePolicies(supabase, store.id)

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Failed to regenerate policies' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Policies regenerated' })
    } catch (error) {
        console.error('Error regenerating policies:', error)
        return NextResponse.json({ error: 'Failed to regenerate policies' }, { status: 500 })
    }
}
