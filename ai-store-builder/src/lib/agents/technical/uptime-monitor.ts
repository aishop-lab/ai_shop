// src/lib/agents/technical/uptime-monitor.ts
// Uptime monitoring for store storefronts

import { logger } from '@/lib/logger'

interface UptimeCheckResult {
  url: string
  status: 'up' | 'down'
  httpStatus: number | null
  responseTimeMs: number
  sslValid: boolean
  sslExpiresAt: string | null
  checkedAt: string
  error: string | null
}

/**
 * Check if a store's storefront is up and responding.
 *
 * Performs an HTTP GET request and measures response time.
 * Also inspects SSL certificate validity via the TLS connection.
 *
 * @param storeId - The store ID
 * @returns Uptime check results
 */
export async function checkStoreUptime(storeId: string): Promise<UptimeCheckResult> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const supabase = getSupabaseAdmin()

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('slug')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    throw new Error(`Store ${storeId} not found`)
  }

  const url = `https://${store.slug}.storeforge.site`
  return checkUrlUptime(url)
}

/**
 * Check if a specific URL is up and responding.
 *
 * @param url - The URL to check
 * @returns Uptime check results
 */
export async function checkUrlUptime(url: string): Promise<UptimeCheckResult> {
  const checkedAt = new Date().toISOString()
  const startTime = Date.now()

  let httpStatus: number | null = null
  let sslValid = false
  let sslExpiresAt: string | null = null
  let errorMessage: string | null = null

  logger.info('[uptime-monitor] Checking uptime', { url })

  try {
    // Use AbortController for timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'StoreForge-UptimeMonitor/1.0',
      },
    })

    clearTimeout(timeout)
    httpStatus = response.status

    // Check SSL by inspecting the certificate via the ssl-monitor module
    try {
      const { checkSSLCertificate } = await import('./ssl-monitor')
      const hostname = new URL(url).hostname
      const sslResult = await checkSSLCertificate(hostname)
      sslValid = sslResult.isValid
      sslExpiresAt = sslResult.validTo
    } catch (sslError) {
      logger.warn(`[uptime-monitor] SSL check failed for ${url}: ${sslError instanceof Error ? sslError.message : String(sslError)}`)
      sslValid = false
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    errorMessage = errMsg
    logger.error(`[uptime-monitor] Request failed for ${url}: ${errMsg}`)
  }

  const responseTimeMs = Date.now() - startTime
  const isUp = httpStatus !== null && httpStatus >= 200 && httpStatus < 500

  return {
    url,
    status: isUp ? 'up' : 'down',
    httpStatus,
    responseTimeMs,
    sslValid,
    sslExpiresAt,
    checkedAt,
    error: errorMessage,
  }
}
