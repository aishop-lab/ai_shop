/**
 * Shippo Direct Integration
 * Multi-carrier US shipping (USPS, UPS, FedEx, DHL)
 * API Documentation: https://docs.goshippo.com/
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

const SHIPPO_API_BASE = 'https://api.goshippo.com'

interface ShippoCredentials {
  apiToken: string
}

export class ShippoProvider implements ShippingProvider {
  type: ShippingProviderType = 'shippo'
  name = 'Shippo'

  private credentials: ShippoCredentials | null = null

  constructor(credentials?: ShippoCredentials) {
    if (credentials) {
      this.credentials = credentials
    }
  }

  setCredentials(credentials: ShippoCredentials) {
    this.credentials = credentials
  }

  isConfigured(): boolean {
    return !!this.credentials?.apiToken
  }

  private getHeaders(): Record<string, string> {
    if (!this.credentials) {
      throw new Error('Shippo credentials not configured')
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `ShippoToken ${this.credentials.apiToken}`,
    }
  }

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { valid: false, error: 'Credentials not configured' }
    }

    try {
      // Test with address validation endpoint
      const response = await fetch(`${SHIPPO_API_BASE}/addresses`, {
        headers: this.getHeaders(),
      })

      if (response.ok || response.status === 200) {
        return { valid: true }
      }

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API token' }
      }

      return { valid: false, error: `API returned status ${response.status}` }
    } catch (error) {
      return { valid: false, error: 'Failed to validate credentials' }
    }
  }

  async checkServiceability(pickupPincode: string, deliveryPincode: string): Promise<boolean> {
    // Shippo supports all US zip codes
    return this.isConfigured()
  }

  async getRates(request: ShippingRateRequest): Promise<ShippingRateResponse> {
    if (!this.isConfigured()) {
      return { success: false, rates: [], error: 'Shippo not configured' }
    }

    try {
      // Create a shipment to get rates
      const shipmentData = {
        address_from: {
          zip: request.pickupPincode,
          country: 'US',
        },
        address_to: {
          zip: request.deliveryPincode,
          country: 'US',
        },
        parcels: [
          {
            length: String(request.length || 10),
            width: String(request.breadth || 10),
            height: String(request.height || 5),
            distance_unit: 'in',
            weight: String(Math.ceil(request.weight * 2.205)), // kg to lbs
            mass_unit: 'lb',
          },
        ],
        async: false,
      }

      const response = await fetch(`${SHIPPO_API_BASE}/shipments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(shipmentData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { success: false, rates: [], error: errorData.detail || 'Failed to fetch rates' }
      }

      const data = await response.json()
      const shippoRates = data.rates || []

      const rates = shippoRates
        .filter((rate: any) => rate.amount)
        .map((rate: any) => ({
          provider: 'shippo' as ShippingProviderType,
          courierCode: rate.provider || rate.servicelevel?.token || 'shippo',
          courierName: `${rate.provider || 'Carrier'} - ${rate.servicelevel?.name || 'Standard'}`,
          rate: parseFloat(rate.amount) || 0,
          estimatedDays: rate.estimated_days || rate.days || 5,
        }))
        .sort((a: any, b: any) => a.rate - b.rate)

      if (rates.length === 0) {
        return { success: false, rates: [], error: 'No shipping rates available' }
      }

      return {
        success: true,
        rates,
        cheapest: rates[0],
        fastest: [...rates].sort((a: any, b: any) => a.estimatedDays - b.estimatedDays)[0],
      }
    } catch (error) {
      console.error('Shippo rate fetch failed:', error)
      return { success: false, rates: [], error: 'Failed to fetch rates' }
    }
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    if (!this.isConfigured()) {
      return { success: false, provider: 'shippo', error: 'Shippo not configured' }
    }

    try {
      const weightInLbs = Math.ceil(request.weight * 2.205) // kg to lbs

      // Step 1: Create a shipment to get rates
      const shipmentData = {
        address_from: {
          name: 'Warehouse',
          street1: request.pickupLocation || 'Pickup Location',
          city: '',
          state: '',
          zip: request.pickupPincode,
          country: 'US',
        },
        address_to: {
          name: request.customerName,
          street1: request.deliveryAddress,
          city: request.deliveryCity,
          state: request.deliveryState,
          zip: request.deliveryPincode,
          country: request.deliveryCountry || 'US',
          phone: request.customerPhone,
          email: request.customerEmail,
        },
        parcels: [
          {
            length: String(request.length || 10),
            width: String(request.breadth || 10),
            height: String(request.height || 5),
            distance_unit: 'in',
            weight: String(weightInLbs),
            mass_unit: 'lb',
          },
        ],
        async: false,
      }

      const shipmentResponse = await fetch(`${SHIPPO_API_BASE}/shipments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(shipmentData),
      })

      if (!shipmentResponse.ok) {
        const errorData = await shipmentResponse.json().catch(() => ({}))
        return {
          success: false,
          provider: 'shippo',
          error: errorData.detail || 'Failed to create shipment',
        }
      }

      const shipment = await shipmentResponse.json()
      const rates = shipment.rates || []

      if (rates.length === 0) {
        return {
          success: false,
          provider: 'shippo',
          error: 'No shipping rates available for this route',
        }
      }

      // Pick the cheapest rate
      const cheapestRate = rates.sort((a: any, b: any) =>
        parseFloat(a.amount) - parseFloat(b.amount)
      )[0]

      // Step 2: Purchase a label (create transaction)
      const transactionResponse = await fetch(`${SHIPPO_API_BASE}/transactions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          rate: cheapestRate.object_id,
          label_file_type: 'PDF',
          async: false,
        }),
      })

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json().catch(() => ({}))
        return {
          success: false,
          provider: 'shippo',
          error: errorData.detail || 'Failed to purchase shipping label',
        }
      }

      const transaction = await transactionResponse.json()

      if (transaction.status !== 'SUCCESS') {
        return {
          success: false,
          provider: 'shippo',
          error: transaction.messages?.[0]?.text || 'Label purchase failed',
        }
      }

      return {
        success: true,
        provider: 'shippo',
        shipmentId: shipment.object_id,
        orderId: request.orderNumber,
        awbCode: transaction.tracking_number,
        courierName: `${cheapestRate.provider} ${cheapestRate.servicelevel?.name || ''}`.trim(),
        trackingUrl: transaction.tracking_url_provider,
        labelUrl: transaction.label_url,
        estimatedDeliveryDate: cheapestRate.estimated_days
          ? new Date(Date.now() + cheapestRate.estimated_days * 86400000).toISOString()
          : undefined,
      }
    } catch (error) {
      console.error('Shippo shipment creation failed:', error)
      return {
        success: false,
        provider: 'shippo',
        error: 'Failed to create shipment',
      }
    }
  }

  async trackShipment(awbCode: string): Promise<TrackingResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: 'shippo',
        awbCode,
        currentStatus: 'Unknown',
        events: [],
        error: 'Shippo not configured',
      }
    }

    try {
      // Shippo tracking requires carrier name, try common US carriers
      const carriers = ['usps', 'ups', 'fedex', 'dhl_express']
      let trackingData: any = null

      for (const carrier of carriers) {
        const response = await fetch(
          `${SHIPPO_API_BASE}/tracks/${carrier}/${awbCode}`,
          { headers: this.getHeaders() }
        )

        if (response.ok) {
          trackingData = await response.json()
          if (trackingData.tracking_status) break
        }
      }

      if (!trackingData || !trackingData.tracking_status) {
        return {
          success: false,
          provider: 'shippo',
          awbCode,
          currentStatus: 'Unknown',
          events: [],
          error: 'Tracking not available',
        }
      }

      const events = (trackingData.tracking_history || []).map((event: any) => ({
        date: event.status_date || '',
        status: event.status || '',
        activity: event.status_details || event.status || '',
        location: event.location
          ? `${event.location.city || ''}, ${event.location.state || ''}`
          : '',
      }))

      const currentStatus = trackingData.tracking_status
      const isDelivered = currentStatus?.status === 'DELIVERED'

      return {
        success: true,
        provider: 'shippo',
        awbCode,
        currentStatus: currentStatus?.status_details || currentStatus?.status || 'In Transit',
        currentLocation: currentStatus?.location
          ? `${currentStatus.location.city || ''}, ${currentStatus.location.state || ''}`
          : undefined,
        estimatedDelivery: trackingData.eta || undefined,
        deliveredAt: isDelivered ? currentStatus?.status_date : undefined,
        events,
      }
    } catch (error) {
      console.error('Shippo tracking failed:', error)
      return {
        success: false,
        provider: 'shippo',
        awbCode,
        currentStatus: 'Unknown',
        events: [],
        error: 'Failed to fetch tracking',
      }
    }
  }

  async cancelShipment(awbCode: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Shippo not configured' }
    }

    try {
      // Shippo refunds are done via the transaction's object_id, not the AWB
      // In practice you'd store the transaction_id; here we attempt a refund by tracking number
      const response = await fetch(`${SHIPPO_API_BASE}/refunds`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ transaction: awbCode }),
      })

      if (response.ok) {
        return { success: true }
      }

      const data = await response.json().catch(() => ({}))
      return { success: false, error: data.detail || 'Failed to cancel shipment' }
    } catch (error) {
      console.error('Shippo cancellation failed:', error)
      return { success: false, error: 'Failed to cancel shipment' }
    }
  }

  async generateLabel(shipmentId: string): Promise<{ success: boolean; labelUrl?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Shippo not configured' }
    }

    try {
      // Retrieve transaction by ID to get the label URL
      const response = await fetch(
        `${SHIPPO_API_BASE}/transactions/${shipmentId}`,
        { headers: this.getHeaders() }
      )

      if (!response.ok) {
        return { success: false, error: 'Failed to retrieve label' }
      }

      const data = await response.json()

      if (data.label_url) {
        return { success: true, labelUrl: data.label_url }
      }

      return { success: false, error: 'Label not available' }
    } catch (error) {
      console.error('Shippo label generation failed:', error)
      return { success: false, error: 'Failed to generate label' }
    }
  }
}

// Export singleton for simple usage
export const shippoProvider = new ShippoProvider()
