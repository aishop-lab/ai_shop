'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'
import {
  loadGoogleMapsScript,
  isGooglePlacesAvailable,
  AddressAutocompleteManager,
  PlacePrediction,
  AddressComponents,
} from '@/lib/google-places'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: AddressComponents) => void
  placeholder?: string
  className?: string
  error?: string
  disabled?: boolean
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Start typing your address...',
  className = '',
  error,
  disabled = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [apiError, setApiError] = useState<string | null>(null)

  const managerRef = useRef<AddressAutocompleteManager | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

    if (!apiKey) {
      // No API key configured, gracefully degrade to manual input
      return
    }

    if (isGooglePlacesAvailable()) {
      setGoogleLoaded(true)
      managerRef.current = new AddressAutocompleteManager()
      return
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setGoogleLoaded(true)
        managerRef.current = new AddressAutocompleteManager()
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err)
        setApiError('Address autocomplete unavailable')
      })

    return () => {
      managerRef.current?.destroy()
    }
  }, [])

  // Fetch predictions with debounce
  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!managerRef.current || !googleLoaded || input.length < 3) {
        setPredictions([])
        return
      }

      setIsLoading(true)
      try {
        const results = await managerRef.current.getPredictions(input)
        setPredictions(results)
        setIsOpen(results.length > 0)
        setSelectedIndex(-1)
      } catch (err) {
        console.error('Failed to fetch predictions:', err)
        setPredictions([])
      } finally {
        setIsLoading(false)
      }
    },
    [googleLoaded]
  )

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce API calls
    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue)
    }, 300)
  }

  // Handle prediction selection
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    if (!managerRef.current) return

    setIsFetchingDetails(true)
    setIsOpen(false)

    try {
      const details = await managerRef.current.getAddressDetails(
        prediction.placeId
      )
      if (details) {
        onChange(details.addressLine1)
        onAddressSelect(details)
      } else {
        // Fallback: use the prediction description
        onChange(prediction.mainText)
      }
    } catch (err) {
      console.error('Failed to get place details:', err)
      onChange(prediction.mainText)
    } finally {
      setIsFetchingDetails(false)
      setPredictions([])
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : predictions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelectPrediction(predictions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const showAutocomplete = googleLoaded && !apiError

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) {
              setIsOpen(true)
            }
          }}
          placeholder={placeholder}
          disabled={disabled || isFetchingDetails}
          className={`w-full px-4 py-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
            error ? 'border-red-500' : ''
          } ${disabled || isFetchingDetails ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />

        {/* Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(isLoading || isFetchingDetails) && (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          )}
          {!isLoading && !isFetchingDetails && showAutocomplete && (
            <MapPin className="w-4 h-4 text-gray-400" />
          )}
          {value && !isLoading && !isFetchingDetails && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setPredictions([])
                inputRef.current?.focus()
              }}
              className="p-0.5 hover:bg-gray-100 rounded"
              aria-label="Clear address"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {/* Predictions dropdown */}
      {isOpen && predictions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {predictions.map((prediction, index) => (
            <li
              key={prediction.placeId}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSelectPrediction(prediction)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {prediction.mainText}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {prediction.secondaryText}
                  </p>
                </div>
              </div>
            </li>
          ))}
          {/* Google attribution (required by ToS) */}
          <li className="px-4 py-2 text-xs text-gray-400 border-t flex items-center justify-end gap-1">
            <span>Powered by</span>
            <img
              src="https://developers.google.com/static/maps/documentation/images/google_on_white.png"
              alt="Google"
              className="h-3"
            />
          </li>
        </ul>
      )}

      {/* Helper text when no API key */}
      {!showAutocomplete && !error && (
        <p className="text-xs text-gray-500 mt-1">
          Enter your complete address manually
        </p>
      )}
    </div>
  )
}
