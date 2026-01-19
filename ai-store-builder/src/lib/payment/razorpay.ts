import Razorpay from 'razorpay'
import crypto from 'crypto'
import type { RazorpayOrder, RazorpayPayment, RazorpayRefund } from '@/lib/types/order'

// Lazy initialization of Razorpay instance to avoid build-time errors
let razorpayInstance: Razorpay | null = null

function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay API keys not configured')
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return razorpayInstance
}

/**
 * Create Razorpay order
 * @param amount - Amount in INR (not paise)
 * @param currency - Currency code (default: INR)
 * @param receipt - Unique receipt ID (order number)
 * @param notes - Optional metadata
 */
export async function createRazorpayOrder(
  amount: number,
  currency: string = 'INR',
  receipt: string,
  notes?: Record<string, string>
): Promise<RazorpayOrder> {
  try {
    const razorpay = getRazorpayInstance()
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt,
      notes,
      payment_capture: true, // Auto-capture payment
    })

    return order as RazorpayOrder
  } catch (error) {
    console.error('Razorpay order creation failed:', error)
    throw new Error('Failed to create payment order')
  }
}

/**
 * Verify Razorpay payment signature
 * Used after successful payment on frontend
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay key secret not configured')
  }

  const body = orderId + '|' + paymentId
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

/**
 * Verify webhook signature
 * Used to validate incoming webhook requests from Razorpay
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

/**
 * Get payment details from Razorpay
 */
export async function getPaymentDetails(
  paymentId: string
): Promise<RazorpayPayment> {
  try {
    const razorpay = getRazorpayInstance()
    const payment = await razorpay.payments.fetch(paymentId)
    return payment as RazorpayPayment
  } catch (error) {
    console.error('Failed to fetch payment:', error)
    throw error
  }
}

/**
 * Refund payment
 * @param paymentId - Razorpay payment ID
 * @param amount - Optional amount for partial refund (in INR)
 * @param notes - Optional notes
 */
export async function refundPayment(
  paymentId: string,
  amount?: number,
  notes?: Record<string, string>
): Promise<RazorpayRefund> {
  try {
    const razorpay = getRazorpayInstance()
    const refundData: { amount?: number; notes?: Record<string, string> } = {}

    if (amount) {
      refundData.amount = Math.round(amount * 100) // Convert to paise
    }

    if (notes) {
      refundData.notes = notes
    }

    const refund = await razorpay.payments.refund(paymentId, refundData)
    return refund as RazorpayRefund
  } catch (error) {
    console.error('Refund failed:', error)
    throw error
  }
}

/**
 * Get order details from Razorpay
 */
export async function getRazorpayOrderDetails(
  orderId: string
): Promise<RazorpayOrder> {
  try {
    const razorpay = getRazorpayInstance()
    const order = await razorpay.orders.fetch(orderId)
    return order as RazorpayOrder
  } catch (error) {
    console.error('Failed to fetch order:', error)
    throw error
  }
}

/**
 * Get all payments for an order
 */
export async function getOrderPayments(
  orderId: string
): Promise<RazorpayPayment[]> {
  try {
    const razorpay = getRazorpayInstance()
    const payments = await razorpay.orders.fetchPayments(orderId)
    return (payments as { items: RazorpayPayment[] }).items || []
  } catch (error) {
    console.error('Failed to fetch order payments:', error)
    throw error
  }
}

/**
 * Capture authorized payment (if not auto-captured)
 */
export async function capturePayment(
  paymentId: string,
  amount: number,
  currency: string = 'INR'
): Promise<RazorpayPayment> {
  try {
    const razorpay = getRazorpayInstance()
    const payment = await razorpay.payments.capture(
      paymentId,
      Math.round(amount * 100),
      currency
    )
    return payment as RazorpayPayment
  } catch (error) {
    console.error('Payment capture failed:', error)
    throw error
  }
}

/**
 * Get refund details
 */
export async function getRefundDetails(
  paymentId: string,
  refundId: string
): Promise<RazorpayRefund> {
  try {
    const razorpay = getRazorpayInstance()
    const refund = await razorpay.payments.fetchRefund(paymentId, refundId)
    return refund as RazorpayRefund
  } catch (error) {
    console.error('Failed to fetch refund:', error)
    throw error
  }
}

/**
 * Format amount from paise to INR
 */
export function formatAmountFromPaise(amountInPaise: number): number {
  return amountInPaise / 100
}

/**
 * Format amount from INR to paise
 */
export function formatAmountToPaise(amountInINR: number): number {
  return Math.round(amountInINR * 100)
}
