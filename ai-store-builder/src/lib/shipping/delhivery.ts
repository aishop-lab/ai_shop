/**
 * Delhivery Direct Integration
 * API Documentation: https://developers.delhivery.com/
 */

import {
  ShippingProvider,
  ShippingProviderType,
  ShipmentRequest,
  ShipmentResponse,
  TrackingResponse,
  ShippingRateRequest,
  ShippingRateResponse,
} from './types'

const DELHIVERY_API_BASE = 'https://track.delhivery.com/api'
const DELHIVERY_STAGING_API_BASE = 'https://staging-express.delhivery.com/api'

interface DelhiveryCredentials {
  apiToken: string
  warehouseName: string
  useStagingApi?: boolean
}

export class DelhiveryProvider implements ShippingProvider {
  type: ShippingProviderType = 'delhivery'
  name = 'Delhivery'

  private credentials: DelhiveryCredentials | null = null
  private apiBase: string

  constructor(credentials?: DelhiveryCredentials) {
    if (credentials) {
      this.credentials = credentials
      this.apiBase = credentials.useStagingApi ? DELHIVERY_STAGING_API_BASE : DELHIVERY_API_BASE
    } else {
      this.apiBase = DELHIVERY_API_BASE
    }
  }

  setCredentials(credentials: DelhiveryCredentials) {
    this.credentials = credentials
    this.apiBase = credentials.useStagingApi ? DELHIVERY_STAGING_API_BASE : DELHIVERY_API_BASE
  }

  isConfigured(): boolean {
    return !!(this.credentials?.apiToken && this.credentials?.warehouseName)
  }

  private getHeaders(): Record<string, string> {
    if (!this.credentials) {
      throw new Error('Delhivery credentials not configured')
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.credentials.apiToken}`,
    }
  }

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { valid: false, error: 'Credentials not configured' }
    }

    try {
      // Test with a pincode serviceability check
      const response = await fetch(
        `${this.apiBase}/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=110001&o_pin=400001&cgm=1000&pt=Pre-paid&cod=0`,
        { headers: this.getHeaders() }
      )

      if (response.ok) {
        return { valid: true }
      }

      const data = await response.json()
      return { valid: false, error: data.message || 'Invalid credentials' }
    } catch (error) {
      return { valid: false, error: 'Failed to validate credentials' }
    }
  }

  async checkServiceability(pickupPincode: string, deliveryPincode: string): Promise<boolean> {
    if (!this.isConfigured()) return false

    try {
      const response = await fetch(
        `${this.apiBase}/c/api/pin-codes/json/?filter_codes=${deliveryPincode}`,
        { headers: this.getHeaders() }
      )

      if (!response.ok) return false

      const data = await response.json()
      return data.delivery_codes?.length > 0
    } catch (error) {
      console.error('Delhivery serviceability check failed:', error)
      return false
    }
  }

  async getRates(request: ShippingRateRequest): Promise<ShippingRateResponse> {
    if (!this.isConfigured()) {
      return { success: false, rates: [], error: 'Delhivery not configured' }
    }

    try {
      const weightInGrams = Math.ceil(request.weight * 1000)
      const paymentType = request.paymentMode === 'cod' ? 'COD' : 'Pre-paid'
      const codAmount = request.paymentMode === 'cod' ? request.orderValue : 0

      const response = await fetch(
        `${this.apiBase}/kinko/v1/invoice/charges/.json?` +
        `md=E&ss=Delivered&d_pin=${request.deliveryPincode}&o_pin=${request.pickupPincode}` +
        `&cgm=${weightInGrams}&pt=${paymentType}&cod=${codAmount}`,
        { headers: this.getHeaders() }
      )

      if (!response.ok) {
        return { success: false, rates: [], error: 'Failed to fetch rates' }
      }

      const data = await response.json()

      if (!data || data.length === 0) {
        return { success: false, rates: [], error: 'No rates available' }
      }

      const rates = data.map((rate: any) => ({
        provider: 'delhivery' as ShippingProviderType,
        courierCode: 'delhivery',
        courierName: 'Delhivery',
        rate: rate.total_amount || 0,
        codCharges: rate.cod_charges || 0,
        estimatedDays: rate.estimated_delivery_days || 5,
      }))

      return {
        success: true,
        rates,
        cheapest: rates[0],
        fastest: rates[0],
      }
    } catch (error) {
      console.error('Delhivery rate fetch failed:', error)
      return { success: false, rates: [], error: 'Failed to fetch rates' }
    }
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    if (!this.isConfigured()) {
      return { success: false, provider: 'delhivery', error: 'Delhivery not configured' }
    }

    try {
      const weightInGrams = Math.ceil(request.weight * 1000)
      const paymentMode = request.paymentMode === 'cod' ? 'COD' : 'Prepaid'

      // Build shipment data in Delhivery format
      const shipmentData = {
        shipments: [
          {
            name: request.customerName,
            add: request.deliveryAddress,
            pin: request.deliveryPincode,
            city: request.deliveryCity,
            state: request.deliveryState,
            country: request.deliveryCountry || 'India',
            phone: request.customerPhone,
            order: request.orderNumber,
            payment_mode: paymentMode,
            return_pin: request.pickupPincode,
            return_city: '', // Will use pickup location city
            return_phone: '', // Will use store phone
            return_add: '', // Will use pickup location address
            return_state: '',
            return_country: 'India',
            products_desc: request.items.map(i => i.name).join(', '),
            hsn_code: '',
            cod_amount: request.codAmount || 0,
            order_date: new Date().toISOString(),
            total_amount: request.orderValue,
            seller_add: '',
            seller_name: '',
            seller_inv: '',
            quantity: request.items.reduce((sum, i) => sum + i.quantity, 0),
            waybill: '', // Auto-generated
            shipment_width: request.breadth,
            shipment_height: request.height,
            weight: weightInGrams,
            seller_gst_tin: '',
            shipping_mode: 'Surface',
            address_type: 'home',
          },
        ],
        pickup_location: {
          name: this.credentials!.warehouseName,
        },
      }

      const formData = new URLSearchParams()
      formData.append('format', 'json')
      formData.append('data', JSON.stringify(shipmentData))

      const response = await fetch(`${this.apiBase}/cmu/create.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.credentials!.apiToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          provider: 'delhivery',
          error: data.rmk || data.message || 'Failed to create shipment',
        }
      }

      const packageInfo = data.packages?.[0]

      return {
        success: true,
        provider: 'delhivery',
        shipmentId: packageInfo?.refnum || request.orderNumber,
        awbCode: packageInfo?.waybill,
        courierName: 'Delhivery',
        trackingUrl: packageInfo?.waybill
          ? `https://www.delhivery.com/track/package/${packageInfo.waybill}`
          : undefined,
      }
    } catch (error) {
      console.error('Delhivery shipment creation failed:', error)
      return {
        success: false,
        provider: 'delhivery',
        error: 'Failed to create shipment',
      }
    }
  }

  async trackShipment(awbCode: string): Promise<TrackingResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: 'delhivery',
        awbCode,
        currentStatus: 'Unknown',
        events: [],
        error: 'Delhivery not configured',
      }
    }

    try {
      const response = await fetch(
        `${this.apiBase}/v1/packages/json/?waybill=${awbCode}`,
        { headers: this.getHeaders() }
      )

      if (!response.ok) {
        return {
          success: false,
          provider: 'delhivery',
          awbCode,
          currentStatus: 'Unknown',
          events: [],
          error: 'Failed to fetch tracking',
        }
      }

      const data = await response.json()
      const shipment = data.ShipmentData?.[0]?.Shipment

      if (!shipment) {
        return {
          success: false,
          provider: 'delhivery',
          awbCode,
          currentStatus: 'Unknown',
          events: [],
          error: 'Shipment not found',
        }
      }

      const events = (shipment.Scans || []).map((scan: any) => ({
        date: scan.ScanDetail?.ScanDateTime || '',
        status: scan.ScanDetail?.Scan || '',
        activity: scan.ScanDetail?.Instructions || scan.ScanDetail?.Scan || '',
        location: scan.ScanDetail?.ScannedLocation || '',
      }))

      return {
        success: true,
        provider: 'delhivery',
        awbCode,
        currentStatus: shipment.Status?.Status || 'In Transit',
        currentLocation: shipment.Status?.StatusLocation || '',
        estimatedDelivery: shipment.ExpectedDeliveryDate || undefined,
        deliveredAt: shipment.Status?.Status === 'Delivered'
          ? shipment.Status?.StatusDateTime
          : undefined,
        events,
      }
    } catch (error) {
      console.error('Delhivery tracking failed:', error)
      return {
        success: false,
        provider: 'delhivery',
        awbCode,
        currentStatus: 'Unknown',
        events: [],
        error: 'Failed to fetch tracking',
      }
    }
  }

  async cancelShipment(awbCode: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Delhivery not configured' }
    }

    try {
      const formData = new URLSearchParams()
      formData.append('waybill', awbCode)
      formData.append('cancellation', 'true')

      const response = await fetch(`${this.apiBase}/p/edit`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.credentials!.apiToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const data = await response.json()

      if (response.ok && data.status) {
        return { success: true }
      }

      return { success: false, error: data.error || 'Failed to cancel shipment' }
    } catch (error) {
      console.error('Delhivery cancellation failed:', error)
      return { success: false, error: 'Failed to cancel shipment' }
    }
  }

  async generateLabel(shipmentId: string): Promise<{ success: boolean; labelUrl?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Delhivery not configured' }
    }

    try {
      const response = await fetch(
        `${this.apiBase}/p/packing_slip?wbns=${shipmentId}&pdf=true`,
        { headers: this.getHeaders() }
      )

      if (response.ok) {
        // Delhivery returns PDF directly
        const blob = await response.blob()
        // In a real implementation, you'd upload this to storage and return URL
        // For now, we'll return the API URL
        return {
          success: true,
          labelUrl: `${this.apiBase}/p/packing_slip?wbns=${shipmentId}&pdf=true`,
        }
      }

      return { success: false, error: 'Failed to generate label' }
    } catch (error) {
      console.error('Delhivery label generation failed:', error)
      return { success: false, error: 'Failed to generate label' }
    }
  }
}

// Export singleton for simple usage
export const delhiveryProvider = new DelhiveryProvider()
