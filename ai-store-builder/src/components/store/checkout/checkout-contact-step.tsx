'use client'

import { User } from 'lucide-react'

interface CheckoutContactStepProps {
  formData: {
    email: string
    phone: string
  }
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
  onContinue: () => void
  isAuthenticated: boolean
  customerEmail?: string | null
  isVisible: boolean
}

export default function CheckoutContactStep({
  formData,
  errors,
  onChange,
  onContinue,
  isAuthenticated,
  customerEmail,
  isVisible,
}: CheckoutContactStepProps) {
  return (
    <section className={isVisible ? '' : 'hidden'}>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <User className="w-5 h-5" />
        Contact Information
      </h2>

      {isAuthenticated && customerEmail && (
        <p className="text-sm text-gray-500 mb-4">
          Logged in as {customerEmail}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            className={`w-full px-4 py-3 min-h-[44px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
              errors.email ? 'border-red-500' : ''
            }`}
            placeholder="your@email.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone *</label>
          <div className="relative">
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                // Allow digits, spaces, dashes, plus, parentheses
                const value = e.target.value.replace(/[^\d\s\-+()]/g, '').slice(0, 16)
                onChange('phone', value)
              }}
              className={`w-full px-4 py-3 min-h-[44px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                errors.phone ? 'border-red-500' : ''
              }`}
              placeholder="+91 9876543210"
              maxLength={16}
            />
          </div>
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div className="mt-6 md:relative sticky bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm p-4 -mx-4 md:mx-0 md:p-0 md:bg-transparent md:backdrop-blur-none border-t md:border-t-0 border-gray-200">
        <button
          type="button"
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 md:py-3 rounded-lg font-semibold text-white transition-all min-h-[48px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Continue to Shipping
        </button>
      </div>
    </section>
  )
}
