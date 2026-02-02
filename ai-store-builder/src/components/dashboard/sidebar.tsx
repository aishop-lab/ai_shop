'use client'

import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  Home,
  Package,
  ShoppingCart,
  ShoppingBasket,
  BarChart3,
  Globe,
  Settings,
  X,
  Plus,
  ExternalLink,
  Store as StoreIcon,
  Ticket,
  RotateCcw,
  MessageSquare,
  Megaphone,
  Folder,
  FileSpreadsheet,
  PackageX,
} from 'lucide-react'
import { UserDropdown } from './user-dropdown'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { NavSection } from './nav-section'

interface StoreInfo {
  id: string
  name: string
  slug: string
  status: string
  logo_url: string | null
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  store?: StoreInfo | null
}

export function Sidebar({ isOpen, onClose, store }: SidebarProps) {
  const isLive = store?.status === 'active'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card border-r transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Store Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          {store ? (
            <>
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-lg object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
                  {store.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">{store.name}</h2>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs',
                    isLive ? 'text-green-600' : 'text-yellow-600'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isLive ? 'bg-green-500' : 'bg-yellow-500'
                    )}
                  />
                  {isLive ? 'Live' : 'Draft'}
                </span>
              </div>
            </>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2">
              <StoreIcon className="h-6 w-6 text-primary" />
              <span className="font-bold">AI Store</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-auto h-8 w-8"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Home */}
          <NavSection
            label="Home"
            icon={Home}
            href="/dashboard"
            onNavigate={onClose}
          />

          {/* Products (collapsible) */}
          <NavSection
            label="Products"
            icon={Package}
            storageKey="products"
            defaultExpanded={true}
            items={[
              { label: 'All Products', href: '/dashboard/products' },
              { label: 'Add Product', href: '/dashboard/products/new', icon: Plus },
              { label: 'Collections', href: '/dashboard/collections', icon: Folder },
            ]}
            onNavigate={onClose}
          />

          {/* Orders */}
          <NavSection
            label="Orders"
            icon={ShoppingCart}
            href="/dashboard/orders"
            onNavigate={onClose}
          />

          {/* Abandoned Carts */}
          <NavSection
            label="Abandoned Carts"
            icon={ShoppingBasket}
            href="/dashboard/abandoned-carts"
            onNavigate={onClose}
          />

          {/* Coupons */}
          <NavSection
            label="Coupons"
            icon={Ticket}
            href="/dashboard/coupons"
            onNavigate={onClose}
          />

          {/* Reviews */}
          <NavSection
            label="Reviews"
            icon={MessageSquare}
            href="/dashboard/reviews"
            onNavigate={onClose}
          />

          {/* Refunds */}
          <NavSection
            label="Refunds"
            icon={RotateCcw}
            href="/dashboard/refunds"
            onNavigate={onClose}
          />

          {/* Returns / RTO */}
          <NavSection
            label="Returns & RTO"
            icon={PackageX}
            href="/dashboard/returns"
            onNavigate={onClose}
          />

          {/* Analytics */}
          <NavSection
            label="Analytics"
            icon={BarChart3}
            href="/dashboard/analytics"
            onNavigate={onClose}
          />

          {/* Reports */}
          <NavSection
            label="Reports"
            icon={FileSpreadsheet}
            href="/dashboard/reports"
            onNavigate={onClose}
          />

          {/* Marketing */}
          <NavSection
            label="Marketing"
            icon={Megaphone}
            href="/dashboard/settings/marketing"
            onNavigate={onClose}
          />

          {/* Online Store (collapsible) */}
          {store && (
            <NavSection
              label="Online Store"
              icon={Globe}
              storageKey="online-store"
              defaultExpanded={false}
              items={[
                {
                  label: 'View Store',
                  href: `/${store.slug}`,
                  icon: ExternalLink,
                  external: true
                },
              ]}
              onNavigate={onClose}
            />
          )}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto border-t">
          {/* Settings */}
          <div className="px-3 py-2">
            <NavSection
              label="Settings"
              icon={Settings}
              href="/dashboard/settings"
              onNavigate={onClose}
            />
          </div>

          <Separator />

          {/* User section */}
          <div className="p-3">
            <UserDropdown />
          </div>
        </div>
      </aside>
    </>
  )
}
