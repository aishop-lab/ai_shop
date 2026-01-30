import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// DNS target for custom domains
const DNS_TARGET = 'cname.vercel-dns.com'

const domainSchema = z.object({
  domain: z.string()
    .min(4, 'Domain must be at least 4 characters')
    .max(255, 'Domain is too long')
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
      'Invalid domain format'
    )
    .transform(d => d.toLowerCase())
})

// GET - Get current domain configuration
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('id, slug, custom_domain, custom_domain_verified, custom_domain_verified_at, custom_domain_dns_target, custom_domain_ssl_status')
      .eq('owner_id', user.id)
      .limit(1)

    if (storeError) {
      console.error('Error fetching store:', storeError)
      return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
    }

    const store = stores?.[0]
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      domain: store.custom_domain ? {
        domain: store.custom_domain,
        verified: store.custom_domain_verified,
        verifiedAt: store.custom_domain_verified_at,
        dnsTarget: store.custom_domain_dns_target || DNS_TARGET,
        sslStatus: store.custom_domain_ssl_status
      } : null,
      subdomain: `${store.slug}.storeforge.site`
    })
  } catch (error) {
    console.error('Get domain error:', error)
    return NextResponse.json({ error: 'Failed to get domain' }, { status: 500 })
  }
}

// POST - Add a custom domain
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = domainSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: validation.error.errors[0]?.message || 'Invalid domain'
      }, { status: 400 })
    }

    const domain = validation.data.domain

    // Check if domain is a reserved domain
    if (domain.endsWith('.storeforge.site')) {
      return NextResponse.json({
        error: 'Cannot use storeforge.site subdomain as custom domain'
      }, { status: 400 })
    }

    // Get user's store
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('id, custom_domain')
      .eq('owner_id', user.id)
      .limit(1)

    if (storeError) {
      console.error('Error fetching store:', storeError)
      return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
    }

    const store = stores?.[0]
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Check if domain is already in use by another store
    const { data: existingStore, error: checkError } = await supabase
      .from('stores')
      .select('id')
      .eq('custom_domain', domain)
      .neq('id', store.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking domain:', checkError)
      return NextResponse.json({ error: 'Failed to check domain availability' }, { status: 500 })
    }

    if (existingStore) {
      return NextResponse.json({
        error: 'This domain is already connected to another store'
      }, { status: 400 })
    }

    // Update store with new domain
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        custom_domain: domain,
        custom_domain_verified: false,
        custom_domain_verified_at: null,
        custom_domain_dns_target: DNS_TARGET,
        custom_domain_ssl_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Error updating store:', updateError)
      return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      domain: {
        domain,
        verified: false,
        dnsTarget: DNS_TARGET,
        sslStatus: 'pending'
      },
      instructions: {
        type: 'CNAME',
        name: domain.startsWith('www.') ? 'www' : '@',
        value: DNS_TARGET,
        message: `Add a CNAME record pointing to ${DNS_TARGET}`
      }
    })
  } catch (error) {
    console.error('Add domain error:', error)
    return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 })
  }
}

// DELETE - Remove custom domain
export async function DELETE() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)

    if (storeError) {
      console.error('Error fetching store:', storeError)
      return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
    }

    const store = stores?.[0]
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('stores')
      .update({
        custom_domain: null,
        custom_domain_verified: false,
        custom_domain_verified_at: null,
        custom_domain_dns_target: null,
        custom_domain_ssl_status: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', store.id)

    if (updateError) {
      console.error('Error removing domain:', updateError)
      return NextResponse.json({ error: 'Failed to remove domain' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove domain error:', error)
    return NextResponse.json({ error: 'Failed to remove domain' }, { status: 500 })
  }
}
