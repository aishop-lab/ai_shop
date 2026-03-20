// src/app/(platform)/platform/settings/page.tsx
'use client'

import Link from 'next/link'
import { ArrowRight, Bot, Link2, Store, Bell, CreditCard, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingCard {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  external?: boolean
}

const SETTING_CARDS: SettingCard[] = [
  {
    title: 'Agent Configuration',
    description: 'Configure agent autonomy levels, behavior, and preferences',
    icon: <Bot className="h-5 w-5" />,
    href: '/platform/settings/agents',
  },
  {
    title: 'Connected Accounts',
    description: 'Connect Meta, Google Ads, Google Analytics, and other services',
    icon: <Link2 className="h-5 w-5" />,
    href: '/platform/settings/connections',
  },
  {
    title: 'Store Settings',
    description: 'Store name, branding, policies, and checkout configuration',
    icon: <Store className="h-5 w-5" />,
    href: '/dashboard/settings',
    external: true,
  },
  {
    title: 'Notifications',
    description: 'Email, WhatsApp, and push notification preferences',
    icon: <Bell className="h-5 w-5" />,
    href: '/dashboard/settings/notifications',
    external: true,
  },
  {
    title: 'Payments',
    description: 'Razorpay, Stripe, and payment gateway configuration',
    icon: <CreditCard className="h-5 w-5" />,
    href: '/dashboard/settings/payments',
    external: true,
  },
  {
    title: 'Shipping',
    description: 'Shipping providers and delivery configuration',
    icon: <Truck className="h-5 w-5" />,
    href: '/dashboard/settings/shipping-providers',
    external: true,
  },
]

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
          Manage your platform configuration and integrations
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        {SETTING_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={cn(
              'group flex items-start gap-4 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5',
              'transition-colors hover:border-[var(--platform-border-hover)] hover:bg-[var(--platform-surface-hover)]'
            )}
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] text-[var(--platform-text-secondary)] transition-colors group-hover:text-[var(--platform-text-primary)]">
              {card.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--platform-text-primary)]">
                {card.title}
              </p>
              <p className="mt-0.5 text-xs text-[var(--platform-text-muted)]">
                {card.description}
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--platform-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--platform-text-secondary)]" />
          </Link>
        ))}
      </div>
    </div>
  )
}
