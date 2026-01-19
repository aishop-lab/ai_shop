'use client'

import Link from 'next/link'
import Image from 'next/image'
import { X, Home, Package, Tag, ChevronDown, ChevronRight, ShoppingBag, Heart, HelpCircle, Phone, Truck, MessageCircle, Instagram, Facebook } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/lib/contexts/store-context'
import { useSidebar } from '@/lib/contexts/sidebar-context'

export default function StoreSidebar() {
  const { isOpen, close } = useSidebar()
  const { store, categories } = useStore()
  const [categoriesExpanded, setCategoriesExpanded] = useState(true)

  const baseUrl = `/${store.slug}`

  // Get social links from store contact info
  const whatsappNumber = store.whatsapp_number || store.contact_phone
  const instagramHandle = store.instagram_handle
  const facebookUrl = store.facebook_url

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-white z-50
          transform transition-transform duration-300 ease-in-out
          shadow-xl overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Store navigation"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between">
          <Link href={baseUrl} className="flex items-center space-x-3" onClick={close}>
            {store.logo_url ? (
              <Image
                src={store.logo_url}
                alt={store.name}
                width={32}
                height={32}
                className="object-contain"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {store.name.charAt(0)}
              </div>
            )}
            <span
              className="font-semibold text-gray-900 truncate"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {store.name}
            </span>
          </Link>

          <button
            onClick={close}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          {/* Shop Section */}
          <div className="mb-6">
            <h3
              className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Shop
            </h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href={baseUrl}
                  onClick={close}
                  className="flex items-center space-x-3 px-2 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-[var(--color-primary)] transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span style={{ fontFamily: 'var(--font-body)' }}>Home</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`${baseUrl}/products`}
                  onClick={close}
                  className="flex items-center space-x-3 px-2 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-[var(--color-primary)] transition-colors"
                >
                  <Package className="w-5 h-5" />
                  <span style={{ fontFamily: 'var(--font-body)' }}>All Products</span>
                </Link>
              </li>

              {/* Categories (collapsible) */}
              {categories.length > 0 && (
                <li>
                  <button
                    onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                    className="w-full flex items-center justify-between px-2 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Tag className="w-5 h-5" />
                      <span style={{ fontFamily: 'var(--font-body)' }}>Categories</span>
                    </div>
                    {categoriesExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {categoriesExpanded && (
                    <ul className="ml-7 mt-1 space-y-1 border-l border-gray-200 pl-3">
                      {categories.slice(0, 8).map((category) => (
                        <li key={category}>
                          <Link
                            href={`${baseUrl}/products?category=${encodeURIComponent(category)}`}
                            onClick={close}
                            className="block px-2 py-2 text-sm text-gray-600 hover:text-[var(--color-primary)] transition-colors"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {category}
                          </Link>
                        </li>
                      ))}
                      {categories.length > 8 && (
                        <li>
                          <Link
                            href={`${baseUrl}/products`}
                            onClick={close}
                            className="block px-2 py-2 text-sm text-[var(--color-primary)] font-medium"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            View all ({categories.length})
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              )}
            </ul>
          </div>

          {/* Account Section */}
          <div className="mb-6">
            <h3
              className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Account
            </h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href={`${baseUrl}/orders`}
                  onClick={close}
                  className="flex items-center space-x-3 px-2 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-[var(--color-primary)] transition-colors"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span style={{ fontFamily: 'var(--font-body)' }}>My Orders</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`${baseUrl}/cart`}
                  onClick={close}
                  className="flex items-center space-x-3 px-2 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-[var(--color-primary)] transition-colors"
                >
                  <Heart className="w-5 h-5" />
                  <span style={{ fontFamily: 'var(--font-body)' }}>Wishlist</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Help Section */}
          <div className="mb-6">
            <h3
              className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Help
            </h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href={`${baseUrl}/contact`}
                  onClick={close}
                  className="flex items-center space-x-3 px-2 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-[var(--color-primary)] transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  <span style={{ fontFamily: 'var(--font-body)' }}>Contact Us</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`${baseUrl}/about`}
                  onClick={close}
                  className="flex items-center space-x-3 px-2 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-[var(--color-primary)] transition-colors"
                >
                  <Truck className="w-5 h-5" />
                  <span style={{ fontFamily: 'var(--font-body)' }}>Shipping & Returns</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`${baseUrl}/about`}
                  onClick={close}
                  className="flex items-center space-x-3 px-2 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-[var(--color-primary)] transition-colors"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span style={{ fontFamily: 'var(--font-body)' }}>FAQ</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          {(whatsappNumber || instagramHandle || facebookUrl) && (
            <div className="border-t pt-4">
              <h3
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Connect With Us
              </h3>
              <div className="flex items-center space-x-3 px-2">
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-600 transition-colors"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
                {instagramHandle && (
                  <a
                    href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-gray-100 hover:bg-pink-100 text-gray-600 hover:text-pink-600 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl.startsWith('http') ? facebookUrl : `https://facebook.com/${facebookUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  )
}
