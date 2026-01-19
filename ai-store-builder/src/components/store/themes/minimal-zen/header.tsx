'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'
import MiniCart from '@/components/store/mini-cart'

interface MinimalZenHeaderProps {
  onMenuClick?: () => void
}

export default function MinimalZenHeader({ onMenuClick }: MinimalZenHeaderProps) {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-sm z-40">
      <div className="max-w-[1100px] mx-auto px-8">
        <div className="flex items-center justify-between h-[60px]">
          {/* Left: Menu Toggle + Logo */}
          <div className="flex items-center space-x-4">
            {/* Sidebar Toggle (always visible) */}
            <button
              onClick={onMenuClick}
              className="text-gray-600 hover:text-gray-900 transition-colors"
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
                  className="text-lg font-medium tracking-tight text-gray-900"
                  style={{ fontFamily: 'var(--font-heading)' }}
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
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Home
            </Link>
            <Link
              href={`${baseUrl}/products`}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Products
            </Link>
            <Link
              href={`${baseUrl}/about`}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              About
            </Link>
            <Link
              href={`${baseUrl}/contact`}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-6">
            <MiniCart />
          </div>
        </div>
      </div>
    </header>
  )
}
