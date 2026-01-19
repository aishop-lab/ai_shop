'use client'

import Link from 'next/link'
import { Mail, Phone, Instagram, MessageCircle } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'

export default function ClassicElegantFooter() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-gray-100 border-t border-gray-200">
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
            <p className="text-gray-600 mb-6 leading-relaxed max-w-md">
              {store.description || `Experience timeless elegance with our curated collection.`}
            </p>
            <div className="flex space-x-4">
              {store.instagram_handle && (
                <a
                  href={`https://instagram.com/${store.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border border-gray-300 rounded-full hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {store.whatsapp_number && (
                <a
                  href={`https://wa.me/91${store.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border border-gray-300 rounded-full hover:border-green-600 hover:text-green-600 transition-colors"
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
              <li><Link href={baseUrl} className="text-gray-600 hover:text-[var(--color-primary)] transition-colors">Home</Link></li>
              <li><Link href={`${baseUrl}/products`} className="text-gray-600 hover:text-[var(--color-primary)] transition-colors">Collection</Link></li>
              <li><Link href={`${baseUrl}/about`} className="text-gray-600 hover:text-[var(--color-primary)] transition-colors">Our Story</Link></li>
              <li><Link href={`${baseUrl}/contact`} className="text-gray-600 hover:text-[var(--color-primary)] transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-6 uppercase tracking-widest text-sm">Get in Touch</h4>
            <ul className="space-y-4">
              {store.contact_email && (
                <li>
                  <a href={`mailto:${store.contact_email}`} className="flex items-center space-x-3 text-gray-600 hover:text-[var(--color-primary)]">
                    <Mail className="w-4 h-4" />
                    <span>{store.contact_email}</span>
                  </a>
                </li>
              )}
              {store.contact_phone && (
                <li>
                  <a href={`tel:${store.contact_phone}`} className="flex items-center space-x-3 text-gray-600 hover:text-[var(--color-primary)]">
                    <Phone className="w-4 h-4" />
                    <span>+91 {store.contact_phone}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>&copy; {currentYear} {store.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
