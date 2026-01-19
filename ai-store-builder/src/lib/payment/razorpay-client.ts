// Client-side Razorpay utilities

export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: {
    name: string
    email: string
    contact: string
  }
  theme: {
    color: string
  }
  handler: (response: RazorpayResponse) => void
  modal: {
    ondismiss: () => void
    escape?: boolean
    backdropclose?: boolean
  }
  notes?: Record<string, string>
}

export interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void
      close: () => void
    }
  }
}

/**
 * Check if Razorpay SDK is loaded
 */
export function isRazorpayLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.Razorpay
}

/**
 * Load Razorpay SDK script dynamically
 */
export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isRazorpayLoaded()) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Open Razorpay checkout modal
 */
export function openRazorpayCheckout(options: RazorpayOptions): void {
  if (!isRazorpayLoaded()) {
    throw new Error('Razorpay SDK not loaded')
  }

  const razorpay = new window.Razorpay(options)
  razorpay.open()
}

/**
 * Create Razorpay options object
 */
export function createRazorpayOptions(
  orderId: string,
  razorpayOrderId: string,
  razorpayKeyId: string,
  amount: number,
  storeName: string,
  orderNumber: string,
  customer: {
    name: string
    email: string
    phone: string
  },
  brandColor: string,
  onSuccess: (response: RazorpayResponse) => void,
  onDismiss: () => void
): RazorpayOptions {
  return {
    key: razorpayKeyId,
    amount: Math.round(amount * 100), // Convert to paise
    currency: 'INR',
    name: storeName,
    description: `Order #${orderNumber}`,
    order_id: razorpayOrderId,
    prefill: {
      name: customer.name,
      email: customer.email,
      contact: customer.phone
    },
    theme: {
      color: brandColor || '#3b82f6'
    },
    handler: onSuccess,
    modal: {
      ondismiss: onDismiss,
      escape: true,
      backdropclose: false
    },
    notes: {
      order_id: orderId,
      order_number: orderNumber
    }
  }
}
