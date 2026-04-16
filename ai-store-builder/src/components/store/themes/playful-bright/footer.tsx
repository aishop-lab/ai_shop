'use client'

import Link from 'next/link'
import { Mail, Phone, Instagram, MessageCircle, Heart } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'

export default function PlayfulBrightFooter() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="store-footer" style={{ backgroundColor: 'var(--color-footer-bg)', color: 'var(--color-footer-text)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3
              className="text-2xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {store.name} ✨
            </h3>
            <p className="opacity-80 mb-6">
              {store.blueprint?.ai_content?.about_us?.short_description || store.tagline || `Bringing joy through amazing products!`}
            </p>
            <div className="flex space-x-3">
              {store.instagram_handle && (
                <a
                  href={`https://instagram.com/${store.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white/20 rounded-xl hover:bg-white hover:text-[var(--color-primary)] transition-all"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {store.whatsapp_number && (
                <a
                  href={`https://wa.me/${store.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white/20 rounded-xl hover:bg-green-500 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-bold mb-4 text-lg">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link href={baseUrl} className="opacity-80 hover:opacity-100 transition-opacity">🏠 Home</Link></li>
              <li><Link href={`${baseUrl}/products`} className="opacity-80 hover:opacity-100 transition-opacity">🛍️ Shop</Link></li>
              <li><Link href={`${baseUrl}/about`} className="opacity-80 hover:opacity-100 transition-opacity">💫 About</Link></li>
              <li><Link href={`${baseUrl}/contact`} className="opacity-80 hover:opacity-100 transition-opacity">📧 Contact</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="font-bold mb-4 text-lg">Say Hello!</h4>
            <ul className="space-y-3">
              {store.contact_email && (
                <li>
                  <a href={`mailto:${store.contact_email}`} className="flex items-center space-x-2 opacity-80 hover:opacity-100">
                    <Mail className="w-4 h-4" />
                    <span>{store.contact_email}</span>
                  </a>
                </li>
              )}
              {store.contact_phone && (
                <li>
                  <a href={`tel:${store.contact_phone}`} className="flex items-center space-x-2 opacity-80 hover:opacity-100">
                    <Phone className="w-4 h-4" />
                    <span>{store.contact_phone}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t" style={{ borderColor: 'color-mix(in srgb, var(--color-footer-text) 20%, transparent)' }}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="flex items-center opacity-60 text-sm">
              Made with <Heart className="w-4 h-4 mx-1 text-red-400 fill-current" /> by {store.name} &copy; {currentYear}
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
