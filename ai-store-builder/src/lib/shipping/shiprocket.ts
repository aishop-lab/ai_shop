// Shiprocket API Client
// Documentation: https://apidocs.shiprocket.in/

import { format } from 'date-fns'
import { SupabaseClient } from '@supabase/supabase-js'

const SHIPROCKET_API_BASE = 'https://apiv2.shiprocket.in/v1/external'

// Types
export interface ShiprocketConfig {
  email: string
  password: string
}

export interface ShiprocketOrderItem {
  name: string
  sku: string
  units: number
  selling_price: number
  discount?: number
  tax?: number
  hsn?: string
}

export interface ShiprocketOrderRequest {
  order_id: string
  order_date: string
  pickup_location: string
  channel_id?: string
  billing_customer_name: string
  billing_last_name?: string
  billing_address: string
  billing_address_2?: string
  billing_city: string
  billing_pincode: string
  billing_state: string
  billing_country: string
  billing_email: string
  billing_phone: string
  shipping_is_billing: boolean
  shipping_customer_name?: string
  shipping_last_name?: string
  shipping_address?: string
  shipping_address_2?: string
  shipping_city?: string
  shipping_pincode?: string
  shipping_country?: string
  shipping_state?: string
  shipping_email?: string
  shipping_phone?: string
  order_items: ShiprocketOrderItem[]
  payment_method: 'Prepaid' | 'COD'
  shipping_charges?: number
  giftwrap_charges?: number
  transaction_charges?: number
  total_discount?: number
  sub_total: number
  length: number // cm
  breadth: number // cm
  height: number // cm
  weight: number // kg
}

export interface ShiprocketCourier {
  id: number
  name: string
  freight_charge: number
  cod_charges: number
  coverage_charges: number
  rate: number
  etd: string // Estimated Time of Delivery
  estimated_delivery_days: number
  min_weight: number
  rating: number
  is_surface: boolean
  is_rto_address_available: boolean
}

export interface ShiprocketShipment {
  shipment_id: number
  order_id: string
  status: string
  status_code: number
  awb_code: string
  courier_company_id: number
  courier_name: string
}

export interface ShiprocketTrackingEvent {
  date: string
  status: string
  activity: string
  location: string
}

export interface ShiprocketTrackingResponse {
  tracking_data: {
    track_status: number
    shipment_status: number
    shipment_track: Array<{
      id: number
      awb_code: string
      courier_company_id: number
      shipment_id: number
      order_id: number
      pickup_date: string
      delivered_date: string | null
      weight: string
      packages: number
      current_status: string
      delivered_to: string
      destination: string
      consignee_name: string
      origin: string
      courier_agent_details: string | null
      edd: string | null
    }>
    shipment_track_activities: ShiprocketTrackingEvent[]
    track_url: string
    etd: string
  }
}

export interface PickupRequest {
  shipment_id: number
  pickup_date: string // YYYY-MM-DD
  pickup_time?: string // HH:mm
}

export interface PickupResponse {
  pickup_status: number
  response: string
  pickup_scheduled_date: string
  pickup_token_number: string
}

// Token cache
let cachedToken: string | null = null
let tokenExpiry: number = 0

/**
 * Shiprocket API Client
 */
class ShiprocketClient {
  private email: string
  private password: string

  constructor() {
    this.email = process.env.SHIPROCKET_EMAIL || ''
    this.password = process.env.SHIPROCKET_PASSWORD || ''
  }

  /**
   * Check if Shiprocket is configured
   */
  isConfigured(): boolean {
    return !!this.email && !!this.password
  }

  /**
   * Authenticate and get token
   */
  async authenticate(): Promise<string> {
    // Check if we have a valid cached token (tokens last 10 days)
    if (cachedToken && Date.now() < tokenExpiry) {
      return cachedToken
    }

    if (!this.isConfigured()) {
      throw new Error('Shiprocket credentials not configured')
    }

    console.log('[Shiprocket] Authenticating...')

    const response = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.email,
        password: this.password
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Shiprocket] Auth failed:', error)
      throw new Error('Shiprocket authentication failed')
    }

    const data = await response.json()
    cachedToken = data.token
    // Token expires in 10 days, we'll refresh after 9 days
    tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000

    console.log('[Shiprocket] Authenticated successfully')
    return cachedToken!
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.authenticate()

    const response = await fetch(`${SHIPROCKET_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Shiprocket] API error (${endpoint}):`, errorText)
      throw new Error(`Shiprocket API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Create an order in Shiprocket
   */
  async createOrder(orderData: ShiprocketOrderRequest): Promise<{
    order_id: number
    shipment_id: number
    status: string
    status_code: number
    onboarding_completed_now: number
    awb_code: string
    courier_company_id: number
    courier_name: string
  }> {
    console.log('[Shiprocket] Creating order:', orderData.order_id)

    const response = await this.request<{
      order_id: number
      shipment_id: number
      status: string
      status_code: number
      onboarding_completed_now: number
      awb_code: string
      courier_company_id: number
      courier_name: string
    }>('/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify(orderData)
    })

    console.log('[Shiprocket] Order created:', response)
    return response
  }

  /**
   * Get available courier services for a shipment
   */
  async getServiceability(params: {
    pickup_postcode: string
    delivery_postcode: string
    weight: number
    cod: boolean
    length?: number
    breadth?: number
    height?: number
  }): Promise<ShiprocketCourier[]> {
    const queryParams = new URLSearchParams({
      pickup_postcode: params.pickup_postcode,
      delivery_postcode: params.delivery_postcode,
      weight: params.weight.toString(),
      cod: params.cod ? '1' : '0'
    })

    if (params.length) queryParams.set('length', params.length.toString())
    if (params.breadth) queryParams.set('breadth', params.breadth.toString())
    if (params.height) queryParams.set('height', params.height.toString())

    const response = await this.request<{
      data: {
        available_courier_companies: ShiprocketCourier[]
      }
    }>(`/courier/serviceability?${queryParams}`)

    return response.data.available_courier_companies || []
  }

  /**
   * Assign AWB (Air Waybill) to shipment - this generates the tracking number
   */
  async generateAWB(shipmentId: number, courierId: number): Promise<{
    awb_code: string
    courier_company_id: number
    courier_name: string
  }> {
    console.log('[Shiprocket] Generating AWB for shipment:', shipmentId)

    const response = await this.request<{
      response: {
        data: {
          awb_code: string
          courier_company_id: number
          courier_name: string
        }
      }
    }>('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: shipmentId,
        courier_id: courierId
      })
    })

    console.log('[Shiprocket] AWB generated:', response.response.data.awb_code)
    return response.response.data
  }

  /**
   * Generate shipping label
   */
  async generateLabel(shipmentIds: number[]): Promise<string> {
    const response = await this.request<{
      label_created: number
      label_url: string
      response: string
    }>('/courier/generate/label', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: shipmentIds
      })
    })

    return response.label_url
  }

  /**
   * Generate invoice/manifest
   */
  async generateManifest(shipmentIds: number[]): Promise<string> {
    const response = await this.request<{
      manifest_url: string
    }>('/manifests/generate', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: shipmentIds
      })
    })

    return response.manifest_url
  }

  /**
   * Schedule pickup
   */
  async schedulePickup(params: PickupRequest): Promise<PickupResponse> {
    console.log('[Shiprocket] Scheduling pickup for shipment:', params.shipment_id)

    const response = await this.request<{
      pickup_status: number
      response: string
      pickup_scheduled_date: string
      pickup_token_number: string
    }>('/courier/generate/pickup', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: [params.shipment_id],
        pickup_date: [params.pickup_date]
      })
    })

    console.log('[Shiprocket] Pickup scheduled:', response)
    return response
  }

  /**
   * Track shipment by AWB code
   */
  async trackByAWB(awbCode: string): Promise<ShiprocketTrackingResponse> {
    const response = await this.request<ShiprocketTrackingResponse>(
      `/courier/track/awb/${awbCode}`
    )
    return response
  }

  /**
   * Track shipment by shipment ID
   */
  async trackByShipmentId(shipmentId: number): Promise<ShiprocketTrackingResponse> {
    const response = await this.request<ShiprocketTrackingResponse>(
      `/courier/track/shipment/${shipmentId}`
    )
    return response
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(awbCodes: string[]): Promise<boolean> {
    console.log('[Shiprocket] Cancelling shipments:', awbCodes)

    const response = await this.request<{
      status: number
    }>('/orders/cancel/shipment/awbs', {
      method: 'POST',
      body: JSON.stringify({
        awbs: awbCodes
      })
    })

    return response.status === 1
  }

  /**
   * Get pickup locations
   */
  async getPickupLocations(): Promise<Array<{
    id: number
    pickup_location: string
    name: string
    email: string
    phone: string
    address: string
    address_2: string
    city: string
    state: string
    country: string
    pin_code: string
  }>> {
    const response = await this.request<{
      data: {
        shipping_address: Array<{
          id: number
          pickup_location: string
          name: string
          email: string
          phone: string
          address: string
          address_2: string
          city: string
          state: string
          country: string
          pin_code: string
        }>
      }
    }>('/settings/company/pickup')

    return response.data.shipping_address || []
  }
}

// Export singleton instance
export const shiprocket = new ShiprocketClient()

// Helper functions

/**
 * Build Shiprocket order from our order data
 */
export function buildShiprocketOrder(
  order: {
    order_number: string
    customer_name: string
    customer_email: string
    customer_phone?: string
    shipping_address: {
      name: string
      phone: string
      address_line1: string
      address_line2?: string
      city: string
      state: string
      pincode: string
      country: string
    }
    order_items: Array<{
      product_title: string
      quantity: number
      unit_price: number
    }>
    payment_method: 'razorpay' | 'cod'
    subtotal: number
    created_at: string
  },
  pickupLocation: string = 'Primary',
  packageDimensions: { length: number; breadth: number; height: number; weight: number } = {
    length: 20,
    breadth: 15,
    height: 10,
    weight: 0.5
  }
): ShiprocketOrderRequest {
  return {
    order_id: order.order_number,
    order_date: format(new Date(order.created_at), 'yyyy-MM-dd HH:mm'),
    pickup_location: pickupLocation,
    billing_customer_name: order.shipping_address.name.split(' ')[0] || order.customer_name,
    billing_last_name: order.shipping_address.name.split(' ').slice(1).join(' ') || '',
    billing_address: order.shipping_address.address_line1,
    billing_address_2: order.shipping_address.address_line2 || '',
    billing_city: order.shipping_address.city,
    billing_pincode: order.shipping_address.pincode,
    billing_state: order.shipping_address.state,
    billing_country: order.shipping_address.country || 'India',
    billing_email: order.customer_email,
    billing_phone: order.customer_phone || order.shipping_address.phone,
    shipping_is_billing: true,
    order_items: order.order_items.map((item) => ({
      name: item.product_title,
      sku: `SKU-${Date.now()}`, // Generate SKU if not available
      units: item.quantity,
      selling_price: item.unit_price
    })),
    payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
    sub_total: order.subtotal,
    length: packageDimensions.length,
    breadth: packageDimensions.breadth,
    height: packageDimensions.height,
    weight: packageDimensions.weight
  }
}

/**
 * Get cheapest courier from list
 */
export function getCheapestCourier(couriers: ShiprocketCourier[]): ShiprocketCourier | null {
  if (!couriers.length) return null
  return couriers.reduce((cheapest, courier) =>
    courier.rate < cheapest.rate ? courier : cheapest
  )
}

/**
 * Get fastest courier from list
 */
export function getFastestCourier(couriers: ShiprocketCourier[]): ShiprocketCourier | null {
  if (!couriers.length) return null
  return couriers.reduce((fastest, courier) =>
    courier.estimated_delivery_days < fastest.estimated_delivery_days ? courier : fastest
  )
}

/**
 * Map Shiprocket status to our order status
 */
export function mapShiprocketStatus(shiprocketStatus: string): string {
  const statusMap: Record<string, string> = {
    'NEW': 'processing',
    'AWB ASSIGNED': 'processing',
    'LABEL GENERATED': 'processing',
    'PICKUP SCHEDULED': 'processing',
    'PICKUP QUEUED': 'processing',
    'MANIFESTED': 'packed',
    'SHIPPED': 'shipped',
    'IN TRANSIT': 'shipped',
    'OUT FOR DELIVERY': 'out_for_delivery',
    'DELIVERED': 'delivered',
    'CANCELED': 'cancelled',
    'RTO INITIATED': 'returned',
    'RTO DELIVERED': 'returned',
    'LOST': 'cancelled',
    'DAMAGED': 'cancelled'
  }

  return statusMap[shiprocketStatus.toUpperCase()] || 'processing'
}

// Auto shipment creation types
export interface AutoShipmentResult {
  success: boolean
  shiprocket_order_id?: number
  shiprocket_shipment_id?: number
  awb_code?: string
  courier_name?: string
  label_url?: string
  estimated_delivery_date?: string
  error?: string
  attempts?: number
}

export interface AutoShipmentOptions {
  courier_preference?: 'cheapest' | 'fastest'
  max_retries?: number
  retry_delay_ms?: number
}

/**
 * Automatically create shipment for an order with retry logic
 * This is called after payment confirmation (Razorpay) or for COD orders
 */
export async function autoCreateShipment(
  supabase: SupabaseClient,
  orderId: string,
  options: AutoShipmentOptions = {}
): Promise<AutoShipmentResult> {
  const {
    courier_preference = 'cheapest',
    max_retries = 3,
    retry_delay_ms = 2000
  } = options

  let lastError: string = ''
  let attempts = 0

  // Check if Shiprocket is configured
  if (!shiprocket.isConfigured()) {
    console.log('[AutoShipment] Shiprocket not configured, skipping auto-shipment')
    return {
      success: false,
      error: 'Shiprocket not configured',
      attempts: 0
    }
  }

  // Retry loop
  for (attempts = 1; attempts <= max_retries; attempts++) {
    try {
      console.log(`[AutoShipment] Attempt ${attempts}/${max_retries} for order ${orderId}`)

      // Fetch order with items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            variant_id,
            quantity,
            unit_price,
            title,
            sku
          ),
          stores (
            id,
            name,
            settings,
            contact_email,
            contact_phone
          )
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        throw new Error(`Order not found: ${orderError?.message || 'Unknown error'}`)
      }

      // Check if shipment already exists
      if (order.shiprocket_order_id) {
        console.log(`[AutoShipment] Shipment already exists for order ${orderId}`)
        return {
          success: true,
          shiprocket_order_id: order.shiprocket_order_id,
          shiprocket_shipment_id: order.shiprocket_shipment_id,
          awb_code: order.awb_code,
          courier_name: order.courier_name,
          label_url: order.label_url,
          attempts
        }
      }

      // Get pickup location from store settings or default
      const storeSettings = order.stores?.settings || {}
      const pickupLocationName = storeSettings.shiprocket?.pickup_location || 'Primary'

      // Get pickup pincode from Shiprocket settings
      let pickupPincode = '110001' // Default Delhi pincode
      try {
        const pickupLocations = await shiprocket.getPickupLocations()
        const location = pickupLocations.find(l => l.pickup_location === pickupLocationName)
        if (location?.pin_code) {
          pickupPincode = location.pin_code
        }
      } catch (e) {
        console.warn('[AutoShipment] Could not fetch pickup locations, using default pincode')
      }

      // Get delivery pincode from shipping address
      const shippingAddress = order.shipping_address as {
        name: string
        phone: string
        address_line1: string
        address_line2?: string
        city: string
        state: string
        pincode: string
        country: string
      }
      const deliveryPincode = shippingAddress.pincode

      // Check serviceability and get couriers
      const isCOD = order.payment_method === 'cod'
      const couriers = await shiprocket.getServiceability({
        pickup_postcode: pickupPincode,
        delivery_postcode: deliveryPincode,
        weight: 0.5, // Default weight
        cod: isCOD
      })

      if (!couriers.length) {
        throw new Error(`No couriers available for delivery to ${deliveryPincode}`)
      }

      // Select courier based on preference
      const selectedCourier = courier_preference === 'fastest'
        ? getFastestCourier(couriers)
        : getCheapestCourier(couriers)

      if (!selectedCourier) {
        throw new Error('Could not select courier')
      }

      console.log(`[AutoShipment] Selected courier: ${selectedCourier.name} (${courier_preference})`)

      // Build Shiprocket order
      const shiprocketOrderData = buildShiprocketOrder(
        {
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_email: order.email,
          customer_phone: order.phone,
          shipping_address: shippingAddress,
          order_items: order.order_items.map((item: { title: string; quantity: number; unit_price: number; sku?: string }) => ({
            product_title: item.title,
            quantity: item.quantity,
            unit_price: item.unit_price
          })),
          payment_method: order.payment_method,
          subtotal: order.subtotal,
          created_at: order.created_at
        },
        pickupLocationName
      )

      // Create order in Shiprocket
      const shiprocketResponse = await shiprocket.createOrder(shiprocketOrderData)

      let awbCode = shiprocketResponse.awb_code
      let courierName = shiprocketResponse.courier_name

      // Generate AWB if not auto-assigned
      if (!awbCode && shiprocketResponse.shipment_id) {
        console.log('[AutoShipment] AWB not auto-assigned, generating manually...')
        const awbResponse = await shiprocket.generateAWB(
          shiprocketResponse.shipment_id,
          selectedCourier.id
        )
        awbCode = awbResponse.awb_code
        courierName = awbResponse.courier_name
      }

      // Generate shipping label
      let labelUrl: string | undefined
      if (shiprocketResponse.shipment_id) {
        try {
          labelUrl = await shiprocket.generateLabel([shiprocketResponse.shipment_id])
        } catch (labelError) {
          console.warn('[AutoShipment] Could not generate label:', labelError)
        }
      }

      // Calculate estimated delivery date
      const estimatedDeliveryDate = new Date()
      estimatedDeliveryDate.setDate(
        estimatedDeliveryDate.getDate() + selectedCourier.estimated_delivery_days
      )

      // Update order with Shiprocket details
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          shiprocket_order_id: shiprocketResponse.order_id,
          shiprocket_shipment_id: shiprocketResponse.shipment_id,
          awb_code: awbCode,
          tracking_number: awbCode,
          courier_name: courierName,
          label_url: labelUrl,
          estimated_delivery_date: format(estimatedDeliveryDate, 'yyyy-MM-dd'),
          shipping_provider: 'shiprocket',
          fulfillment_status: 'processing'
        })
        .eq('id', orderId)

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`)
      }

      // Log shipment creation event
      await supabase.from('shipment_events').insert({
        order_id: orderId,
        awb_code: awbCode,
        event_date: new Date().toISOString(),
        status: 'CREATED',
        activity: `Shipment created automatically via ${courierName}`,
        location: 'System'
      })

      console.log(`[AutoShipment] Successfully created shipment for order ${orderId}`)

      return {
        success: true,
        shiprocket_order_id: shiprocketResponse.order_id,
        shiprocket_shipment_id: shiprocketResponse.shipment_id,
        awb_code: awbCode,
        courier_name: courierName,
        label_url: labelUrl,
        estimated_delivery_date: format(estimatedDeliveryDate, 'yyyy-MM-dd'),
        attempts
      }

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[AutoShipment] Attempt ${attempts} failed:`, lastError)

      // Wait before retry (except on last attempt)
      if (attempts < max_retries) {
        await new Promise(resolve => setTimeout(resolve, retry_delay_ms))
      }
    }
  }

  // All retries failed - notify merchant
  console.error(`[AutoShipment] All ${max_retries} attempts failed for order ${orderId}`)

  return {
    success: false,
    error: lastError,
    attempts
  }
}

