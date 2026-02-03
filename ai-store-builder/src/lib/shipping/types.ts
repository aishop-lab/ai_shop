/**
 * Multi-Provider Shipping Types
 * Supports Shiprocket, Delhivery, Blue Dart, and Self-Delivery
 */

export type ShippingProviderType = 'shiprocket' | 'delhivery' | 'bluedart' | 'self'

export interface ShippingProviderCredentials {
  shiprocket?: {
    email: string
    password: string
  }
  delhivery?: {
    apiToken: string
    warehouseName: string // Client warehouse name for pickup
  }
  bluedart?: {
    apiKey: string
    clientCode: string
    licenseKey: string
    loginId: string
  }
}

export interface ShippingProviderConfig {
  provider: ShippingProviderType
  isActive: boolean
  isDefault: boolean
  credentials: string // Encrypted JSON string
  pickupLocation?: string
  createdAt: string
  updatedAt: string
}

export interface StoreShippingSettings {
  providers: ShippingProviderConfig[]
  defaultProvider: ShippingProviderType | null
  autoCreateShipment: boolean
  preferredCourierStrategy: 'cheapest' | 'fastest'
  defaultPackageDimensions: {
    length: number // cm
    breadth: number // cm
    height: number // cm
    weight: number // kg
  }
}

export interface ShipmentRequest {
  orderId: string
  orderNumber: string
  provider?: ShippingProviderType // If not specified, use store default

  // Pickup details
  pickupLocation: string
  pickupPincode: string

  // Delivery details
  customerName: string
  customerPhone: string
  customerEmail?: string
  deliveryAddress: string
  deliveryCity: string
  deliveryState: string
  deliveryPincode: string
  deliveryCountry: string

  // Package details
  weight: number // kg
  length: number // cm
  breadth: number // cm
  height: number // cm

  // Order details
  items: ShipmentItem[]
  orderValue: number
  paymentMode: 'prepaid' | 'cod'
  codAmount?: number
}

export interface ShipmentItem {
  name: string
  sku: string
  quantity: number
  price: number
  weight?: number
}

export interface ShipmentResponse {
  success: boolean
  provider: ShippingProviderType

  // Provider-specific IDs
  shipmentId?: string
  orderId?: string
  awbCode?: string

  // Tracking
  trackingUrl?: string
  courierName?: string

  // Estimated delivery
  estimatedDeliveryDate?: string

  // Labels
  labelUrl?: string
  manifestUrl?: string

  // Error info
  error?: string
  errorCode?: string
}

export interface TrackingEvent {
  date: string
  status: string
  activity: string
  location?: string
}

export interface TrackingResponse {
  success: boolean
  provider: ShippingProviderType
  awbCode: string
  currentStatus: string
  currentLocation?: string
  estimatedDelivery?: string
  deliveredAt?: string
  events: TrackingEvent[]
  error?: string
}

export interface ShippingRateRequest {
  pickupPincode: string
  deliveryPincode: string
  weight: number
  length?: number
  breadth?: number
  height?: number
  paymentMode: 'prepaid' | 'cod'
  orderValue: number
}

export interface ShippingRate {
  provider: ShippingProviderType
  courierCode: string
  courierName: string
  rate: number
  codCharges?: number
  estimatedDays: number
  isRecommended?: boolean
}

export interface ShippingRateResponse {
  success: boolean
  rates: ShippingRate[]
  cheapest?: ShippingRate
  fastest?: ShippingRate
  error?: string
}

// Provider interface that all shipping providers must implement
export interface ShippingProvider {
  type: ShippingProviderType
  name: string

  // Check if provider is configured
  isConfigured(): boolean

  // Validate credentials
  validateCredentials(): Promise<{ valid: boolean; error?: string }>

  // Check serviceability
  checkServiceability(pickupPincode: string, deliveryPincode: string): Promise<boolean>

  // Get shipping rates
  getRates(request: ShippingRateRequest): Promise<ShippingRateResponse>

  // Create shipment
  createShipment(request: ShipmentRequest): Promise<ShipmentResponse>

  // Track shipment
  trackShipment(awbCode: string): Promise<TrackingResponse>

  // Cancel shipment
  cancelShipment(awbCode: string): Promise<{ success: boolean; error?: string }>

  // Generate label
  generateLabel(shipmentId: string): Promise<{ success: boolean; labelUrl?: string; error?: string }>
}

// Provider display info for UI
export const SHIPPING_PROVIDERS: Record<ShippingProviderType, {
  name: string
  description: string
  logo?: string
  requiredFields: { key: string; label: string; type: 'text' | 'password' }[]
}> = {
  shiprocket: {
    name: 'Shiprocket',
    description: 'Shipping aggregator with 25+ courier partners. Best for beginners.',
    requiredFields: [
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
    ],
  },
  delhivery: {
    name: 'Delhivery',
    description: 'Direct integration with Delhivery. Best rates for high volume.',
    requiredFields: [
      { key: 'apiToken', label: 'API Token', type: 'password' },
      { key: 'warehouseName', label: 'Warehouse Name', type: 'text' },
    ],
  },
  bluedart: {
    name: 'Blue Dart',
    description: 'Premium courier service. Best for express deliveries.',
    requiredFields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'clientCode', label: 'Client Code', type: 'text' },
      { key: 'licenseKey', label: 'License Key', type: 'password' },
      { key: 'loginId', label: 'Login ID', type: 'text' },
    ],
  },
  self: {
    name: 'Self Delivery',
    description: 'Handle deliveries yourself. No integration needed.',
    requiredFields: [],
  },
}
