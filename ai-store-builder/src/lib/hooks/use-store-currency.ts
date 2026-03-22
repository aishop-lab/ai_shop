'use client'
import { useState, useEffect } from 'react'

interface StoreCurrencyInfo {
  currency: string
  isLoading: boolean
}

export function useStoreCurrency(): StoreCurrencyInfo {
  const [currency, setCurrency] = useState('INR')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchCurrency() {
      try {
        const res = await fetch('/api/dashboard/stats', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const storeCurrency = data?.store?.blueprint?.location?.currency
          if (storeCurrency) setCurrency(storeCurrency)
        }
      } catch {
        // Default to INR
      } finally {
        setIsLoading(false)
      }
    }
    fetchCurrency()
  }, [])

  return { currency, isLoading }
}
