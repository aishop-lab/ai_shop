// Order Types for Checkout & Payment System

export interface Order {
  id: string
  order_number: string
  store_id: string

  // Customer
  customer_name: string
  customer_email: string
  customer_phone?: string

  // Address
  shipping_address: ShippingAddress

  // Pricing
  subtotal: number
  shipping_cost: number
  tax_amount: number
  discount_amount: number
  total_amount: number

  // Payment
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  razorpay_order_id?: string
  razorpay_payment_id?: string
  payment_error?: string

  // Status
  order_status: OrderStatus

  // Tracking
  tracking_number?: string
  courier_name?: string

  // Shiprocket integration
  shiprocket_order_id?: number
  shiprocket_shipment_id?: number
  awb_code?: string
  label_url?: string
  manifest_url?: string
  pickup_scheduled_date?: string
  pickup_token?: string
  estimated_delivery_date?: string
  shipping_provider?: 'manual' | 'shiprocket'

  // Timestamps
  created_at: string
  paid_at?: string
  shipped_at?: string
  delivered_at?: string
  cancelled_at?: string

  // Relations
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id?: string                           // Variant ID if applicable
  variant_attributes?: Record<string, string>   // {"Size": "S", "Color": "Red"}
  variant_sku?: string                          // Variant SKU
  product_title: string
  product_image?: string
  quantity: number
  unit_price: number
  total_price: number
  created_at?: string
}

export interface ShippingAddress {
  name: string
  phone: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  pincode: string
  country: string
}

export type PaymentMethod = 'razorpay' | 'cod'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface CreateOrderRequest {
  store_id: string
  items: Array<{
    product_id: string
    variant_id?: string             // Optional variant ID
    quantity: number
  }>
  shipping_address: ShippingAddress
  customer_details: {
    name: string
    email: string
    phone: string
  }
  payment_method: PaymentMethod
}

export interface CreateOrderResponse {
  success: boolean
  order?: {
    id: string
    order_number: string
    total_amount: number
    razorpay_order_id?: string
    razorpay_key_id?: string
  }
  error?: string
  details?: string[]
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  order_id: string
}

export interface VerifyPaymentResponse {
  success: boolean
  message?: string
  error?: string
}

export interface Refund {
  id: string
  order_id: string
  razorpay_refund_id?: string
  amount: number
  reason?: string
  status: 'pending' | 'processed' | 'failed'
  created_at: string
  processed_at?: string
}

export interface InventoryReservation {
  id: string
  order_id: string
  product_id: string
  variant_id?: string           // Variant ID if applicable
  quantity: number
  created_at: string
  expires_at: string
}

// Razorpay specific types
export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  offer_id?: string
  status: 'created' | 'attempted' | 'paid'
  attempts: number
  notes: Record<string, string>
  created_at: number
}

export interface RazorpayPayment {
  id: string
  entity: string
  amount: number
  currency: string
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
  order_id: string
  invoice_id?: string
  international: boolean
  method: string
  amount_refunded: number
  refund_status?: string
  captured: boolean
  description?: string
  card_id?: string
  bank?: string
  wallet?: string
  vpa?: string
  email: string
  contact: string
  customer_id?: string
  notes: Record<string, string>
  fee: number
  tax: number
  error_code?: string
  error_description?: string
  error_source?: string
  error_step?: string
  error_reason?: string
  acquirer_data?: {
    bank_transaction_id?: string
    authentication_reference_number?: string
  }
  created_at: number
}

export interface RazorpayRefund {
  id: string
  entity: string
  amount: number
  receipt?: string
  currency: string
  payment_id: string
  notes: Record<string, string>
  status: 'pending' | 'processed' | 'failed'
  speed_processed: 'normal' | 'optimum'
  speed_requested: 'normal' | 'optimum'
  created_at: number
}

export interface RazorpayWebhookEvent {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    payment?: {
      entity: RazorpayPayment
    }
    refund?: {
      entity: RazorpayRefund
    }
    order?: {
      entity: RazorpayOrder
    }
  }
  created_at: number
}
