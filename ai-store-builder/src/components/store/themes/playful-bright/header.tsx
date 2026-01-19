'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu, Sparkles } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'
import MiniCart from '@/components/store/mini-cart'

interface PlayfulBrightHeaderProps {
  onMenuClick?: () => void
}

export default function PlayfulBrightHeader({ onMenuClick }: PlayfulBrightHeaderProps) {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`

  return (
    <header className="sticky top-0 bg-white z-40 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[70px]">
          {/* Left: Menu Toggle + Logo */}
          <div className="flex items-center space-x-3">
            {/* Sidebar Toggle (always visible) */}
            <button
              onClick={onMenuClick}
              className="p-3 rounded-xl bg-gray-100 hover:bg-[var(--color-primary-light)] text-gray-700 hover:text-[var(--color-primary)] transition-colors"
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
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg rotate-3"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Sparkles className="w-6 h-6" />
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
          <nav className="hidden lg:flex items-center space-x-1">
            {[
              { href: baseUrl, label: 'Home' },
              { href: `${baseUrl}/products`, label: 'Shop' },
              { href: `${baseUrl}/about`, label: 'About' },
              { href: `${baseUrl}/contact`, label: 'Contact' }
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-xl text-gray-700 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-all font-medium"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            <MiniCart />
          </div>
        </div>
      </div>
    </header>
  )
}
