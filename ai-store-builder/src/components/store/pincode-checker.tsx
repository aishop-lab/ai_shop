'use client'

import { useState, useEffect } from 'react'
import { MapPin, Loader2, CheckCircle, XCircle, Truck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PincodeCheckerProps {
  storeId: string
  className?: string
}

interface DeliveryResult {
  available: boolean
  estimated_days?: string | number
  courier_name?: string
  shipping_cost?: number
  free_shipping_threshold?: number
  cod_available?: boolean
  message?: string
}

export function PincodeChecker({ storeId, className }: PincodeCheckerProps) {
  const [pincode, setPincode] = useState('')
  const [result, setResult] = useState<DeliveryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load saved pincode from localStorage
  useEffect(() => {
    const savedPincode = localStorage.getItem('delivery_pincode')
    if (savedPincode) {
      setPincode(savedPincode)
      // Auto-check saved pincode
      checkPincode(savedPincode)
    }
  }, [])

  const checkPincode = async (code?: string) => {
    const pincodeToCheck = code || pincode

    if (pincodeToCheck.length !== 6) {
      setError('Please enter a valid 6-digit pincode')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/shipping/check-pincode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pincode: pincodeToCheck,
          store_id: storeId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check pincode')
      }

      setResult(data)

      // Save pincode to localStorage for future visits
      localStorage.setItem('delivery_pincode', pincodeToCheck)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check delivery')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    checkPincode()
  }

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPincode(value)
    // Clear previous result when pincode changes
    if (result) {
      setResult(null)
    }
  }

  const clearPincode = () => {
    setPincode('')
    setResult(null)
    setError(null)
    localStorage.removeItem('delivery_pincode')
  }

  return (
    <div className={cn('border rounded-lg p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Check Delivery</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Enter pincode"
          value={pincode}
          onChange={handlePincodeChange}
          maxLength={6}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={pincode.length !== 6 || loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Check'
          )}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}

      {result && (
        <div
          className={cn(
            'mt-4 p-3 rounded-lg',
            result.available
              ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
          )}
        >
          <div className="flex items-start gap-2">
            {result.available ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={cn(
                  'font-medium',
                  result.available
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                )}
              >
                {result.available ? 'Delivery Available' : 'Not Available'}
              </p>

              {result.available && (
                <div className="mt-1 space-y-1 text-sm text-green-700 dark:text-green-300">
                  {result.estimated_days && (
                    <p className="flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      Estimated: {result.estimated_days} business days
                    </p>
                  )}
                  {result.courier_name && (
                    <p>Via {result.courier_name}</p>
                  )}
                  {result.free_shipping_threshold && (
                    <p className="text-green-600 dark:text-green-400">
                      Free shipping on orders above ₹{result.free_shipping_threshold}
                    </p>
                  )}
                  {result.cod_available && (
                    <p>Cash on Delivery available</p>
                  )}
                </div>
              )}

              {!result.available && result.message && (
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {result.message}
                </p>
              )}
            </div>
          </div>

          {result.available && (
            <button
              type="button"
              onClick={clearPincode}
              className="mt-2 text-xs text-muted-foreground hover:underline"
            >
              Change pincode
            </button>
          )}
        </div>
      )}
    </div>
  )
}
