'use client'

import { useState, useEffect } from 'react'
import { MapPin, Plus, Check, Home, Briefcase, Loader2 } from 'lucide-react'

export interface SavedAddress {
  id: string
  label: string
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pincode: string
  country: string
  is_default: boolean
}

interface SavedAddressSelectorProps {
  onSelectAddress: (address: SavedAddress) => void
  onAddNewAddress: () => void
  selectedAddressId?: string | null
  className?: string
}

export default function SavedAddressSelector({
  onSelectAddress,
  onAddNewAddress,
  selectedAddressId,
  className = '',
}: SavedAddressSelectorProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch saved addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/customer/addresses')

        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated, don't show error
            setAddresses([])
            return
          }
          throw new Error('Failed to fetch addresses')
        }

        const data = await response.json()
        if (data.success && data.addresses) {
          setAddresses(data.addresses)

          // Auto-select default address if none selected
          if (!selectedAddressId && data.addresses.length > 0) {
            const defaultAddress = data.addresses.find(
              (a: SavedAddress) => a.is_default
            )
            if (defaultAddress) {
              onSelectAddress(defaultAddress)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching addresses:', err)
        setError('Could not load saved addresses')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAddresses()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // If error or no addresses after loading, trigger the manual entry flow
  useEffect(() => {
    if (!isLoading && (error || addresses.length === 0)) {
      onAddNewAddress()
    }
    // Only run when loading completes, not on every onAddNewAddress change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, addresses.length])

  // Get icon for address label
  const getAddressIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return Home
      case 'work':
      case 'office':
        return Briefcase
      default:
        return MapPin
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading saved addresses...</span>
      </div>
    )
  }

  if (error) {
    return null // Silently fail - user can enter address manually
  }

  if (addresses.length === 0) {
    return null // No saved addresses, user enters manually
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Saved Addresses</h3>
        <button
          type="button"
          onClick={onAddNewAddress}
          className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add new
        </button>
      </div>

      <div className="space-y-2">
        {addresses.map((address) => {
          const Icon = getAddressIcon(address.label)
          const isSelected = selectedAddressId === address.id

          return (
            <button
              key={address.id}
              type="button"
              onClick={() => onSelectAddress(address)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)]'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-full ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{address.label}</span>
                    {address.is_default && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        Default
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    {address.full_name}
                  </p>

                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                  </p>

                  <p className="text-sm text-gray-500">
                    {address.city}, {address.state} - {address.pincode}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">{address.phone}</p>
                </div>

                {isSelected && (
                  <div className="p-1 rounded-full bg-[var(--color-primary)] text-white">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onAddNewAddress}
        className="w-full mt-2 p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-gray-300 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <Plus className="w-4 h-4" />
        Use a different address
      </button>
    </div>
  )
}
