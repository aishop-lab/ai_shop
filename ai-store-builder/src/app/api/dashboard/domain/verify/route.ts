import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import dns from 'dns'
import { promisify } from 'util'

const resolveCname = promisify(dns.resolveCname)
const resolve4 = promisify(dns.resolve4)

export const dynamic = 'force-dynamic'

const DNS_TARGET = 'cname.vercel-dns.com'

// POST - Verify DNS configuration
export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store with domain info
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('id, custom_domain, custom_domain_verified')
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

    if (!store.custom_domain) {
      return NextResponse.json({ error: 'No custom domain configured' }, { status: 400 })
    }

    // Already verified
    if (store.custom_domain_verified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Domain is already verified'
      })
    }

    const domain = store.custom_domain

    // Try to verify DNS records
    let isVerified = false
    let dnsRecords: string[] = []
    let errorMessage: string | null = null

    try {
      // Check CNAME record
      const cnameRecords = await resolveCname(domain)
      dnsRecords = cnameRecords

      // Check if CNAME points to our target
      isVerified = cnameRecords.some(record =>
        record.toLowerCase() === DNS_TARGET.toLowerCase() ||
        record.toLowerCase().endsWith('.vercel-dns.com')
      )

      if (!isVerified) {
        errorMessage = `CNAME record found but pointing to ${cnameRecords[0]} instead of ${DNS_TARGET}`
      }
    } catch (cnameError) {
      // CNAME lookup failed, try A record (might be using apex domain)
      try {
        const aRecords = await resolve4(domain)
        dnsRecords = aRecords

        // For apex domains, check if using Vercel's IP addresses
        const vercelIPs = ['76.76.21.21'] // Vercel's anycast IP
        isVerified = aRecords.some(ip => vercelIPs.includes(ip))

        if (!isVerified && aRecords.length > 0) {
          errorMessage = `A record found (${aRecords[0]}) but not pointing to Vercel. Use 76.76.21.21 for apex domains.`
        }
      } catch (aError) {
        errorMessage = 'No DNS records found. Please add CNAME or A record.'
      }
    }

    if (isVerified) {
      // Update store as verified
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          custom_domain_verified: true,
          custom_domain_verified_at: new Date().toISOString(),
          custom_domain_ssl_status: 'issued',
          updated_at: new Date().toISOString()
        })
        .eq('id', store.id)

      if (updateError) {
        console.error('Error updating verification status:', updateError)
        return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Domain verified successfully! Your custom domain is now active.',
        records: dnsRecords
      })
    }

    return NextResponse.json({
      success: true,
      verified: false,
      message: errorMessage || 'DNS records not configured correctly',
      records: dnsRecords,
      expected: {
        type: domain.startsWith('www.') ? 'CNAME' : 'CNAME or A',
        target: DNS_TARGET,
        alternativeA: '76.76.21.21'
      }
    })
  } catch (error) {
    console.error('Verify domain error:', error)
    return NextResponse.json({ error: 'Failed to verify domain' }, { status: 500 })
  }
}
