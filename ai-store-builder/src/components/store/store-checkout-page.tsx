'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import {
  ArrowLeft,
  Lock,
  CreditCard,
  Truck,
  ShoppingBag,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  User,
  MapPin,
  Wallet,
} from 'lucide-react'
import { useStore, useIsHydrated } from '@/lib/contexts/store-context'
import { useCustomer } from '@/lib/contexts/customer-context'
import { useAnalytics } from '@/lib/analytics'
import { toast } from 'sonner'
import {
  isRazorpayLoaded,
  createRazorpayOptions,
  type RazorpayResponse,
} from '@/lib/payment/razorpay-client'
import { redirectToStripeCheckout } from '@/lib/payment/stripe-client'
import AddressAutocomplete from './address-autocomplete'
import SavedAddressSelector, { type SavedAddress } from './saved-address-selector'
import DeliveryEstimate, { DeliveryEstimateInline } from './delivery-estimate'
import type { AddressComponents } from '@/lib/google-places'

// localStorage key for guest checkout data
const GUEST_CHECKOUT_KEY = 'storeforge_guest_checkout'

interface GuestCheckoutData {
  email: string
  phone: string
  firstName: string
  lastName: string
  storeId: string
  timestamp: number
}

interface OrderResponse {
  success: boolean
  order?: {
    id: string
    order_number: string
    total_amount: number
    currency?: string
    razorpay_order_id?: string
    razorpay_key_id?: string
    stripe_session_url?: string
    stripe_publishable_key?: string
  }
  error?: string
  details?: string[]
}

type CheckoutStep = 'contact' | 'shipping' | 'payment'

const CHECKOUT_STEPS: { key: CheckoutStep; label: string; icon: typeof User }[] = [
  { key: 'contact', label: 'Contact', icon: User },
  { key: 'shipping', label: 'Shipping', icon: MapPin },
  { key: 'payment', label: 'Payment', icon: Wallet },
]

export default function StoreCheckoutPage() {
  const router = useRouter()
  const { store, cart, cartSubtotal, cartTotal, shippingCost, formatPrice, settings, clearCart } = useStore()
  const { customer, isAuthenticated } = useCustomer()
  const analytics = useAnalytics()
  const isHydrated = useIsHydrated()
  const baseUrl = `/${store.slug}`

  // Determine store currency and payment provider
  const storeCurrency = (store.blueprint as any)?.location?.currency || 'INR'
  const useStripe = storeCurrency !== 'INR' // INR → Razorpay, everything else → Stripe

  // Form state
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
    paymentMethod: 'online' as 'online' | 'cod',
  })

  // UI state
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('contact')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [orderData, setOrderData] = useState<OrderResponse['order'] | null>(null)
  const [showMobileSummary, setShowMobileSummary] = useState(false)

  // Address selection state
  const [useSavedAddress, setUseSavedAddress] = useState(true)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)

  const codFee = formData.paymentMethod === 'cod' && settings.shipping?.cod_fee ? settings.shipping.cod_fee : 0
  const finalTotal = cartTotal + codFee

  // Load saved guest checkout data
  useEffect(() => {
    if (!isHydrated) return

    // If logged in, pre-fill from customer data
    if (isAuthenticated && customer) {
      const nameParts = customer.full_name?.split(' ') || ['', '']
      setFormData((prev) => ({
        ...prev,
        email: customer.email || prev.email,
        phone: customer.phone || prev.phone,
        firstName: nameParts[0] || prev.firstName,
        lastName: nameParts.slice(1).join(' ') || prev.lastName,
      }))
      return
    }

    // Load guest checkout data from localStorage
    try {
      const savedData = localStorage.getItem(GUEST_CHECKOUT_KEY)
      if (savedData) {
        const parsed: GuestCheckoutData = JSON.parse(savedData)
        // Only use if less than 30 days old and same store
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
        if (
          parsed.storeId === store.id &&
          Date.now() - parsed.timestamp < thirtyDaysMs
        ) {
          setFormData((prev) => ({
            ...prev,
            email: parsed.email || prev.email,
            phone: parsed.phone || prev.phone,
            firstName: parsed.firstName || prev.firstName,
            lastName: parsed.lastName || prev.lastName,
          }))
        }
      }
    } catch (err) {
      // Ignore localStorage errors
    }
  }, [isHydrated, isAuthenticated, customer, store.id])

  // Save guest checkout data on change
  const saveGuestData = useCallback(() => {
    if (isAuthenticated) return // Don't save for logged in users

    try {
      const dataToSave: GuestCheckoutData = {
        email: formData.email,
        phone: formData.phone,
        firstName: formData.firstName,
        lastName: formData.lastName,
        storeId: store.id,
        timestamp: Date.now(),
      }
      localStorage.setItem(GUEST_CHECKOUT_KEY, JSON.stringify(dataToSave))
    } catch (err) {
      // Ignore localStorage errors
    }
  }, [formData.email, formData.phone, formData.firstName, formData.lastName, store.id, isAuthenticated])

  // Track begin checkout when page loads with items
  useEffect(() => {
    if (isHydrated && cart.length > 0) {
      analytics.trackBeginCheckout({
        items: cart.map((item) => ({
          id: item.product.id,
          name: item.product.title,
          price: item.product.price,
          category: item.product.categories?.[0],
          quantity: item.quantity,
        })),
        value: cartTotal,
      })
    }
  }, [isHydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  // Get brand color from store blueprint
  const brandColor = store.blueprint?.branding?.colors?.primary || '#3b82f6'

  // Handle saved address selection
  const handleSelectSavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id)
    setUseSavedAddress(true)

    // Parse name into first/last
    const nameParts = address.full_name.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    setFormData((prev) => ({
      ...prev,
      firstName,
      lastName,
      phone: address.phone,
      address: address.address_line1,
      apartment: address.address_line2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    }))

    // Move to payment step if address selected
    if (formData.email && formData.phone) {
      setCurrentStep('payment')
    }
  }

  // Handle address autocomplete selection
  const handleAddressAutocomplete = (addressComponents: AddressComponents) => {
    setFormData((prev) => ({
      ...prev,
      address: addressComponents.addressLine1,
      apartment: addressComponents.addressLine2 || prev.apartment,
      city: addressComponents.city,
      state: addressComponents.state,
      pincode: addressComponents.pincode,
    }))
  }

  // Handle switching to manual address entry
  const handleAddNewAddress = () => {
    setUseSavedAddress(false)
    setSelectedAddressId(null)
    // Clear address fields but keep contact info
    setFormData((prev) => ({
      ...prev,
      address: '',
      apartment: '',
      city: '',
      state: '',
      pincode: '',
    }))
  }

  // Validate specific step
  const validateStep = (step: CheckoutStep): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 'contact') {
      if (!formData.email) newErrors.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        newErrors.email = 'Please enter a valid email address'

      if (!formData.phone) newErrors.phone = 'Phone number is required'
      else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, '')))
        newErrors.phone = 'Please enter a valid 10-digit Indian phone number'
    }

    if (step === 'shipping') {
      if (!formData.firstName) newErrors.firstName = 'First name is required'
      if (!formData.lastName) newErrors.lastName = 'Last name is required'
      if (!formData.address) newErrors.address = 'Address is required'
      if (!formData.city) newErrors.city = 'City is required'
      if (!formData.state) newErrors.state = 'State is required'
      if (!formData.pincode) newErrors.pincode = 'Pincode is required'
      else if (!/^\d{6}$/.test(formData.pincode))
        newErrors.pincode = 'Please enter a valid 6-digit pincode'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Validate entire form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Please enter a valid email address'

    if (!formData.firstName) newErrors.firstName = 'First name is required'
    if (!formData.lastName) newErrors.lastName = 'Last name is required'
    if (!formData.phone) newErrors.phone = 'Phone number is required'
    else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, '')))
      newErrors.phone = 'Please enter a valid 10-digit Indian phone number'

    if (!formData.address) newErrors.address = 'Address is required'
    if (!formData.city) newErrors.city = 'City is required'
    if (!formData.state) newErrors.state = 'State is required'
    if (!formData.pincode) newErrors.pincode = 'Pincode is required'
    else if (!/^\d{6}$/.test(formData.pincode))
      newErrors.pincode = 'Please enter a valid 6-digit pincode'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Navigate to next step
  const goToNextStep = () => {
    if (currentStep === 'contact' && validateStep('contact')) {
      saveGuestData()
      setCurrentStep('shipping')
    } else if (currentStep === 'shipping' && validateStep('shipping')) {
      setCurrentStep('payment')
    }
  }

  // Navigate to previous step
  const goToPreviousStep = () => {
    if (currentStep === 'shipping') setCurrentStep('contact')
    else if (currentStep === 'payment') setCurrentStep('shipping')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      // Find which step has errors and go there
      if (errors.email || errors.phone) {
        setCurrentStep('contact')
      } else if (errors.firstName || errors.lastName || errors.address || errors.city || errors.state || errors.pincode) {
        setCurrentStep('shipping')
      }
      return
    }

    // Save guest data before submitting
    saveGuestData()

    setIsSubmitting(true)
    setErrors({})

    try {
      // Clean phone number (remove non-digits)
      const cleanPhone = formData.phone.replace(/\D/g, '')

      // Create order on backend
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          items: cart.map((item) => ({
            product_id: item.product.id,
            variant_id: item.variant?.id,
            quantity: item.quantity,
          })),
          shipping_address: {
            name: `${formData.firstName} ${formData.lastName}`,
            phone: cleanPhone,
            address_line1: formData.address,
            address_line2: formData.apartment || undefined,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: 'India',
          },
          customer_details: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: cleanPhone,
          },
          payment_method: formData.paymentMethod === 'cod' ? 'cod' : (useStripe ? 'stripe' : 'razorpay'),
        }),
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
      } else if (data.order.stripe_session_url) {
        // Stripe - redirect to Stripe Checkout
        clearCart()
        redirectToStripeCheckout(data.order.stripe_session_url)
      } else {
        // Razorpay - open payment modal
        openRazorpayModal(data.order)
      }
    } catch (error: unknown) {
      console.error('Checkout error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      setErrors({ submit: errorMessage })
      toast.error('Order Failed', {
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openRazorpayModal = (order: OrderResponse['order']) => {
    if (!order?.razorpay_order_id || !order?.razorpay_key_id) {
      toast.error('Payment initialization failed', {
        description: 'Missing payment details. Please try again.',
      })
      return
    }

    if (!razorpayLoaded || !isRazorpayLoaded()) {
      toast.error('Payment Error', {
        description: 'Payment system not loaded. Please refresh the page.',
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
        phone: formData.phone,
      },
      brandColor,
      // Success handler
      async (response: RazorpayResponse) => {
        await verifyPayment(response, order)
      },
      // Dismiss handler
      () => {
        toast.error('Payment Cancelled', {
          description: 'You can retry payment or choose Cash on Delivery.',
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
          order_id: order.id,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payment verification failed')
      }

      // Success! Clear cart and redirect
      toast.success('Payment Successful!', {
        description: 'Your order has been confirmed.',
      })
      clearCart()
      router.push(`${baseUrl}/thank-you?order=${order.order_number}`)
    } catch (error: unknown) {
      console.error('Payment verification error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Payment verification failed'
      toast.error('Payment Verification Failed', {
        description: `${errorMessage}. Please contact support with your payment ID.`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get step index for progress indicator
  const getStepIndex = (step: CheckoutStep) => CHECKOUT_STEPS.findIndex((s) => s.key === step)
  const currentStepIndex = getStepIndex(currentStep)

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
      {/* Load Razorpay script (only for INR stores) */}
      {!useStripe && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onLoad={() => setRazorpayLoaded(true)}
          strategy="lazyOnload"
        />
      )}

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href={`${baseUrl}/cart`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Link>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-md">
            {CHECKOUT_STEPS.map((step, index) => {
              const Icon = step.icon
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex

              return (
                <div key={step.key} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted) {
                        setCurrentStep(step.key)
                      }
                    }}
                    disabled={!isCompleted}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                      isCurrent
                        ? 'bg-[var(--color-primary)] text-white'
                        : isCompleted
                        ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                  </button>

                  {index < CHECKOUT_STEPS.length - 1 && (
                    <div
                      className={`w-8 sm:w-12 h-0.5 mx-1 ${
                        index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Checkout Form */}
          <div>
            <h1
              className="text-2xl font-bold mb-6"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Checkout
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <section className={currentStep !== 'contact' ? 'hidden' : ''}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact Information
                </h2>

                {isAuthenticated && customer && (
                  <p className="text-sm text-gray-500 mb-4">
                    Logged in as {customer.email}
                  </p>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                        errors.email ? 'border-red-500' : ''
                      }`}
                      placeholder="your@email.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">+91</span>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          // Only allow digits, max 10
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                          setFormData({ ...formData, phone: value })
                        }}
                        className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                          errors.phone ? 'border-red-500' : ''
                        }`}
                        placeholder="9876543210"
                        maxLength={10}
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goToNextStep}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Continue to Shipping
                </button>
              </section>

              {/* Shipping Address */}
              <section className={currentStep !== 'shipping' ? 'hidden' : ''}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </h2>

                {/* Saved Addresses (for logged-in customers) */}
                {isAuthenticated && useSavedAddress && (
                  <SavedAddressSelector
                    selectedAddressId={selectedAddressId}
                    onSelectAddress={handleSelectSavedAddress}
                    onAddNewAddress={handleAddNewAddress}
                    className="mb-6"
                  />
                )}

                {/* Manual Address Form - Always show for guests, or when logged-in user chooses new address */}
                {(!isAuthenticated || !useSavedAddress || !selectedAddressId) && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">First Name *</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                            errors.firstName ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.firstName && (
                          <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Last Name *</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                            errors.lastName ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.lastName && (
                          <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Address *</label>
                      <AddressAutocomplete
                        value={formData.address}
                        onChange={(value) => setFormData({ ...formData, address: value })}
                        onAddressSelect={handleAddressAutocomplete}
                        placeholder="Start typing your address..."
                        error={errors.address}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Apartment, suite, etc. (optional)
                      </label>
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
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                            errors.city ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">State *</label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                            errors.state ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Pincode *</label>
                        <input
                          type="text"
                          value={formData.pincode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                            setFormData({ ...formData, pincode: value })
                          }}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                            errors.pincode ? 'border-red-500' : ''
                          }`}
                          maxLength={6}
                        />
                        {errors.pincode && (
                          <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Estimate */}
                    <DeliveryEstimate
                      storeId={store.id}
                      pincode={formData.pincode}
                      className="mt-4"
                    />

                    {/* Back to saved addresses link for logged-in users */}
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => setUseSavedAddress(true)}
                        className="text-sm text-[var(--color-primary)] hover:underline"
                      >
                        Use a saved address instead
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={goToPreviousStep}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goToNextStep}
                    className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Continue to Payment
                  </button>
                </div>
              </section>

              {/* Payment Method */}
              <section className={currentStep !== 'payment' ? 'hidden' : ''}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Payment Method
                </h2>

                {/* Summary of shipping info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">Shipping to:</p>
                      <p className="font-medium">
                        {formData.firstName} {formData.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formData.address}
                        {formData.apartment && `, ${formData.apartment}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formData.city}, {formData.state} - {formData.pincode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('shipping')}
                      className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'online'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                        : 'hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={formData.paymentMethod === 'online'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'online' })}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.paymentMethod === 'online'
                          ? 'border-[var(--color-primary)]'
                          : 'border-gray-300'
                      }`}
                    >
                      {formData.paymentMethod === 'online' && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        />
                      )}
                    </div>
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">{useStripe ? 'Pay with Card' : 'Pay Online'}</p>
                      <p className="text-sm text-gray-500">
                        {useStripe
                          ? 'Credit/Debit Card, Apple Pay, Google Pay'
                          : 'Credit/Debit Card, UPI, Net Banking, Wallets'}
                      </p>
                    </div>
                    {!useStripe && (
                      <div className="hidden sm:flex items-center gap-1">
                        <Image
                          src="/razorpay-logo.svg"
                          alt="Razorpay"
                          width={80}
                          height={20}
                          className="opacity-60"
                        />
                      </div>
                    )}
                  </label>

                  {settings.shipping?.cod_enabled && (
                    <label
                      className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.paymentMethod === 'cod'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                          : 'hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={formData.paymentMethod === 'cod'}
                        onChange={() => setFormData({ ...formData, paymentMethod: 'cod' })}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.paymentMethod === 'cod'
                            ? 'border-[var(--color-primary)]'
                            : 'border-gray-300'
                        }`}
                      >
                        {formData.paymentMethod === 'cod' && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          />
                        )}
                      </div>
                      <Truck className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Cash on Delivery</p>
                        <p className="text-sm text-gray-500">
                          Pay when you receive
                          {settings.shipping?.cod_fee && (
                            <span className="text-orange-600 font-medium">
                              {' '}(+{formatPrice(settings.shipping.cod_fee)} fee)
                            </span>
                          )}
                        </p>
                      </div>
                    </label>
                  )}
                </div>

                {/* Error Message */}
                {errors.submit && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700">{errors.submit}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={goToPreviousStep}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
                        Place Order - {formatPrice(finalTotal)}
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-center text-gray-500 mt-4">
                  By placing this order, you agree to our Terms of Service and Privacy Policy. Your
                  payment information is processed securely.
                </p>
              </section>
            </form>
          </div>

          {/* Order Summary - Desktop (Sticky) */}
          <div className="hidden lg:block lg:pl-8 lg:border-l">
            <div className="sticky top-8">
              <h2 className="text-lg font-semibold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {cart.map((item) => (
                  <div key={`${item.product.id}-${item.variant?.id || 'default'}`} className="flex gap-4">
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
                      {item.variant && (
                        <p className="text-xs text-gray-500">
                          {Object.values(item.variant.attributes).join(' / ')}
                        </p>
                      )}
                    </div>
                    <p className="font-medium text-sm">
                      {formatPrice((item.variant?.price ?? item.product.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="text-gray-600">
                    <span>Shipping</span>
                    {formData.pincode.length === 6 && (
                      <DeliveryEstimateInline
                        storeId={store.id}
                        pincode={formData.pincode}
                        className="ml-1"
                      />
                    )}
                  </div>
                  <span>
                    {shippingCost === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      formatPrice(shippingCost)
                    )}
                  </span>
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

          {/* Order Summary - Mobile (Collapsible) */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
            <button
              type="button"
              onClick={() => setShowMobileSummary(!showMobileSummary)}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gray-500" />
                <span className="font-medium">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
                  {formatPrice(finalTotal)}
                </span>
                {showMobileSummary ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronUp className="w-5 h-5" />
                )}
              </div>
            </button>

            {showMobileSummary && (
              <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto border-t">
                <div className="space-y-3 py-4">
                  {cart.map((item) => (
                    <div key={`${item.product.id}-${item.variant?.id || 'default'}`} className="flex gap-3">
                      <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.product.images?.[0]?.url ? (
                          <Image
                            src={item.product.images[0].url}
                            alt={item.product.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 text-white text-[10px] rounded-full flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{item.product.title}</p>
                        {item.variant && (
                          <p className="text-xs text-gray-500">
                            {Object.values(item.variant.attributes).join(' / ')}
                          </p>
                        )}
                      </div>
                      <p className="font-medium text-sm">
                        {formatPrice((item.variant?.price ?? item.product.price) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-3 border-t text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>
                      {shippingCost === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        formatPrice(shippingCost)
                      )}
                    </span>
                  </div>
                  {formData.pincode.length === 6 && (
                    <div className="text-xs text-gray-500">
                      <DeliveryEstimateInline
                        storeId={store.id}
                        pincode={formData.pincode}
                      />
                    </div>
                  )}
                  {codFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">COD Fee</span>
                      <span>{formatPrice(codFee)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Spacer for mobile fixed summary */}
          <div className="lg:hidden h-16" />
        </div>
      </div>
    </>
  )
}
