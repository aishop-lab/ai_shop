'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

interface Customer {
  id: string
  store_id: string
  email: string
  phone?: string
  full_name?: string
  email_verified: boolean
  total_orders: number
  total_spent: number
  created_at: string
}

interface CustomerContextType {
  customer: Customer | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, storeId: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshCustomer: () => Promise<void>
}

interface RegisterData {
  storeId: string
  email: string
  password: string
  fullName?: string
  phone?: string
  marketingConsent?: boolean
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCustomer = useCallback(async () => {
    try {
      const response = await fetch('/api/customer/me')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.customer) {
          setCustomer(data.customer)
        } else {
          setCustomer(null)
        }
      } else {
        setCustomer(null)
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error)
      setCustomer(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  const login = async (email: string, password: string, storeId: string) => {
    try {
      const response = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, storeId })
      })

      const data = await response.json()

      if (data.success && data.customer) {
        setCustomer(data.customer)
        return { success: true }
      }

      return { success: false, error: data.error || 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Login failed. Please try again.' }
    }
  }

  const register = async (registerData: RegisterData) => {
    try {
      const response = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      })

      const data = await response.json()

      if (data.success && data.customer) {
        setCustomer(data.customer)
        return { success: true }
      }

      return { success: false, error: data.error || 'Registration failed' }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Registration failed. Please try again.' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/customer/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setCustomer(null)
    }
  }

  const refreshCustomer = async () => {
    setIsLoading(true)
    await fetchCustomer()
  }

  return (
    <CustomerContext.Provider
      value={{
        customer,
        isLoading,
        isAuthenticated: !!customer,
        login,
        register,
        logout,
        refreshCustomer
      }}
    >
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  const context = useContext(CustomerContext)
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider')
  }
  return context
}
