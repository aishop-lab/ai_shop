'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { User, Package, MapPin, Heart, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useCustomer } from '@/lib/contexts/customer-context'
import { useStore } from '@/lib/contexts/store-context'

export default function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { customer, isAuthenticated, isLoading, logout } = useCustomer()
  const { store } = useStore()
  const baseUrl = `/${store.slug}`

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-2">
        <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
      </div>
    )
  }

  // Not authenticated - show sign in button
  if (!isAuthenticated) {
    return (
      <Link
        href={`${baseUrl}/account/login`}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-[var(--color-primary)] hover:bg-gray-100 rounded-lg transition-colors"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <User className="w-5 h-5" />
        <span className="hidden sm:inline">Sign In</span>
      </Link>
    )
  }

  // Authenticated - show dropdown
  const displayName = customer?.full_name?.split(' ')[0] || 'Account'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-[var(--color-primary)] hover:bg-gray-100 rounded-lg transition-colors"
        style={{ fontFamily: 'var(--font-body)' }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-primary-contrast)'
          }}
        >
          {customer?.full_name?.charAt(0).toUpperCase() || customer?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">
              {customer?.full_name || 'Welcome!'}
            </p>
            <p className="text-xs text-gray-500 truncate">{customer?.email}</p>
          </div>

          {/* Navigation Links */}
          <nav className="py-1">
            <Link
              href={`${baseUrl}/account`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[var(--color-primary)] transition-colors"
            >
              <User className="w-4 h-4" />
              My Account
            </Link>
            <Link
              href={`${baseUrl}/account/orders`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[var(--color-primary)] transition-colors"
            >
              <Package className="w-4 h-4" />
              Orders
            </Link>
            <Link
              href={`${baseUrl}/account/addresses`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[var(--color-primary)] transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Addresses
            </Link>
            <Link
              href={`${baseUrl}/account/wishlist`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[var(--color-primary)] transition-colors"
            >
              <Heart className="w-4 h-4" />
              Wishlist
            </Link>
            <Link
              href={`${baseUrl}/account/settings`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[var(--color-primary)] transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </nav>

          {/* Sign Out */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
