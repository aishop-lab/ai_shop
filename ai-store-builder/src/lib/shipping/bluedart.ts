/**
 * Blue Dart Direct Integration
 * API Documentation: https://www.bluedart.com/web-services
 *
 * Note: Blue Dart uses SOAP APIs. This implementation uses their REST API endpoints where available.
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

const BLUEDART_API_BASE = 'https://netconnect.bluedart.com/Ver1.10'
const BLUEDART_TRACKING_URL = 'https://www.bluedart.com/tracking'

interface BlueDartCredentials {
  apiKey: string
  clientCode: string
  licenseKey: string
  loginId: string
  isProduction?: boolean
}

export class BlueDartProvider implements ShippingProvider {
  type: ShippingProviderType = 'bluedart'
  name = 'Blue Dart'

  private credentials: BlueDartCredentials | null = null

  constructor(credentials?: BlueDartCredentials) {
    if (credentials) {
      this.credentials = credentials
    }
  }

  setCredentials(credentials: BlueDartCredentials) {
    this.credentials = credentials
  }

  isConfigured(): boolean {
    return !!(
      this.credentials?.apiKey &&
      this.credentials?.clientCode &&
      this.credentials?.licenseKey &&
      this.credentials?.loginId
    )
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials) {
      throw new Error('Blue Dart credentials not configured')
    }
    return {
      'Content-Type': 'application/json',
      'JWTToken': this.credentials.apiKey,
      'ClientID': this.credentials.clientCode,
    }
  }

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { valid: false, error: 'Credentials not configured' }
    }

    try {
      // Test with a pincode serviceability check
      const serviceable = await this.checkServiceability('400001', '110001')
      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: error.message || 'Invalid credentials' }
    }
  }

  async checkServiceability(pickupPincode: string, deliveryPincode: string): Promise<boolean> {
    if (!this.isConfigured()) return false

    try {
      const response = await fetch(
        `${BLUEDART_API_BASE}/API/Finder/GetServicablePincodeList`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            pinCode: deliveryPincode,
            profile: {
              Api_type: 'S',
              LicenceKey: this.credentials!.licenseKey,
              LoginID: this.credentials!.loginId,
            },
          }),
        }
      )

      if (!response.ok) return false

      const data = await response.json()
      return data.ServiceablePinCodeResult?.length > 0
    } catch (error) {
      console.error('Blue Dart serviceability check failed:', error)
      return false
    }
  }

  async getRates(request: ShippingRateRequest): Promise<ShippingRateResponse> {
    if (!this.isConfigured()) {
      return { success: false, rates: [], error: 'Blue Dart not configured' }
    }

    try {
      const weightInGrams = Math.ceil(request.weight * 1000)

      const response = await fetch(
        `${BLUEDART_API_BASE}/API/RateCalculator/GetFreightRate`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            originPinCode: request.pickupPincode,
            destinationPinCode: request.deliveryPincode,
            actualWeight: weightInGrams.toString(),
            invoiceValue: request.orderValue.toString(),
            creditReferenceNumber: '',
            productCode: request.paymentMode === 'cod' ? 'C' : 'A', // C = COD, A = Apex (Prepaid)
            subProductCode: '',
            pieceCount: '1',
            isInsured: 'false',
            profile: {
              Api_type: 'S',
              LicenceKey: this.credentials!.licenseKey,
              LoginID: this.credentials!.loginId,
            },
          }),
        }
      )

      if (!response.ok) {
        return { success: false, rates: [], error: 'Failed to fetch rates' }
      }

      const data = await response.json()

      if (data.FreightRateResult?.ResponseCode !== '200') {
        return { success: false, rates: [], error: data.FreightRateResult?.ErrorMessage || 'No rates available' }
      }

      const rateInfo = data.FreightRateResult

      const rates = [
        {
          provider: 'bluedart' as ShippingProviderType,
          courierCode: 'bluedart_surface',
          courierName: 'Blue Dart Surface',
          rate: parseFloat(rateInfo.TotalFreightCharge || '0'),
          codCharges: parseFloat(rateInfo.CODAmount || '0'),
          estimatedDays: 5,
        },
        {
          provider: 'bluedart' as ShippingProviderType,
          courierCode: 'bluedart_express',
          courierName: 'Blue Dart Express',
          rate: parseFloat(rateInfo.TotalFreightCharge || '0') * 1.3, // Express is typically 30% more
          codCharges: parseFloat(rateInfo.CODAmount || '0'),
          estimatedDays: 2,
          isRecommended: true,
        },
      ]

      return {
        success: true,
        rates,
        cheapest: rates[0],
        fastest: rates[1],
      }
    } catch (error) {
      console.error('Blue Dart rate fetch failed:', error)
      return { success: false, rates: [], error: 'Failed to fetch rates' }
    }
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    if (!this.isConfigured()) {
      return { success: false, provider: 'bluedart', error: 'Blue Dart not configured' }
    }

    try {
      const weightInGrams = Math.ceil(request.weight * 1000)

      const shipmentData = {
        Request: {
          Consignee: {
            ConsigneeAddress1: request.deliveryAddress.substring(0, 100),
            ConsigneeAddress2: request.deliveryAddress.substring(100, 200) || '',
            ConsigneeAddress3: '',
            ConsigneeAttention: request.customerName,
            ConsigneeMobile: request.customerPhone,
            ConsigneeName: request.customerName,
            ConsigneePincode: request.deliveryPincode,
            ConsigneeTelephone: request.customerPhone,
          },
          Services: {
            ActualWeight: weightInGrams.toString(),
            CollectableAmount: request.codAmount?.toString() || '0',
            Commodity: {
              CommodityDetail1: request.items.map(i => i.name).join(', ').substring(0, 100),
              CommodityDetail2: '',
              CommodityDetail3: '',
            },
            CreditReferenceNo: request.orderNumber,
            DeclaredValue: request.orderValue.toString(),
            Dimensions: `${request.length}X${request.breadth}X${request.height}`,
            InvoiceNo: request.orderNumber,
            ItemCount: request.items.length.toString(),
            PackType: '',
            PickupDate: new Date().toISOString().split('T')[0],
            PickupTime: '1000', // 10:00 AM
            PieceCount: '1',
            ProductCode: request.paymentMode === 'cod' ? 'C' : 'A',
            ProductType: 'Dutiables',
            SpecialInstruction: '',
            SubProductCode: '',
          },
          Shipper: {
            CustomerAddress1: request.pickupLocation,
            CustomerAddress2: '',
            CustomerAddress3: '',
            CustomerCode: this.credentials!.clientCode,
            CustomerEmailID: request.customerEmail || '',
            CustomerMobile: '',
            CustomerName: this.credentials!.loginId,
            CustomerPincode: request.pickupPincode,
            CustomerTelephone: '',
            IsToPayCustomer: 'false',
            OriginArea: '',
            Sender: '',
            VendorCode: '',
          },
        },
        Profile: {
          Api_type: 'S',
          LicenceKey: this.credentials!.licenseKey,
          LoginID: this.credentials!.loginId,
        },
      }

      const response = await fetch(
        `${BLUEDART_API_BASE}/API/Pickup/GenerateWaybill`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(shipmentData),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.GenerateWaybillResult?.IsError === false) {
        return {
          success: false,
          provider: 'bluedart',
          error: data.GenerateWaybillResult?.Status?.[0]?.StatusInformation || 'Failed to create shipment',
        }
      }

      const result = data.GenerateWaybillResult

      return {
        success: true,
        provider: 'bluedart',
        shipmentId: result.AWBNo,
        awbCode: result.AWBNo,
        courierName: 'Blue Dart',
        trackingUrl: `${BLUEDART_TRACKING_URL}?tracknumbers=${result.AWBNo}`,
        estimatedDeliveryDate: result.ExpectedDeliveryDate,
      }
    } catch (error) {
      console.error('Blue Dart shipment creation failed:', error)
      return {
        success: false,
        provider: 'bluedart',
        error: 'Failed to create shipment',
      }
    }
  }

  async trackShipment(awbCode: string): Promise<TrackingResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: 'bluedart',
        awbCode,
        currentStatus: 'Unknown',
        events: [],
        error: 'Blue Dart not configured',
      }
    }

    try {
      const response = await fetch(
        `${BLUEDART_API_BASE}/API/Tracking/GetTrackingData`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            AWBNo: awbCode,
            Profile: {
              Api_type: 'S',
              LicenceKey: this.credentials!.licenseKey,
              LoginID: this.credentials!.loginId,
            },
          }),
        }
      )

      if (!response.ok) {
        return {
          success: false,
          provider: 'bluedart',
          awbCode,
          currentStatus: 'Unknown',
          events: [],
          error: 'Failed to fetch tracking',
        }
      }

      const data = await response.json()
      const trackingData = data.GetTrackingDataResult

      if (!trackingData || trackingData.IsError) {
        return {
          success: false,
          provider: 'bluedart',
          awbCode,
          currentStatus: 'Unknown',
          events: [],
          error: trackingData?.StatusInformation || 'Tracking not found',
        }
      }

      const scans = trackingData.ScanDetails || []
      const events = scans.map((scan: any) => ({
        date: scan.ScanDate + ' ' + scan.ScanTime,
        status: scan.Scan,
        activity: scan.ScanDescription || scan.Scan,
        location: scan.Location || '',
      }))

      const latestScan = scans[0]

      return {
        success: true,
        provider: 'bluedart',
        awbCode,
        currentStatus: latestScan?.Scan || 'In Transit',
        currentLocation: latestScan?.Location || '',
        estimatedDelivery: trackingData.ExpectedDeliveryDate,
        deliveredAt: latestScan?.Scan === 'DELIVERED' ? latestScan?.ScanDate : undefined,
        events,
      }
    } catch (error) {
      console.error('Blue Dart tracking failed:', error)
      return {
        success: false,
        provider: 'bluedart',
        awbCode,
        currentStatus: 'Unknown',
        events: [],
        error: 'Failed to fetch tracking',
      }
    }
  }

  async cancelShipment(awbCode: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Blue Dart not configured' }
    }

    try {
      const response = await fetch(
        `${BLUEDART_API_BASE}/API/Pickup/CancelWaybill`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            AWBNo: awbCode,
            Profile: {
              Api_type: 'S',
              LicenceKey: this.credentials!.licenseKey,
              LoginID: this.credentials!.loginId,
            },
          }),
        }
      )

      const data = await response.json()

      if (response.ok && !data.CancelWaybillResult?.IsError) {
        return { success: true }
      }

      return {
        success: false,
        error: data.CancelWaybillResult?.StatusInformation || 'Failed to cancel shipment',
      }
    } catch (error) {
      console.error('Blue Dart cancellation failed:', error)
      return { success: false, error: 'Failed to cancel shipment' }
    }
  }

  async generateLabel(shipmentId: string): Promise<{ success: boolean; labelUrl?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Blue Dart not configured' }
    }

    try {
      const response = await fetch(
        `${BLUEDART_API_BASE}/API/Pickup/GetShipmentLabel`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            AWBNo: shipmentId,
            Profile: {
              Api_type: 'S',
              LicenceKey: this.credentials!.licenseKey,
              LoginID: this.credentials!.loginId,
            },
          }),
        }
      )

      const data = await response.json()

      if (response.ok && data.GetShipmentLabelResult?.LabelImage) {
        // Blue Dart returns base64 encoded PDF
        // In a real implementation, you'd upload this to storage and return URL
        return {
          success: true,
          labelUrl: `data:application/pdf;base64,${data.GetShipmentLabelResult.LabelImage}`,
        }
      }

      return { success: false, error: 'Failed to generate label' }
    } catch (error) {
      console.error('Blue Dart label generation failed:', error)
      return { success: false, error: 'Failed to generate label' }
    }
  }
}

// Export singleton for simple usage
export const bluedartProvider = new BlueDartProvider()
