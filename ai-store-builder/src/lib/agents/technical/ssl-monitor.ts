// src/lib/agents/technical/ssl-monitor.ts
// SSL Certificate monitoring for store domains

import { logger } from '@/lib/logger'

interface SSLCertificateResult {
  domain: string
  issuer: string
  validFrom: string
  validTo: string
  daysUntilExpiry: number
  isValid: boolean
  isExpiringSoon: boolean // true if expires within 30 days
  subject: string
  serialNumber: string
  checkedAt: string
  error: string | null
}

const EXPIRY_WARNING_DAYS = 30

/**
 * Check SSL certificate details for a domain using Node.js tls module.
 *
 * @param domain - The domain to check (e.g., 'mystore.storeforge.site')
 * @param port - The port to connect on (default: 443)
 * @returns SSL certificate details
 */
export async function checkSSLCertificate(
  domain: string,
  port: number = 443
): Promise<SSLCertificateResult> {
  const checkedAt = new Date().toISOString()

  logger.info('[ssl-monitor] Checking certificate', { domain, port })

  return new Promise((resolve) => {
    // Dynamic import for tls since it's a Node.js module
    import('tls').then((tls) => {
      const socket = tls.connect(
        {
          host: domain,
          port,
          servername: domain, // SNI
          rejectUnauthorized: false, // We want to inspect even invalid certs
          timeout: 10000,
        },
        () => {
          try {
            const cert = socket.getPeerCertificate()

            if (!cert || !cert.valid_from) {
              socket.destroy()
              resolve({
                domain,
                issuer: '',
                validFrom: '',
                validTo: '',
                daysUntilExpiry: 0,
                isValid: false,
                isExpiringSoon: true,
                subject: '',
                serialNumber: '',
                checkedAt,
                error: 'No certificate returned by server',
              })
              return
            }

            const validFrom = new Date(cert.valid_from).toISOString()
            const validTo = new Date(cert.valid_to).toISOString()
            const now = new Date()
            const expiryDate = new Date(cert.valid_to)
            const daysUntilExpiry = Math.floor(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )

            // Certificate is valid if: not expired, not yet valid, and authorized
            const isAuthorized = socket.authorized
            const isNotExpired = daysUntilExpiry > 0
            const isNotFuture = new Date(cert.valid_from) <= now
            const isValid = isAuthorized && isNotExpired && isNotFuture

            const issuerParts: string[] = []
            if (cert.issuer) {
              if (cert.issuer.O) issuerParts.push(cert.issuer.O)
              if (cert.issuer.CN) issuerParts.push(cert.issuer.CN)
            }

            const subjectParts: string[] = []
            if (cert.subject) {
              if (cert.subject.CN) subjectParts.push(cert.subject.CN)
              if (cert.subject.O) subjectParts.push(cert.subject.O)
            }

            socket.destroy()

            resolve({
              domain,
              issuer: issuerParts.join(' - ') || 'Unknown',
              validFrom,
              validTo,
              daysUntilExpiry,
              isValid,
              isExpiringSoon: daysUntilExpiry <= EXPIRY_WARNING_DAYS,
              subject: subjectParts.join(' - ') || domain,
              serialNumber: cert.serialNumber || '',
              checkedAt,
              error: isAuthorized ? null : String(socket.authorizationError || 'Certificate not trusted'),
            })
          } catch (err) {
            socket.destroy()
            const errMsg = err instanceof Error ? err.message : String(err)
            logger.error(`[ssl-monitor] Error reading certificate for ${domain}: ${errMsg}`)
            resolve({
              domain,
              issuer: '',
              validFrom: '',
              validTo: '',
              daysUntilExpiry: 0,
              isValid: false,
              isExpiringSoon: true,
              subject: '',
              serialNumber: '',
              checkedAt,
              error: errMsg,
            })
          }
        }
      )

      socket.on('error', (err) => {
        const errMsg = err instanceof Error ? err.message : String(err)
        logger.error(`[ssl-monitor] Connection error for ${domain}: ${errMsg}`)
        socket.destroy()
        resolve({
          domain,
          issuer: '',
          validFrom: '',
          validTo: '',
          daysUntilExpiry: 0,
          isValid: false,
          isExpiringSoon: true,
          subject: '',
          serialNumber: '',
          checkedAt,
          error: `Connection failed: ${errMsg}`,
        })
      })

      socket.on('timeout', () => {
        logger.warn('[ssl-monitor] Connection timed out', { domain })
        socket.destroy()
        resolve({
          domain,
          issuer: '',
          validFrom: '',
          validTo: '',
          daysUntilExpiry: 0,
          isValid: false,
          isExpiringSoon: true,
          subject: '',
          serialNumber: '',
          checkedAt,
          error: 'Connection timed out',
        })
      })
    })
  })
}

/**
 * Check SSL certificate for a store's storefront domain.
 *
 * @param storeId - The store ID
 * @returns SSL certificate details
 */
export async function checkStoreSSL(storeId: string): Promise<SSLCertificateResult> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const supabase = getSupabaseAdmin()

  const { data: store, error } = await supabase
    .from('stores')
    .select('slug, custom_domain')
    .eq('id', storeId)
    .single()

  if (error || !store) {
    throw new Error(`Store ${storeId} not found`)
  }

  const { getStoreHostname } = await import('@/lib/store/queries')
  const domain = getStoreHostname(store.slug, store.custom_domain)
  return checkSSLCertificate(domain)
}
