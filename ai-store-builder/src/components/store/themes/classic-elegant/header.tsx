'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu, Search } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'
import MiniCart from '@/components/store/mini-cart'

interface ClassicElegantHeaderProps {
  onMenuClick?: () => void
}

export default function ClassicElegantHeader({ onMenuClick }: ClassicElegantHeaderProps) {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`

  return (
    <header className="border-b border-gray-200 sticky top-0 bg-white z-40">
      {/* Top bar */}
      <div className="bg-gray-900 text-white text-center py-2 text-sm tracking-wide">
        Free shipping on orders over ₹999
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-[100px]">
          {/* Left: Menu Toggle + Logo */}
          <div className="flex items-center space-x-4">
            {/* Sidebar Toggle (always visible) */}
            <button
              onClick={onMenuClick}
              className="p-2 text-gray-700 hover:text-[var(--color-primary)] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo */}
            <Link href={baseUrl} className="flex items-center space-x-4">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={50}
                  height={50}
                  className="object-contain"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-serif text-xl"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-contrast)' }}
                >
                  {store.name.charAt(0)}
                </div>
              )}
              <div className="flex flex-col hidden sm:flex">
                <span
                  className="text-2xl font-serif tracking-wide text-gray-900"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {store.name}
                </span>
                {store.tagline && (
                  <span className="text-xs text-gray-500 tracking-widest uppercase">
                    {store.tagline}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-10">
            <Link
              href={baseUrl}
              className="text-gray-700 hover:text-[var(--color-primary)] transition-colors tracking-wide font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Home
            </Link>
            <Link
              href={`${baseUrl}/products`}
              className="text-gray-700 hover:text-[var(--color-primary)] transition-colors tracking-wide font-medium"
            >
              Collection
            </Link>
            <Link
              href={`${baseUrl}/about`}
              className="text-gray-700 hover:text-[var(--color-primary)] transition-colors tracking-wide font-medium"
            >
              Our Story
            </Link>
            <Link
              href={`${baseUrl}/contact`}
              className="text-gray-700 hover:text-[var(--color-primary)] transition-colors tracking-wide font-medium"
            >
              Contact
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-5">
            <button className="p-2 text-gray-700 hover:text-[var(--color-primary)] transition-colors">
              <Search className="w-5 h-5" />
            </button>

            <MiniCart />
          </div>
        </div>
      </div>
    </header>
  )
}
