/**
 * Shipping Zones Utility
 * Handles zone matching and rate calculation based on shipping zones configuration
 */

import type { ShippingZone, ShippingConfig, StoreSettings } from '@/lib/types/store'

// State name to code mapping for zone matching
const STATE_NAME_TO_CODE: Record<string, string> = {
  'andaman and nicobar islands': 'AN',
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  'assam': 'AS',
  'bihar': 'BR',
  'chhattisgarh': 'CG',
  'chandigarh': 'CH',
  'dadra and nagar haveli': 'DD',
  'daman and diu': 'DD',
  'delhi': 'DL',
  'new delhi': 'DL',
  'goa': 'GA',
  'gujarat': 'GJ',
  'himachal pradesh': 'HP',
  'haryana': 'HR',
  'jharkhand': 'JH',
  'jammu and kashmir': 'JK',
  'karnataka': 'KA',
  'kerala': 'KL',
  'ladakh': 'LA',
  'lakshadweep': 'LD',
  'maharashtra': 'MH',
  'meghalaya': 'ML',
  'manipur': 'MN',
  'madhya pradesh': 'MP',
  'mizoram': 'MZ',
  'nagaland': 'NL',
  'odisha': 'OR',
  'orissa': 'OR',
  'punjab': 'PB',
  'puducherry': 'PY',
  'pondicherry': 'PY',
  'rajasthan': 'RJ',
  'sikkim': 'SK',
  'tamil nadu': 'TN',
  'telangana': 'TS',
  'tripura': 'TR',
  'uttarakhand': 'UK',
  'uttar pradesh': 'UP',
  'west bengal': 'WB',
}

/**
 * Normalize state name to state code
 */
export function getStateCode(stateName: string): string | null {
  const normalized = stateName.toLowerCase().trim()

  // Check if it's already a code (2 letters)
  if (normalized.length === 2) {
    return normalized.toUpperCase()
  }

  return STATE_NAME_TO_CODE[normalized] || null
}

/**
 * Check if a pincode matches a zone's pincode patterns
 * Supports exact pincodes and prefix patterns (e.g., "110" matches 110001-110099)
 */
export function matchesPincode(pincode: string, patterns: string[]): boolean {
  if (!pincode || !patterns.length) return false

  const cleanPincode = pincode.trim()

  for (const pattern of patterns) {
    const cleanPattern = pattern.trim()

    // Exact match
    if (cleanPincode === cleanPattern) {
      return true
    }

    // Range match (e.g., "110001-110099")
    if (cleanPattern.includes('-')) {
      const [start, end] = cleanPattern.split('-').map(p => parseInt(p.trim(), 10))
      const pincodeNum = parseInt(cleanPincode, 10)
      if (pincodeNum >= start && pincodeNum <= end) {
        return true
      }
    }

    // Prefix match (e.g., "110" matches all pincodes starting with 110)
    if (cleanPincode.startsWith(cleanPattern)) {
      return true
    }
  }

  return false
}

/**
 * Find the matching shipping zone for a given address
 */
export function findMatchingZone(
  state: string,
  pincode: string,
  zones: ShippingZone[]
): ShippingZone | null {
  if (!zones || zones.length === 0) return null

  const stateCode = getStateCode(state)
  let defaultZone: ShippingZone | null = null

  for (const zone of zones) {
    // Check for default zone
    if (zone.is_default || zone.type === 'default') {
      defaultZone = zone
      continue
    }

    // Pincode-based zone (highest priority)
    if (zone.type === 'pincodes' && zone.pincodes?.length) {
      if (matchesPincode(pincode, zone.pincodes)) {
        return zone
      }
    }

    // State-based zone
    if (zone.type === 'states' && zone.states?.length && stateCode) {
      if (zone.states.includes(stateCode)) {
        return zone
      }
    }
  }

  // Return default zone if no match found
  return defaultZone
}

/**
 * Calculate shipping cost based on zones configuration
 */
export interface ShippingCalculation {
  zone: ShippingZone | null
  zoneName: string
  baseRate: number
  weightCharge: number
  codFee: number
  totalShipping: number
  isFreeShipping: boolean
  estimatedDays: number | null
  codAvailable: boolean
}

export function calculateZoneShipping(
  state: string,
  pincode: string,
  settings: StoreSettings,
  options: {
    subtotal: number
    paymentMethod?: 'razorpay' | 'cod'
    totalWeight?: number  // in kg
  }
): ShippingCalculation {
  const { subtotal, paymentMethod, totalWeight = 0 } = options
  const shippingSettings = settings.shipping
  const config = shippingSettings.config

  // If zones not enabled, use simple flat rate
  if (!config?.use_zones || !config.zones?.length) {
    const isFreeShipping = subtotal >= shippingSettings.free_shipping_threshold
    const baseRate = isFreeShipping ? 0 : shippingSettings.flat_rate_national
    const codFee = paymentMethod === 'cod' && shippingSettings.cod_enabled
      ? (shippingSettings.cod_fee || 0)
      : 0

    return {
      zone: null,
      zoneName: 'Standard',
      baseRate,
      weightCharge: 0,
      codFee,
      totalShipping: baseRate + codFee,
      isFreeShipping,
      estimatedDays: null,
      codAvailable: shippingSettings.cod_enabled,
    }
  }

  // Find matching zone
  const zone = findMatchingZone(state, pincode, config.zones)

  if (!zone) {
    // No matching zone and no default - use global settings
    const isFreeShipping = subtotal >= shippingSettings.free_shipping_threshold
    const baseRate = isFreeShipping ? 0 : shippingSettings.flat_rate_national
    const codFee = paymentMethod === 'cod' && shippingSettings.cod_enabled
      ? (shippingSettings.cod_fee || 0)
      : 0

    return {
      zone: null,
      zoneName: 'Unserviceable',
      baseRate,
      weightCharge: 0,
      codFee,
      totalShipping: baseRate + codFee,
      isFreeShipping,
      estimatedDays: null,
      codAvailable: shippingSettings.cod_enabled,
    }
  }

  // Calculate shipping for matched zone
  const freeThreshold = zone.free_shipping_threshold ?? shippingSettings.free_shipping_threshold
  const isFreeShipping = subtotal >= freeThreshold
  const baseRate = isFreeShipping ? 0 : zone.flat_rate

  // Calculate weight-based charges
  let weightCharge = 0
  if (!isFreeShipping && config.weight_based?.enabled && totalWeight > 0) {
    const baseWeight = config.weight_based.base_weight
    const extraWeight = Math.max(0, totalWeight - baseWeight)
    weightCharge = Math.ceil(extraWeight) * config.weight_based.per_kg_rate
  }

  // COD fee
  const zoneCodAvailable = zone.cod_available ?? shippingSettings.cod_enabled
  const codFee = paymentMethod === 'cod' && zoneCodAvailable
    ? (zone.cod_fee ?? shippingSettings.cod_fee ?? 0)
    : 0

  return {
    zone,
    zoneName: zone.name,
    baseRate,
    weightCharge,
    codFee,
    totalShipping: baseRate + weightCharge + codFee,
    isFreeShipping,
    estimatedDays: zone.estimated_days ?? null,
    codAvailable: zoneCodAvailable,
  }
}

/**
 * Check if shipping is available to a location
 */
export function isShippingAvailable(
  state: string,
  pincode: string,
  config: ShippingConfig | undefined
): { available: boolean; reason?: string } {
  if (!config?.use_zones || !config.zones?.length) {
    // Simple mode - assume all India delivery
    return { available: true }
  }

  const zone = findMatchingZone(state, pincode, config.zones)

  if (!zone) {
    return {
      available: false,
      reason: 'Delivery is not available to this location'
    }
  }

  return { available: true }
}

/**
 * Get all zones for display/configuration
 */
export function getZoneSummary(zones: ShippingZone[]): Array<{
  id: string
  name: string
  coverage: string
  rate: number
  estimatedDays: number | null
}> {
  return zones.map(zone => {
    let coverage = 'Default'

    if (zone.type === 'states' && zone.states?.length) {
      coverage = `${zone.states.length} states`
    } else if (zone.type === 'pincodes' && zone.pincodes?.length) {
      coverage = `${zone.pincodes.length} pincode(s)`
    } else if (zone.is_default) {
      coverage = 'Rest of India'
    }

    return {
      id: zone.id,
      name: zone.name,
      coverage,
      rate: zone.flat_rate,
      estimatedDays: zone.estimated_days ?? null,
    }
  })
}

/**
 * Validate zone configuration
 */
export function validateZoneConfig(zones: ShippingZone[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!zones.length) {
    return { valid: true, errors: [] }
  }

  // Check for duplicate zone IDs
  const ids = zones.map(z => z.id)
  const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (duplicateIds.length) {
    errors.push(`Duplicate zone IDs: ${duplicateIds.join(', ')}`)
  }

  // Check for overlapping state coverage
  const stateToZone: Record<string, string[]> = {}
  for (const zone of zones) {
    if (zone.type === 'states' && zone.states) {
      for (const state of zone.states) {
        if (!stateToZone[state]) stateToZone[state] = []
        stateToZone[state].push(zone.name)
      }
    }
  }
  for (const [state, zoneNames] of Object.entries(stateToZone)) {
    if (zoneNames.length > 1) {
      errors.push(`State ${state} is in multiple zones: ${zoneNames.join(', ')}`)
    }
  }

  // Check that at least one default zone exists
  const hasDefault = zones.some(z => z.is_default || z.type === 'default')
  if (!hasDefault) {
    errors.push('No default zone configured. Orders from unmatched areas may fail.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
