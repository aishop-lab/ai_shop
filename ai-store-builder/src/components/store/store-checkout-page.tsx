'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import {
  ArrowLeft,
  ShoppingBag,
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
import type { AddressComponents } from '@/lib/google-places'
import type { SavedAddress } from './saved-address-selector'
import CheckoutStepIndicator from './checkout/checkout-step-indicator'
import CheckoutContactStep from './checkout/checkout-contact-step'
import CheckoutShippingStep from './checkout/checkout-shipping-step'
import CheckoutPaymentStep from './checkout/checkout-payment-step'
import CheckoutOrderSummary from './checkout/checkout-order-summary'

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

  // Handle form field changes
  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

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
        <CheckoutStepIndicator
          steps={CHECKOUT_STEPS}
          currentStepIndex={currentStepIndex}
          onStepClick={(stepKey) => setCurrentStep(stepKey as CheckoutStep)}
        />

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
              <CheckoutContactStep
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
                onContinue={goToNextStep}
                isAuthenticated={isAuthenticated}
                customerEmail={customer?.email}
                isVisible={currentStep === 'contact'}
              />

              {/* Shipping Address */}
              <CheckoutShippingStep
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
                useSavedAddress={useSavedAddress}
                selectedAddressId={selectedAddressId}
                onSelectSavedAddress={handleSelectSavedAddress}
                onAddNewAddress={handleAddNewAddress}
                onAddressAutocomplete={handleAddressAutocomplete}
                onUseSavedAddressToggle={() => setUseSavedAddress(true)}
                isAuthenticated={isAuthenticated}
                storeId={store.id}
                onContinue={goToNextStep}
                onBack={goToPreviousStep}
                isVisible={currentStep === 'shipping'}
              />

              {/* Payment Method */}
              <CheckoutPaymentStep
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
                onEditShipping={() => setCurrentStep('shipping')}
                onBack={goToPreviousStep}
                isSubmitting={isSubmitting}
                codEnabled={!!settings.shipping?.cod_enabled}
                codFee={settings.shipping?.cod_fee || 0}
                useStripe={useStripe}
                finalTotal={finalTotal}
                formatPrice={formatPrice}
                isVisible={currentStep === 'payment'}
              />
            </form>
          </div>

          {/* Order Summary */}
          <CheckoutOrderSummary
            cart={cart}
            cartSubtotal={cartSubtotal}
            shippingCost={shippingCost}
            codFee={codFee}
            finalTotal={finalTotal}
            formatPrice={formatPrice}
            storeId={store.id}
            pincode={formData.pincode}
            showMobileSummary={showMobileSummary}
            onToggleMobileSummary={() => setShowMobileSummary(!showMobileSummary)}
          />
        </div>
      </div>
    </>
  )
}
