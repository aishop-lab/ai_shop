'use client'

import Link from 'next/link'
import { Mail, Phone, Instagram, MessageCircle } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'

export default function ClassicElegantFooter() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="store-footer border-t" style={{ backgroundColor: 'var(--color-footer-bg)', color: 'var(--color-footer-text)', borderColor: 'color-mix(in srgb, var(--color-footer-text) 20%, transparent)' }}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 
              className="text-3xl font-serif mb-4 tracking-wide"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {store.name}
            </h3>
            <p className="opacity-70 mb-6 leading-relaxed max-w-md">
              {store.blueprint?.ai_content?.about_us?.short_description || store.tagline || `Experience timeless elegance with our curated collection.`}
            </p>
            <div className="flex space-x-4">
              {store.instagram_handle && (
                <a
                  href={`https://instagram.com/${store.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border rounded-full opacity-70 hover:opacity-100 transition-all"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-footer-text) 30%, transparent)' }}
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {store.whatsapp_number && (
                <a
                  href={`https://wa.me/${store.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border rounded-full opacity-70 hover:opacity-100 hover:text-green-600 transition-all"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-footer-text) 30%, transparent)' }}
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-6 uppercase tracking-widest text-sm">Explore</h4>
            <ul className="space-y-4">
              <li><Link href={baseUrl} className="opacity-70 hover:opacity-100 transition-opacity">Home</Link></li>
              <li><Link href={`${baseUrl}/products`} className="opacity-70 hover:opacity-100 transition-opacity">Collection</Link></li>
              <li><Link href={`${baseUrl}/about`} className="opacity-70 hover:opacity-100 transition-opacity">Our Story</Link></li>
              <li><Link href={`${baseUrl}/contact`} className="opacity-70 hover:opacity-100 transition-opacity">Contact</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-6 uppercase tracking-widest text-sm">Get in Touch</h4>
            <ul className="space-y-4">
              {store.contact_email && (
                <li>
                  <a href={`mailto:${store.contact_email}`} className="flex items-center space-x-3 opacity-70 hover:opacity-100 transition-opacity">
                    <Mail className="w-4 h-4" />
                    <span>{store.contact_email}</span>
                  </a>
                </li>
              )}
              {store.contact_phone && (
                <li>
                  <a href={`tel:${store.contact_phone}`} className="flex items-center space-x-3 opacity-70 hover:opacity-100 transition-opacity">
                    <Phone className="w-4 h-4" />
                    <span>{store.contact_phone}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t" style={{ borderColor: 'color-mix(in srgb, var(--color-footer-text) 20%, transparent)' }}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="opacity-60 text-sm">
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
      </div>
    </footer>
  )
}
