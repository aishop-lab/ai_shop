'use client'

import { MapPin, ArrowLeft } from 'lucide-react'
import AddressAutocomplete from '../address-autocomplete'
import SavedAddressSelector, { type SavedAddress } from '../saved-address-selector'
import DeliveryEstimate from '../delivery-estimate'
import type { AddressComponents } from '@/lib/google-places'

interface CheckoutShippingStepProps {
  formData: {
    firstName: string
    lastName: string
    address: string
    apartment: string
    city: string
    state: string
    pincode: string
  }
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
  useSavedAddress: boolean
  selectedAddressId: string | null
  onSelectSavedAddress: (address: SavedAddress) => void
  onAddNewAddress: () => void
  onAddressAutocomplete: (addressComponents: AddressComponents) => void
  onUseSavedAddressToggle: () => void
  isAuthenticated: boolean
  storeId: string
  onContinue: () => void
  onBack: () => void
  isVisible: boolean
}

export default function CheckoutShippingStep({
  formData,
  errors,
  onChange,
  useSavedAddress,
  selectedAddressId,
  onSelectSavedAddress,
  onAddNewAddress,
  onAddressAutocomplete,
  onUseSavedAddressToggle,
  isAuthenticated,
  storeId,
  onContinue,
  onBack,
  isVisible,
}: CheckoutShippingStepProps) {
  return (
    <section className={isVisible ? '' : 'hidden'}>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        Shipping Address
      </h2>

      {/* Saved Addresses (for logged-in customers) */}
      {isAuthenticated && useSavedAddress && (
        <SavedAddressSelector
          selectedAddressId={selectedAddressId}
          onSelectAddress={onSelectSavedAddress}
          onAddNewAddress={onAddNewAddress}
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
                onChange={(e) => onChange('firstName', e.target.value)}
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
                onChange={(e) => onChange('lastName', e.target.value)}
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
              onChange={(value) => onChange('address', value)}
              onAddressSelect={onAddressAutocomplete}
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
              onChange={(e) => onChange('apartment', e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => onChange('city', e.target.value)}
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
                onChange={(e) => onChange('state', e.target.value)}
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
                  onChange('pincode', value)
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
            storeId={storeId}
            pincode={formData.pincode}
            className="mt-4"
          />

          {/* Back to saved addresses link for logged-in users */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={onUseSavedAddressToggle}
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
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Continue to Payment
        </button>
      </div>
    </section>
  )
}
