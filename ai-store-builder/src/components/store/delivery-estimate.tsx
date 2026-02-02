'use client'

import { useState, useEffect, useCallback } from 'react'
import { Truck, Clock, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { addDays, format } from 'date-fns'

interface DeliveryEstimateProps {
  storeId: string
  pincode: string
  className?: string
}

interface DeliveryInfo {
  serviceable: boolean
  estimated_days: number | null
  estimated_date_range: string | null
  courier_name?: string
  min_rate?: number
}

export default function DeliveryEstimate({
  storeId,
  pincode,
  className = '',
}: DeliveryEstimateProps) {
  const [loading, setLoading] = useState(false)
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchDeliveryEstimate = useCallback(async () => {
    if (!pincode || pincode.length !== 6) {
      setDeliveryInfo(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/shipping/estimate?pincode=${pincode}&store_id=${storeId}`
      )

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 404) {
          setDeliveryInfo({ serviceable: false, estimated_days: null, estimated_date_range: null })
          setError(data.message || 'Delivery not available to this pincode')
        } else {
          throw new Error(data.error || 'Failed to check delivery')
        }
        return
      }

      const data = await response.json()

      // Calculate estimated date range
      let estimated_date_range: string | null = null
      if (data.estimated_days) {
        const startDate = addDays(new Date(), data.estimated_days)
        const endDate = addDays(new Date(), data.estimated_days + 2)
        estimated_date_range = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
      }

      setDeliveryInfo({
        serviceable: data.serviceable,
        estimated_days: data.estimated_days,
        estimated_date_range,
        courier_name: data.courier_name,
        min_rate: data.min_rate,
      })
      setError(null)
    } catch (err) {
      console.error('Delivery estimate error:', err)
      // Don't show error to user, just hide the estimate
      setDeliveryInfo(null)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [pincode, storeId])

  // Debounce the API call
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeliveryEstimate()
    }, 500)

    return () => clearTimeout(timer)
  }, [fetchDeliveryEstimate])

  // Don't render anything if no pincode or loading initial state
  if (!pincode || pincode.length !== 6) {
    return null
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking delivery...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
    )
  }

  if (!deliveryInfo) {
    return null
  }

  if (!deliveryInfo.serviceable) {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Delivery not available to this pincode</span>
      </div>
    )
  }

  return (
    <div className={`p-3 bg-green-50 border border-green-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-green-100 rounded-full">
          <Truck className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Delivery available
            </span>
          </div>

          {deliveryInfo.estimated_date_range && (
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-green-600" />
              <span className="text-sm text-green-700">
                Estimated delivery: <strong>{deliveryInfo.estimated_date_range}</strong>
              </span>
            </div>
          )}

          {deliveryInfo.estimated_days && !deliveryInfo.estimated_date_range && (
            <p className="text-sm text-green-700 mt-1">
              Usually delivered in {deliveryInfo.estimated_days}-{deliveryInfo.estimated_days + 2} days
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact inline version for showing in shipping line item
 */
export function DeliveryEstimateInline({
  storeId,
  pincode,
  className = '',
}: DeliveryEstimateProps) {
  const [loading, setLoading] = useState(false)
  const [estimatedDays, setEstimatedDays] = useState<number | null>(null)

  useEffect(() => {
    if (!pincode || pincode.length !== 6) {
      setEstimatedDays(null)
      return
    }

    const fetchEstimate = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/shipping/estimate?pincode=${pincode}&store_id=${storeId}`
        )
        if (response.ok) {
          const data = await response.json()
          setEstimatedDays(data.estimated_days)
        }
      } catch (err) {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchEstimate, 500)
    return () => clearTimeout(timer)
  }, [pincode, storeId])

  if (loading) {
    return <span className={`text-gray-400 ${className}`}>...</span>
  }

  if (!estimatedDays) {
    return null
  }

  const startDate = addDays(new Date(), estimatedDays)
  const endDate = addDays(new Date(), estimatedDays + 2)

  return (
    <span className={`text-xs text-gray-500 ${className}`}>
      (Est. {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')})
    </span>
  )
}
