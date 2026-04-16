'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu, Search } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/contexts/store-context'
import MiniCart from '@/components/store/mini-cart'
import AccountDropdown from '@/components/store/account-dropdown'

interface MinimalZenHeaderProps {
  onMenuClick?: () => void
}

export default function MinimalZenHeader({ onMenuClick }: MinimalZenHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const { store } = useStore()
  const baseUrl = `/${store.slug}`

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      router.push(`${baseUrl}/search?q=${encodeURIComponent(trimmed)}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <header className="store-header sticky top-0 backdrop-blur-sm z-40" style={{ backgroundColor: 'var(--color-header-bg)', color: 'var(--color-header-text)' }}>
      <div className="max-w-[1100px] mx-auto px-8">
        <div className="flex items-center justify-between h-[60px]">
          {/* Left: Menu Toggle + Logo */}
          <div className="flex items-center space-x-4">
            {/* Sidebar Toggle (always visible) */}
            <button
              onClick={onMenuClick}
              className="hover:text-[var(--color-primary)] transition-colors"
              style={{ color: 'var(--color-header-text)' }}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link href={baseUrl} className="flex items-center">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              ) : (
                <span
                  className="text-lg font-medium tracking-tight"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-header-text)' }}
                >
                  {store.name}
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-12">
            <Link
              href={baseUrl}
              className="text-sm hover:text-[var(--color-primary)] transition-colors"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-header-text)' }}
            >
              Home
            </Link>
            <Link
              href={`${baseUrl}/products`}
              className="text-sm hover:text-[var(--color-primary)] transition-colors"
              style={{ color: 'var(--color-header-text)' }}
            >
              Products
            </Link>
            <Link
              href={`${baseUrl}/about`}
              className="text-sm hover:text-[var(--color-primary)] transition-colors"
              style={{ color: 'var(--color-header-text)' }}
            >
              About
            </Link>
            <Link
              href={`${baseUrl}/contact`}
              className="text-sm hover:text-[var(--color-primary)] transition-colors"
              style={{ color: 'var(--color-header-text)' }}
            >
              Contact
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="hover:text-[var(--color-primary)] transition-colors"
              style={{ color: 'var(--color-header-text)' }}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <AccountDropdown />
            <MiniCart />
          </div>
        </div>

        {/* Search Bar (expandable) */}
        {searchOpen && (
          <div className="py-4 border-t border-gray-100">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </form>
          </div>
        )}
      </div>
    </header>
  )
}
