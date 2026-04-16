'use client'

import Link from 'next/link'
import { useStore } from '@/lib/contexts/store-context'

export default function MinimalZenFooter() {
  const { store } = useStore()
  const baseUrl = `/${store.slug}`
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="store-footer border-t" style={{ backgroundColor: 'var(--color-footer-bg)', color: 'var(--color-footer-text)', borderColor: 'color-mix(in srgb, var(--color-footer-text) 20%, transparent)' }}>
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
            <p className="text-sm opacity-70 leading-relaxed">
              {store.blueprint?.ai_content?.about_us?.short_description || store.tagline || 'Quality products, thoughtfully curated.'}
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider opacity-60 mb-4">Navigation</h4>
            <ul className="space-y-3">
              <li><Link href={baseUrl} className="text-sm opacity-70 hover:opacity-100 transition-opacity">Home</Link></li>
              <li><Link href={`${baseUrl}/products`} className="text-sm opacity-70 hover:opacity-100 transition-opacity">Products</Link></li>
              <li><Link href={`${baseUrl}/about`} className="text-sm opacity-70 hover:opacity-100 transition-opacity">About</Link></li>
              <li><Link href={`${baseUrl}/contact`} className="text-sm opacity-70 hover:opacity-100 transition-opacity">Contact</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider opacity-60 mb-4">Contact</h4>
            <ul className="space-y-3 text-sm opacity-70">
              {store.contact_email && <li>{store.contact_email}</li>}
              {store.contact_phone && <li>{store.contact_phone}</li>}
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t" style={{ borderColor: 'color-mix(in srgb, var(--color-footer-text) 20%, transparent)' }}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-xs opacity-60">
              &copy; {currentYear} {store.name}
            </p>
            <div className="flex space-x-6 text-xs opacity-60">
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
