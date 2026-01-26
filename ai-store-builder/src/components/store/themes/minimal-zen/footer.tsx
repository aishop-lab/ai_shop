'use client'

import Link from 'next/link'
import { useStore } from '@/lib/contexts/store-context'

export default function MinimalZenFooter() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t border-gray-100">
      <div className="max-w-[1100px] mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <h3 
              className="text-base font-medium mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {store.name}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {store.blueprint?.ai_content?.about_us?.short_description || store.tagline || 'Quality products, thoughtfully curated.'}
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">Navigation</h4>
            <ul className="space-y-3">
              <li><Link href={baseUrl} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Home</Link></li>
              <li><Link href={`${baseUrl}/products`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Products</Link></li>
              <li><Link href={`${baseUrl}/about`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">About</Link></li>
              <li><Link href={`${baseUrl}/contact`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              {store.contact_email && <li>{store.contact_email}</li>}
              {store.contact_phone && <li>+91 {store.contact_phone}</li>}
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            &copy; {currentYear} {store.name}
          </p>
        </div>
      </div>
    </footer>
  )
}
