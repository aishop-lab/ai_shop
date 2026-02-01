import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addDomainToVercel, verifyDomainInVercel, isVercelConfigured } from '@/lib/vercel'
import dns from 'dns'
import { promisify } from 'util'

const resolveCname = promisify(dns.resolveCname)
const resolve4 = promisify(dns.resolve4)
const resolveTxt = promisify(dns.resolveTxt)

export const dynamic = 'force-dynamic'

const DNS_TARGET = 'cname.vercel-dns.com'

/**
 * Verify TXT record for domain ownership
 */
async function verifyTxtRecord(domain: string, expectedToken: string): Promise<{
  verified: boolean
  records: string[]
  error?: string
}> {
  // For apex domain: _storeforge-verify.domain.com
  // For www subdomain: _storeforge-verify.domain.com (same)
  const baseDomain = domain.replace(/^www\./, '')
  const txtHost = `_storeforge-verify.${baseDomain}`

  try {
    const txtRecords = await resolveTxt(txtHost)
    // TXT records come as arrays of strings (for long records split across lines)
    const flatRecords = txtRecords.map(r => r.join(''))

    const verified = flatRecords.some(record =>
      record === expectedToken || record.includes(expectedToken)
    )

    return {
      verified,
      records: flatRecords,
      error: verified ? undefined : `TXT record found but doesn't match. Expected: ${expectedToken}`
    }
  } catch (error) {
    const dnsError = error as NodeJS.ErrnoException
    if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
      return {
        verified: false,
        records: [],
        error: `No TXT record found at ${txtHost}`
      }
    }
    return {
      verified: false,
      records: [],
      error: `DNS lookup failed: ${dnsError.message}`
    }
  }
}

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
      .select('id, custom_domain, custom_domain_verified, custom_domain_verification_token')
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
    const verificationToken = store.custom_domain_verification_token
    const isApexDomain = !domain.startsWith('www.')

    // Step 1: Verify TXT record for ownership (if token exists)
    let txtVerified = false
    let txtError: string | undefined

    if (verificationToken) {
      const txtResult = await verifyTxtRecord(domain, verificationToken)
      txtVerified = txtResult.verified
      txtError = txtResult.error

      if (!txtVerified) {
        return NextResponse.json({
          success: true,
          verified: false,
          step: 'txt',
          message: txtError || 'TXT record verification failed',
          expected: {
            type: 'TXT',
            name: `_storeforge-verify.${domain.replace(/^www\./, '')}`,
            value: verificationToken
          }
        })
      }
    }

    // Step 2: Verify DNS routing (CNAME or A record)
    let routingVerified = false
    let dnsRecords: string[] = []
    let routingError: string | null = null

    try {
      // Check CNAME record
      const cnameRecords = await resolveCname(domain)
      dnsRecords = cnameRecords

      // Check if CNAME points to our target
      routingVerified = cnameRecords.some(record =>
        record.toLowerCase() === DNS_TARGET.toLowerCase() ||
        record.toLowerCase().endsWith('.vercel-dns.com')
      )

      if (!routingVerified) {
        routingError = `CNAME record found but pointing to ${cnameRecords[0]} instead of ${DNS_TARGET}`
      }
    } catch {
      // CNAME lookup failed, try A record (might be using apex domain)
      try {
        const aRecords = await resolve4(domain)
        dnsRecords = aRecords

        // For apex domains, check if using Vercel's IP addresses
        const vercelIPs = ['76.76.21.21'] // Vercel's anycast IP
        routingVerified = aRecords.some(ip => vercelIPs.includes(ip))

        if (!routingVerified && aRecords.length > 0) {
          routingError = `A record found (${aRecords[0]}) but not pointing to Vercel. Use 76.76.21.21 for apex domains.`
        }
      } catch {
        routingError = 'No DNS records found. Please add CNAME or A record.'
      }
    }

    if (!routingVerified) {
      return NextResponse.json({
        success: true,
        verified: false,
        step: 'dns',
        message: routingError || 'DNS routing not configured correctly',
        records: dnsRecords,
        expected: {
          type: isApexDomain ? 'A' : 'CNAME',
          name: isApexDomain ? '@' : 'www',
          value: isApexDomain ? '76.76.21.21' : DNS_TARGET
        }
      })
    }

    // Step 3: Add domain to Vercel
    let sslStatus = 'pending'

    if (isVercelConfigured()) {
      // Add to Vercel project
      const addResult = await addDomainToVercel(domain)

      if (!addResult.success) {
        console.error('Failed to add domain to Vercel:', addResult.error)
        return NextResponse.json({
          success: true,
          verified: false,
          step: 'vercel',
          message: addResult.error || 'Failed to add domain to Vercel',
          records: dnsRecords
        })
      }

      // If domain was added, try to verify it in Vercel
      if (!addResult.verified) {
        const verifyResult = await verifyDomainInVercel(domain)
        if (verifyResult.verified) {
          sslStatus = 'issued'
        }
      } else {
        sslStatus = 'issued'
      }
    } else {
      console.warn('Vercel integration not configured - domain verified but not added to Vercel')
      sslStatus = 'pending'
    }

    // Update store as verified
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        custom_domain_verified: true,
        custom_domain_verified_at: new Date().toISOString(),
        custom_domain_ssl_status: sslStatus,
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
      records: dnsRecords,
      sslStatus
    })
  } catch (error) {
    console.error('Verify domain error:', error)
    return NextResponse.json({ error: 'Failed to verify domain' }, { status: 500 })
  }
}
