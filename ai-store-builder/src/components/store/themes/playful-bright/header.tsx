'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu, Sparkles, Search } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/contexts/store-context'
import MiniCart from '@/components/store/mini-cart'
import AccountDropdown from '@/components/store/account-dropdown'

interface PlayfulBrightHeaderProps {
  onMenuClick?: () => void
}

export default function PlayfulBrightHeader({ onMenuClick }: PlayfulBrightHeaderProps) {
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
    <header className="store-header sticky top-0 z-40 shadow-sm" style={{ backgroundColor: 'var(--color-header-bg)', color: 'var(--color-header-text)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[70px]">
          {/* Left: Menu Toggle + Logo */}
          <div className="flex items-center space-x-3">
            {/* Sidebar Toggle (always visible) */}
            <button
              onClick={onMenuClick}
              className="p-3 rounded-xl bg-gray-100 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-colors"
              style={{ color: 'var(--color-header-text)' }}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link href={baseUrl} className="flex items-center space-x-3">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={45}
                  height={45}
                  className="object-contain"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg rotate-3"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-contrast)' }}
                >
                  <Sparkles className="w-6 h-6" />
                </div>
              )}
              <span
                className="text-xl md:text-2xl font-bold hidden sm:block"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-header-text)' }}
              >
                {store.name}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {[
              { href: baseUrl, label: 'Home' },
              { href: `${baseUrl}/products`, label: 'Shop' },
              { href: `${baseUrl}/about`, label: 'About' },
              { href: `${baseUrl}/contact`, label: 'Contact' }
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-xl hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-all font-medium"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-header-text)' }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-3 rounded-xl bg-gray-100 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-colors"
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
          <div className="py-4 border-t">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full px-4 py-2 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
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
