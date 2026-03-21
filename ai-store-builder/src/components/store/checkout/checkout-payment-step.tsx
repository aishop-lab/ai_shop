'use client'

import Image from 'next/image'
import {
  ArrowLeft,
  Lock,
  CreditCard,
  Truck,
  Wallet,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface CheckoutPaymentStepProps {
  formData: {
    firstName: string
    lastName: string
    address: string
    apartment: string
    city: string
    state: string
    pincode: string
    paymentMethod: 'online' | 'cod'
  }
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
  onEditShipping: () => void
  onBack: () => void
  isSubmitting: boolean
  codEnabled: boolean
  codFee: number
  useStripe: boolean
  finalTotal: number
  formatPrice: (price: number) => string
  isVisible: boolean
}

export default function CheckoutPaymentStep({
  formData,
  errors,
  onChange,
  onEditShipping,
  onBack,
  isSubmitting,
  codEnabled,
  codFee,
  useStripe,
  finalTotal,
  formatPrice,
  isVisible,
}: CheckoutPaymentStepProps) {
  return (
    <section className={isVisible ? '' : 'hidden'}>
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
            onClick={onEditShipping}
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
            onChange={() => onChange('paymentMethod', 'online')}
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

        {codEnabled && (
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
              onChange={() => onChange('paymentMethod', 'cod')}
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
                {codFee > 0 && (
                  <span className="text-orange-600 font-medium">
                    {' '}(+{formatPrice(codFee)} fee)
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
          onClick={onBack}
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
  )
}
