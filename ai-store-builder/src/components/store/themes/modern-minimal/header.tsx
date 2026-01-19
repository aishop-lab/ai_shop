'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu, Search } from 'lucide-react'
import { useState } from 'react'
import { useStore, useIsHydrated } from '@/lib/contexts/store-context'
import MiniCart from '@/components/store/mini-cart'

interface ModernMinimalHeaderProps {
  onMenuClick?: () => void
}

export default function ModernMinimalHeader({ onMenuClick }: ModernMinimalHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { store } = useStore()
  useIsHydrated()
  const baseUrl = `/${store.slug}`

  return (
    <header className="border-b sticky top-0 bg-white z-40">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Menu Toggle + Logo */}
          <div className="flex items-center space-x-3">
            {/* Sidebar Toggle (always visible) */}
            <button
              onClick={onMenuClick}
              className="p-2 text-gray-700 hover:text-[var(--color-primary)] hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo */}
            <Link href={baseUrl} className="flex items-center space-x-3">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={40}
                  height={40}
                  className="object-contain"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {store.name.charAt(0)}
                </div>
              )}
              <span
                className="text-xl md:text-2xl font-bold text-gray-900 hidden sm:block"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {store.name}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              href={baseUrl}
              className="text-gray-700 hover:text-[var(--color-primary)] transition-colors font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Home
            </Link>
            <Link
              href={`${baseUrl}/products`}
              className="text-gray-700 hover:text-[var(--color-primary)] transition-colors font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Products
            </Link>
            <Link
              href={`${baseUrl}/about`}
              className="text-gray-700 hover:text-[var(--color-primary)] transition-colors font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              About
            </Link>
            <Link
              href={`${baseUrl}/contact`}
              className="text-gray-700 hover:text-[var(--color-primary)] transition-colors font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Contact
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-gray-700 hover:text-[var(--color-primary)] hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Cart */}
            <MiniCart />
          </div>
        </div>

        {/* Search Bar (expandable) */}
        {searchOpen && (
          <div className="py-4 border-t">
            <div className="relative">
              <input
                type="search"
                placeholder="Search products..."
                className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
