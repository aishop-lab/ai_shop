'use client'

import Link from 'next/link'
import { Mail, Phone, Instagram, MessageCircle } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'

export default function ModernMinimalFooter() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="store-footer"
      style={{
        backgroundColor: 'var(--color-footer-bg)',
        color: 'var(--color-footer-text)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3
              className="text-2xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {store.name}
            </h3>
            <p
              className="mb-6 max-w-md opacity-70"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {store.blueprint?.ai_content?.about_us?.short_description || store.tagline || `Welcome to ${store.name}. Quality products delivered with care.`}
            </p>

            {/* Social Links */}
            <div className="flex space-x-4">
              {store.instagram_handle && (
                <a
                  href={`https://instagram.com/${store.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-[var(--color-primary)] transition-colors opacity-80 hover:opacity-100"
                  style={{ backgroundColor: 'var(--color-footer-text)', color: 'var(--color-footer-bg)' }}
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" style={{ color: 'inherit' }} />
                </a>
              )}
              {store.whatsapp_number && (
                <a
                  href={`https://wa.me/${store.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-green-600 transition-colors opacity-80 hover:opacity-100"
                  style={{ backgroundColor: 'var(--color-footer-text)', color: 'var(--color-footer-bg)' }}
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" style={{ color: 'inherit' }} />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link href={baseUrl} className="opacity-70 hover:opacity-100 transition-opacity">
                  Home
                </Link>
              </li>
              <li>
                <Link href={`${baseUrl}/products`} className="opacity-70 hover:opacity-100 transition-opacity">
                  Products
                </Link>
              </li>
              <li>
                <Link href={`${baseUrl}/about`} className="opacity-70 hover:opacity-100 transition-opacity">
                  About Us
                </Link>
              </li>
              <li>
                <Link href={`${baseUrl}/contact`} className="opacity-70 hover:opacity-100 transition-opacity">
                  Contact
                </Link>
              </li>
              <li>
                <Link href={`${baseUrl}/cart`} className="opacity-70 hover:opacity-100 transition-opacity">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              {store.contact_email && (
                <li>
                  <a
                    href={`mailto:${store.contact_email}`}
                    className="flex items-center space-x-2 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{store.contact_email}</span>
                  </a>
                </li>
              )}
              {store.contact_phone && (
                <li>
                  <a
                    href={`tel:${store.contact_phone}`}
                    className="flex items-center space-x-2 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{store.contact_phone}</span>
                  </a>
                </li>
              )}
              {store.whatsapp_number && (
                <li>
                  <a
                    href={`https://wa.me/${store.whatsapp_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <MessageCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">WhatsApp Us</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--color-footer-text)', borderTopWidth: '1px', opacity: 0.2 }}>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 pt-4">
          <p className="text-sm opacity-60">
            &copy; {currentYear} {store.name}. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm opacity-60">
            <Link href={`${baseUrl}/policies/shipping`} className="hover:opacity-100 transition-opacity">
              Shipping
            </Link>
            <Link href={`${baseUrl}/policies/returns`} className="hover:opacity-100 transition-opacity">
              Returns
            </Link>
            <Link href={`${baseUrl}/policies/privacy`} className="hover:opacity-100 transition-opacity">
              Privacy
            </Link>
            <Link href={`${baseUrl}/policies/terms`} className="hover:opacity-100 transition-opacity">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
