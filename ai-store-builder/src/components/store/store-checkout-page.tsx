'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { ArrowLeft, Lock, CreditCard, Truck, ShoppingBag, Loader2, AlertCircle } from 'lucide-react'
import { useStore, useIsHydrated } from '@/lib/contexts/store-context'
import { useAnalytics } from '@/lib/analytics'
import { toast } from 'sonner'
import {
  isRazorpayLoaded,
  createRazorpayOptions,
  type RazorpayResponse
} from '@/lib/payment/razorpay-client'

interface OrderResponse {
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

export default function StoreCheckoutPage() {
  const router = useRouter()
  const { store, cart, cartSubtotal, cartTotal, shippingCost, formatPrice, settings, clearCart } = useStore()
  const analytics = useAnalytics()
  const isHydrated = useIsHydrated()
  const baseUrl = `/${store.slug}`
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'online' as 'online' | 'cod'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [orderData, setOrderData] = useState<OrderResponse['order'] | null>(null)
  
  const codFee = formData.paymentMethod === 'cod' && settings.shipping?.cod_fee ? settings.shipping.cod_fee : 0
  const finalTotal = cartTotal + codFee

  // Track begin checkout when page loads with items
  useEffect(() => {
    if (isHydrated && cart.length > 0) {
      analytics.trackBeginCheckout({
        items: cart.map(item => ({
          id: item.product.id,
          name: item.product.title,
          price: item.product.price,
          category: item.product.categories?.[0],
          quantity: item.quantity
        })),
        value: cartTotal
      })
    }
  }, [isHydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  // Get brand color from store blueprint
  const brandColor = store.blueprint?.branding?.colors?.primary || '#3b82f6'
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email'
    
    if (!formData.firstName) newErrors.firstName = 'First name is required'
    if (!formData.lastName) newErrors.lastName = 'Last name is required'
    if (!formData.phone) newErrors.phone = 'Phone is required'
    else if (!/^[6-9]\d{9}$/.test(formData.phone)) newErrors.phone = 'Invalid phone number'
    
    if (!formData.address) newErrors.address = 'Address is required'
    if (!formData.city) newErrors.city = 'City is required'
    if (!formData.state) newErrors.state = 'State is required'
    if (!formData.pincode) newErrors.pincode = 'Pincode is required'
    else if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = 'Invalid pincode'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      // Create order on backend
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity
          })),
          shipping_address: {
            name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            address_line1: formData.address,
            address_line2: formData.apartment || undefined,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: 'India'
          },
          customer_details: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone
          },
          payment_method: formData.paymentMethod === 'cod' ? 'cod' : 'razorpay'
        })
      })
      
      const data: OrderResponse = await response.json()
      
      if (!data.success || !data.order) {
        throw new Error(data.error || 'Failed to create order')
      }
      
      setOrderData(data.order)
      
      // Handle payment based on method
      if (formData.paymentMethod === 'cod') {
        // COD - redirect to thank you page immediately
        clearCart()
        router.push(`${baseUrl}/thank-you?order=${data.order.order_number}`)
      } else {
        // Razorpay - open payment modal
        openRazorpayModal(data.order)
      }
      
    } catch (error: unknown) {
      console.error('Checkout error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      setErrors({ submit: errorMessage })
      toast.error('Order Failed', {
        description: errorMessage
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const openRazorpayModal = (order: OrderResponse['order']) => {
    if (!order?.razorpay_order_id || !order?.razorpay_key_id) {
      toast.error('Payment initialization failed', {
        description: 'Missing payment details. Please try again.'
      })
      return
    }
    
    if (!razorpayLoaded || !isRazorpayLoaded()) {
      toast.error('Payment Error', {
        description: 'Razorpay not loaded. Please refresh the page.'
      })
      return
    }
    
    const options = createRazorpayOptions(
      order.id,
      order.razorpay_order_id,
      order.razorpay_key_id,
      order.total_amount,
      store.name,
      order.order_number,
      {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone
      },
      brandColor,
      // Success handler
      async (response: RazorpayResponse) => {
        await verifyPayment(response, order)
      },
      // Dismiss handler
      () => {
        toast.error('Payment Cancelled', {
          description: 'You can retry payment or choose Cash on Delivery.'
        })
        setIsSubmitting(false)
      }
    )
    
    // Open Razorpay checkout
    const razorpay = new window.Razorpay(options)
    razorpay.open()
  }
  
  const verifyPayment = async (paymentResponse: RazorpayResponse, order: NonNullable<OrderResponse['order']>) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/orders/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          order_id: order.id
        })
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payment verification failed')
      }
      
      // Success! Clear cart and redirect
      toast.success('Payment Successful!', {
        description: 'Your order has been confirmed.'
      })
      clearCart()
      router.push(`${baseUrl}/thank-you?order=${order.order_number}`)
      
    } catch (error: unknown) {
      console.error('Payment verification error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Payment verification failed'
      toast.error('Payment Verification Failed', {
        description: `${errorMessage}. Please contact support with your payment ID.`
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!isHydrated) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (cart.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-gray-600 mb-8">Add some products before checking out.</p>
        <Link
          href={`${baseUrl}/products`}
          className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Browse Products
        </Link>
      </div>
    )
  }
  
  return (
    <>
      {/* Load Razorpay script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        strategy="lazyOnload"
      />
      
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link 
          href={`${baseUrl}/cart`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Checkout Form */}
          <div>
            <h1 
              className="text-2xl font-bold mb-8"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Checkout
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact */}
              <section>
                <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="your@email.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.phone ? 'border-red-500' : ''}`}
                      placeholder="9876543210"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </section>
              
              {/* Shipping Address */}
              <section>
                <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">First Name *</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.firstName ? 'border-red-500' : ''}`}
                      />
                      {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.lastName ? 'border-red-500' : ''}`}
                      />
                      {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Address *</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.address ? 'border-red-500' : ''}`}
                      placeholder="House number, Street name"
                    />
                    {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Apartment, suite, etc. (optional)</label>
                    <input
                      type="text"
                      value={formData.apartment}
                      onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">City *</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.city ? 'border-red-500' : ''}`}
                      />
                      {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">State *</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.state ? 'border-red-500' : ''}`}
                      />
                      {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Pincode *</label>
                      <input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.pincode ? 'border-red-500' : ''}`}
                        maxLength={6}
                      />
                      {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Payment Method */}
              <section>
                <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
                <div className="space-y-3">
                  <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${formData.paymentMethod === 'online' ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'hover:border-gray-400'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={formData.paymentMethod === 'online'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'online' })}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'online' ? 'border-[var(--color-primary)]' : 'border-gray-300'}`}>
                      {formData.paymentMethod === 'online' && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />}
                    </div>
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">Pay Online</p>
                      <p className="text-sm text-gray-500">Credit/Debit Card, UPI, Net Banking, Wallets</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                      <Image src="/razorpay-logo.svg" alt="Razorpay" width={80} height={20} className="opacity-60" />
                    </div>
                  </label>
                  
                  {settings.shipping?.cod_enabled && (
                    <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${formData.paymentMethod === 'cod' ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'hover:border-gray-400'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={formData.paymentMethod === 'cod'}
                        onChange={() => setFormData({ ...formData, paymentMethod: 'cod' })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'cod' ? 'border-[var(--color-primary)]' : 'border-gray-300'}`}>
                        {formData.paymentMethod === 'cod' && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />}
                      </div>
                      <Truck className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Cash on Delivery</p>
                        <p className="text-sm text-gray-500">
                          Pay when you receive
                          {settings.shipping?.cod_fee && ` (+${formatPrice(settings.shipping.cod_fee)} fee)`}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </section>
              
              {/* Error Message */}
              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700">{errors.submit}</p>
                  </div>
                </div>
              )}
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Place Order • {formatPrice(finalTotal)}
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-gray-500">
                By placing this order, you agree to our Terms of Service and Privacy Policy.
                Your payment information is processed securely.
              </p>
            </form>
          </div>
          
          {/* Order Summary */}
          <div className="lg:pl-8 lg:border-l">
            <div className="sticky top-8">
              <h2 className="text-lg font-semibold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex gap-4">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.product.images?.[0]?.url ? (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 text-white text-xs rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{item.product.title}</p>
                    </div>
                    <p className="font-medium text-sm">{formatPrice(item.product.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>{shippingCost === 0 ? <span className="text-green-600">Free</span> : formatPrice(shippingCost)}</span>
                </div>
                {codFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">COD Fee</span>
                    <span>{formatPrice(codFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>Total</span>
                  <span style={{ color: 'var(--color-primary)' }}>{formatPrice(finalTotal)}</span>
                </div>
              </div>
              
              {/* Security Badge */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Secure Checkout</p>
                    <p className="text-xs text-gray-500">Your payment information is encrypted</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
