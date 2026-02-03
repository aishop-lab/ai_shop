/**
 * Shipping Provider Manager
 * Handles per-store shipping provider credentials and operations
 */

import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/encryption'
import {
  ShippingProviderType,
  ShippingProviderCredentials,
  ShipmentRequest,
  ShipmentResponse,
  TrackingResponse,
  ShippingRateRequest,
  ShippingRateResponse,
  StoreShippingSettings,
  SHIPPING_PROVIDERS,
} from './types'
import { DelhiveryProvider } from './delhivery'
import { BlueDartProvider } from './bluedart'

const SHIPROCKET_API_BASE = 'https://apiv2.shiprocket.in/v1/external'

// Token cache per store
const tokenCache = new Map<string, { token: string; expiry: number }>()

/**
 * Get shipping settings for a store
 */
export async function getStoreShippingSettings(storeId: string): Promise<StoreShippingSettings | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stores')
    .select('shipping_providers, shipping_settings')
    .eq('id', storeId)
    .single()

  if (error || !data) {
    console.error('Failed to get store shipping settings:', error)
    return null
  }

  return data.shipping_providers as StoreShippingSettings || null
}

/**
 * Save shipping provider credentials for a store
 */
export async function saveShippingProvider(
  storeId: string,
  provider: ShippingProviderType,
  credentials: Record<string, string>,
  pickupLocation?: string,
  isDefault?: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current settings
  const { data: store, error: fetchError } = await supabase
    .from('stores')
    .select('shipping_providers')
    .eq('id', storeId)
    .single()

  if (fetchError) {
    return { success: false, error: 'Store not found' }
  }

  const currentSettings: StoreShippingSettings = store.shipping_providers || {
    providers: [],
    defaultProvider: null,
    autoCreateShipment: false,
    preferredCourierStrategy: 'cheapest',
    defaultPackageDimensions: { length: 20, breadth: 15, height: 10, weight: 0.5 },
  }

  // Encrypt credentials
  const encryptedCredentials = encrypt(JSON.stringify(credentials))

  // Find existing provider or add new
  const existingIndex = currentSettings.providers.findIndex(p => p.provider === provider)

  const providerConfig = {
    provider,
    isActive: true,
    isDefault: isDefault || currentSettings.providers.length === 0,
    credentials: encryptedCredentials,
    pickupLocation,
    createdAt: existingIndex >= 0 ? currentSettings.providers[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    currentSettings.providers[existingIndex] = providerConfig
  } else {
    currentSettings.providers.push(providerConfig)
  }

  // Update default provider if needed
  if (isDefault || !currentSettings.defaultProvider) {
    currentSettings.defaultProvider = provider
    // Reset other providers' isDefault
    currentSettings.providers.forEach(p => {
      p.isDefault = p.provider === provider
    })
  }

  // Save to database
  const { error: updateError } = await supabase
    .from('stores')
    .update({ shipping_providers: currentSettings })
    .eq('id', storeId)

  if (updateError) {
    console.error('Failed to save shipping provider:', updateError)
    return { success: false, error: 'Failed to save provider' }
  }

  // Clear token cache for this store+provider
  tokenCache.delete(`${storeId}:${provider}`)

  return { success: true }
}

/**
 * Remove a shipping provider from a store
 */
export async function removeShippingProvider(
  storeId: string,
  provider: ShippingProviderType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: store, error: fetchError } = await supabase
    .from('stores')
    .select('shipping_providers')
    .eq('id', storeId)
    .single()

  if (fetchError) {
    return { success: false, error: 'Store not found' }
  }

  const currentSettings: StoreShippingSettings = store.shipping_providers || {
    providers: [],
    defaultProvider: null,
    autoCreateShipment: false,
    preferredCourierStrategy: 'cheapest',
    defaultPackageDimensions: { length: 20, breadth: 15, height: 10, weight: 0.5 },
  }

  currentSettings.providers = currentSettings.providers.filter(p => p.provider !== provider)

  // Update default if removed provider was default
  if (currentSettings.defaultProvider === provider) {
    currentSettings.defaultProvider = currentSettings.providers[0]?.provider || null
    if (currentSettings.providers[0]) {
      currentSettings.providers[0].isDefault = true
    }
  }

  const { error: updateError } = await supabase
    .from('stores')
    .update({ shipping_providers: currentSettings })
    .eq('id', storeId)

  if (updateError) {
    return { success: false, error: 'Failed to remove provider' }
  }

  // Clear token cache
  tokenCache.delete(`${storeId}:${provider}`)

  return { success: true }
}

/**
 * Get decrypted credentials for a provider
 */
export function getDecryptedCredentials(encryptedCredentials: string): Record<string, string> {
  try {
    return JSON.parse(decrypt(encryptedCredentials))
  } catch (error) {
    console.error('Failed to decrypt credentials:', error)
    return {}
  }
}

/**
 * Validate provider credentials
 */
export async function validateProviderCredentials(
  provider: ShippingProviderType,
  credentials: Record<string, string>
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'shiprocket':
        return await validateShiprocketCredentials(credentials.email, credentials.password)

      case 'delhivery': {
        const delhivery = new DelhiveryProvider({
          apiToken: credentials.apiToken,
          warehouseName: credentials.warehouseName,
        })
        return await delhivery.validateCredentials()
      }

      case 'bluedart': {
        const bluedart = new BlueDartProvider({
          apiKey: credentials.apiKey,
          clientCode: credentials.clientCode,
          licenseKey: credentials.licenseKey,
          loginId: credentials.loginId,
        })
        return await bluedart.validateCredentials()
      }

      case 'self':
        return { valid: true }

      default:
        return { valid: false, error: 'Unknown provider' }
    }
  } catch (error: any) {
    return { valid: false, error: error.message || 'Validation failed' }
  }
}

/**
 * Validate Shiprocket credentials
 */
async function validateShiprocketCredentials(
  email: string,
  password: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.token) {
        return { valid: true }
      }
    }

    const errorData = await response.json().catch(() => ({}))
    return { valid: false, error: errorData.message || 'Invalid credentials' }
  } catch (error) {
    return { valid: false, error: 'Failed to validate credentials' }
  }
}

/**
 * Get Shiprocket token for a store
 */
async function getShiprocketToken(storeId: string, credentials: { email: string; password: string }): Promise<string> {
  const cacheKey = `${storeId}:shiprocket`
  const cached = tokenCache.get(cacheKey)

  if (cached && Date.now() < cached.expiry) {
    return cached.token
  }

  const response = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  })

  if (!response.ok) {
    throw new Error('Shiprocket authentication failed')
  }

  const data = await response.json()
  const token = data.token

  // Cache for 9 days (token valid for 10 days)
  tokenCache.set(cacheKey, {
    token,
    expiry: Date.now() + 9 * 24 * 60 * 60 * 1000,
  })

  return token
}

/**
 * Create shipment using store's configured provider
 */
export async function createShipmentForStore(
  storeId: string,
  request: ShipmentRequest,
  preferredProvider?: ShippingProviderType
): Promise<ShipmentResponse> {
  const settings = await getStoreShippingSettings(storeId)

  if (!settings || settings.providers.length === 0) {
    // No shipping provider configured - return for manual handling
    return {
      success: true,
      provider: 'self',
      shipmentId: request.orderId,
    }
  }

  // Determine which provider to use
  const providerType = preferredProvider || settings.defaultProvider || settings.providers[0]?.provider

  if (!providerType || providerType === 'self') {
    return {
      success: true,
      provider: 'self',
      shipmentId: request.orderId,
    }
  }

  const providerConfig = settings.providers.find(p => p.provider === providerType)

  if (!providerConfig) {
    return {
      success: false,
      provider: providerType,
      error: `Provider ${providerType} not configured`,
    }
  }

  const credentials = getDecryptedCredentials(providerConfig.credentials)

  try {
    switch (providerType) {
      case 'shiprocket':
        return await createShiprocketShipment(
          storeId,
          credentials as { email: string; password: string },
          request,
          providerConfig.pickupLocation
        )

      case 'delhivery': {
        const delhivery = new DelhiveryProvider({
          apiToken: credentials.apiToken,
          warehouseName: credentials.warehouseName,
        })
        return await delhivery.createShipment(request)
      }

      case 'bluedart': {
        const bluedart = new BlueDartProvider({
          apiKey: credentials.apiKey,
          clientCode: credentials.clientCode,
          licenseKey: credentials.licenseKey,
          loginId: credentials.loginId,
        })
        return await bluedart.createShipment(request)
      }

      default:
        return { success: false, provider: providerType, error: 'Unknown provider' }
    }
  } catch (error: any) {
    console.error(`Shipment creation failed for ${providerType}:`, error)
    return {
      success: false,
      provider: providerType,
      error: error.message || 'Failed to create shipment',
    }
  }
}

/**
 * Create Shiprocket shipment
 */
async function createShiprocketShipment(
  storeId: string,
  credentials: { email: string; password: string },
  request: ShipmentRequest,
  pickupLocation?: string
): Promise<ShipmentResponse> {
  const token = await getShiprocketToken(storeId, credentials)

  // Build Shiprocket order request
  const orderData = {
    order_id: request.orderNumber,
    order_date: new Date().toISOString().split('T')[0],
    pickup_location: pickupLocation || 'Primary',
    billing_customer_name: request.customerName,
    billing_address: request.deliveryAddress,
    billing_city: request.deliveryCity,
    billing_pincode: request.deliveryPincode,
    billing_state: request.deliveryState,
    billing_country: request.deliveryCountry || 'India',
    billing_email: request.customerEmail || '',
    billing_phone: request.customerPhone,
    shipping_is_billing: true,
    order_items: request.items.map(item => ({
      name: item.name,
      sku: item.sku,
      units: item.quantity,
      selling_price: item.price,
    })),
    payment_method: request.paymentMode === 'cod' ? 'COD' : 'Prepaid',
    sub_total: request.orderValue,
    length: request.length,
    breadth: request.breadth,
    height: request.height,
    weight: request.weight,
  }

  const response = await fetch(`${SHIPROCKET_API_BASE}/orders/create/adhoc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  })

  const data = await response.json()

  if (!response.ok || data.status_code >= 400) {
    return {
      success: false,
      provider: 'shiprocket',
      error: data.message || 'Failed to create order in Shiprocket',
    }
  }

  return {
    success: true,
    provider: 'shiprocket',
    shipmentId: data.shipment_id?.toString(),
    orderId: data.order_id?.toString(),
    awbCode: data.awb_code,
    courierName: data.courier_name,
    trackingUrl: data.awb_code ? `https://shiprocket.co/tracking/${data.awb_code}` : undefined,
  }
}

/**
 * Get shipping rates from store's configured providers
 */
export async function getShippingRatesForStore(
  storeId: string,
  request: ShippingRateRequest
): Promise<ShippingRateResponse> {
  const settings = await getStoreShippingSettings(storeId)

  if (!settings || settings.providers.length === 0) {
    // Return default flat rate
    return {
      success: true,
      rates: [
        {
          provider: 'self',
          courierCode: 'self',
          courierName: 'Standard Delivery',
          rate: 50, // Default flat rate
          estimatedDays: 5,
        },
      ],
    }
  }

  const allRates: ShippingRateResponse['rates'] = []
  const errors: string[] = []

  // Get rates from all configured providers
  for (const providerConfig of settings.providers.filter(p => p.isActive && p.provider !== 'self')) {
    try {
      const credentials = getDecryptedCredentials(providerConfig.credentials)
      let rateResponse: ShippingRateResponse

      switch (providerConfig.provider) {
        case 'shiprocket':
          rateResponse = await getShiprocketRates(
            storeId,
            credentials as { email: string; password: string },
            request
          )
          break

        case 'delhivery': {
          const delhivery = new DelhiveryProvider({
            apiToken: credentials.apiToken,
            warehouseName: credentials.warehouseName,
          })
          rateResponse = await delhivery.getRates(request)
          break
        }

        case 'bluedart': {
          const bluedart = new BlueDartProvider({
            apiKey: credentials.apiKey,
            clientCode: credentials.clientCode,
            licenseKey: credentials.licenseKey,
            loginId: credentials.loginId,
          })
          rateResponse = await bluedart.getRates(request)
          break
        }

        default:
          continue
      }

      if (rateResponse.success && rateResponse.rates.length > 0) {
        allRates.push(...rateResponse.rates)
      } else if (rateResponse.error) {
        errors.push(`${providerConfig.provider}: ${rateResponse.error}`)
      }
    } catch (error: any) {
      errors.push(`${providerConfig.provider}: ${error.message}`)
    }
  }

  if (allRates.length === 0) {
    return {
      success: false,
      rates: [],
      error: errors.join('; ') || 'No shipping rates available',
    }
  }

  // Sort by price
  allRates.sort((a, b) => a.rate - b.rate)

  return {
    success: true,
    rates: allRates,
    cheapest: allRates[0],
    fastest: [...allRates].sort((a, b) => a.estimatedDays - b.estimatedDays)[0],
  }
}

/**
 * Get Shiprocket rates
 */
async function getShiprocketRates(
  storeId: string,
  credentials: { email: string; password: string },
  request: ShippingRateRequest
): Promise<ShippingRateResponse> {
  const token = await getShiprocketToken(storeId, credentials)

  const params = new URLSearchParams({
    pickup_postcode: request.pickupPincode,
    delivery_postcode: request.deliveryPincode,
    weight: request.weight.toString(),
    cod: request.paymentMode === 'cod' ? '1' : '0',
  })

  if (request.length) params.set('length', request.length.toString())
  if (request.breadth) params.set('breadth', request.breadth.toString())
  if (request.height) params.set('height', request.height.toString())

  const response = await fetch(`${SHIPROCKET_API_BASE}/courier/serviceability?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    return { success: false, rates: [], error: 'Failed to get rates' }
  }

  const data = await response.json()
  const couriers = data.data?.available_courier_companies || []

  const rates = couriers.map((courier: any) => ({
    provider: 'shiprocket' as ShippingProviderType,
    courierCode: courier.courier_company_id?.toString(),
    courierName: courier.courier_name,
    rate: courier.rate || courier.freight_charge,
    codCharges: courier.cod_charges,
    estimatedDays: courier.estimated_delivery_days || 5,
    isRecommended: courier.is_recommended,
  }))

  return {
    success: true,
    rates,
    cheapest: rates.reduce((min: any, r: any) => (!min || r.rate < min.rate ? r : min), null),
    fastest: rates.reduce((min: any, r: any) => (!min || r.estimatedDays < min.estimatedDays ? r : min), null),
  }
}

/**
 * Track shipment using store's provider
 */
export async function trackShipmentForStore(
  storeId: string,
  awbCode: string,
  provider: ShippingProviderType
): Promise<TrackingResponse> {
  const settings = await getStoreShippingSettings(storeId)

  if (!settings) {
    return {
      success: false,
      provider,
      awbCode,
      currentStatus: 'Unknown',
      events: [],
      error: 'Store not found',
    }
  }

  const providerConfig = settings.providers.find(p => p.provider === provider)

  if (!providerConfig) {
    return {
      success: false,
      provider,
      awbCode,
      currentStatus: 'Unknown',
      events: [],
      error: `Provider ${provider} not configured`,
    }
  }

  const credentials = getDecryptedCredentials(providerConfig.credentials)

  switch (provider) {
    case 'shiprocket':
      return await trackShiprocketShipment(
        storeId,
        credentials as { email: string; password: string },
        awbCode
      )

    case 'delhivery': {
      const delhivery = new DelhiveryProvider({
        apiToken: credentials.apiToken,
        warehouseName: credentials.warehouseName,
      })
      return await delhivery.trackShipment(awbCode)
    }

    case 'bluedart': {
      const bluedart = new BlueDartProvider({
        apiKey: credentials.apiKey,
        clientCode: credentials.clientCode,
        licenseKey: credentials.licenseKey,
        loginId: credentials.loginId,
      })
      return await bluedart.trackShipment(awbCode)
    }

    default:
      return {
        success: false,
        provider,
        awbCode,
        currentStatus: 'Unknown',
        events: [],
        error: 'Unknown provider',
      }
  }
}

/**
 * Track Shiprocket shipment
 */
async function trackShiprocketShipment(
  storeId: string,
  credentials: { email: string; password: string },
  awbCode: string
): Promise<TrackingResponse> {
  const token = await getShiprocketToken(storeId, credentials)

  const response = await fetch(`${SHIPROCKET_API_BASE}/courier/track/awb/${awbCode}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    return {
      success: false,
      provider: 'shiprocket',
      awbCode,
      currentStatus: 'Unknown',
      events: [],
      error: 'Failed to track shipment',
    }
  }

  const data = await response.json()
  const trackingData = data.tracking_data

  if (!trackingData || trackingData.track_status === 0) {
    return {
      success: false,
      provider: 'shiprocket',
      awbCode,
      currentStatus: 'Unknown',
      events: [],
      error: 'Tracking not available',
    }
  }

  const shipmentTrack = trackingData.shipment_track?.[0]
  const events = (trackingData.shipment_track_activities || []).map((activity: any) => ({
    date: activity.date,
    status: activity.status,
    activity: activity.activity,
    location: activity.location || '',
  }))

  return {
    success: true,
    provider: 'shiprocket',
    awbCode,
    currentStatus: shipmentTrack?.current_status || 'In Transit',
    currentLocation: shipmentTrack?.destination,
    estimatedDelivery: shipmentTrack?.edd,
    deliveredAt: shipmentTrack?.delivered_date,
    events,
  }
}

/**
 * Auto-create shipment for an order using store's configured provider
 * This is the main entry point for automatic shipment creation
 */
export async function autoCreateShipmentForStore(
  storeId: string,
  orderId: string,
  orderData: {
    orderNumber: string
    customerName: string
    customerPhone: string
    customerEmail?: string
    deliveryAddress: string
    deliveryCity: string
    deliveryState: string
    deliveryPincode: string
    items: Array<{
      name: string
      sku: string
      quantity: number
      price: number
    }>
    orderValue: number
    paymentMode: 'prepaid' | 'cod'
    codAmount?: number
    weight?: number
    length?: number
    breadth?: number
    height?: number
  },
  options?: {
    maxRetries?: number
    preferredProvider?: ShippingProviderType
  }
): Promise<{
  success: boolean
  provider: ShippingProviderType
  awbCode?: string
  courierName?: string
  shipmentId?: string
  error?: string
  attempts?: number
}> {
  const settings = await getStoreShippingSettings(storeId)
  const maxRetries = options?.maxRetries || 3

  // Check if auto-create is enabled or if we have any provider
  if (!settings || settings.providers.length === 0) {
    // No provider configured - mark as self-delivery
    return {
      success: true,
      provider: 'self',
    }
  }

  // Check if auto-create is disabled
  if (!settings.autoCreateShipment) {
    return {
      success: true,
      provider: 'self',
    }
  }

  // Determine which provider to use
  const providerType = options?.preferredProvider || settings.defaultProvider

  if (!providerType || providerType === 'self') {
    return {
      success: true,
      provider: 'self',
    }
  }

  // Get default package dimensions
  const dimensions = settings.defaultPackageDimensions || {
    length: 20,
    breadth: 15,
    height: 10,
    weight: 0.5,
  }

  // Build shipment request
  const request: ShipmentRequest = {
    orderId,
    orderNumber: orderData.orderNumber,
    pickupLocation: settings.providers.find(p => p.provider === providerType)?.pickupLocation || 'Primary',
    pickupPincode: '', // Will be filled by provider
    customerName: orderData.customerName,
    customerPhone: orderData.customerPhone,
    customerEmail: orderData.customerEmail,
    deliveryAddress: orderData.deliveryAddress,
    deliveryCity: orderData.deliveryCity,
    deliveryState: orderData.deliveryState,
    deliveryPincode: orderData.deliveryPincode,
    deliveryCountry: 'India',
    weight: orderData.weight || dimensions.weight,
    length: orderData.length || dimensions.length,
    breadth: orderData.breadth || dimensions.breadth,
    height: orderData.height || dimensions.height,
    items: orderData.items,
    orderValue: orderData.orderValue,
    paymentMode: orderData.paymentMode,
    codAmount: orderData.codAmount,
  }

  // Retry logic
  let lastError: string | undefined
  let attempts = 0

  for (let i = 0; i < maxRetries; i++) {
    attempts++
    try {
      const result = await createShipmentForStore(storeId, request, providerType)

      if (result.success) {
        return {
          success: true,
          provider: result.provider,
          awbCode: result.awbCode,
          courierName: result.courierName,
          shipmentId: result.shipmentId,
          attempts,
        }
      }

      lastError = result.error
      console.error(`[AutoShipment] Attempt ${attempts} failed:`, result.error)

      // Wait before retry (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
      }
    } catch (error: any) {
      lastError = error.message
      console.error(`[AutoShipment] Attempt ${attempts} error:`, error)

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
      }
    }
  }

  return {
    success: false,
    provider: providerType,
    error: lastError || 'Failed to create shipment after multiple attempts',
    attempts,
  }
}

export { SHIPPING_PROVIDERS }
