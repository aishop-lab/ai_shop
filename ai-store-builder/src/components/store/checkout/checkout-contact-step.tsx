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
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                // Allow digits, spaces, dashes, plus, parentheses
                const value = e.target.value.replace(/[^\d\s\-+()]/g, '').slice(0, 16)
                onChange('phone', value)
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                errors.phone ? 'border-red-500' : ''
              }`}
              placeholder="+91 9876543210"
              maxLength={16}
            />
          </div>
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        Continue to Shipping
      </button>
    </section>
  )
}
