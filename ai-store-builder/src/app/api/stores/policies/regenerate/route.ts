import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

        // Call the generate policies endpoint
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const response = await fetch(`${baseUrl}/api/onboarding/generate-policies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ store_id: store.id })
        })

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to regenerate policies' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Policies regenerated' })
    } catch (error) {
        console.error('Error regenerating policies:', error)
        return NextResponse.json({ error: 'Failed to regenerate policies' }, { status: 500 })
    }
}
