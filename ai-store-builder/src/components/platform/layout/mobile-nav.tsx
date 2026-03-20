'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShieldCheck, Package, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  pendingApprovals?: number
}

const tabs = [
  { href: '/platform', icon: Home, label: 'Home' },
  { href: '/platform/approvals', icon: ShieldCheck, label: 'Approvals', showBadge: true },
  { href: '/platform/products', icon: Package, label: 'Products' },
  { href: '/platform/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/platform/settings', icon: Settings, label: 'Settings' },
] as const

export function MobileNav({ pendingApprovals = 0 }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--platform-border)] bg-[var(--platform-surface)] lg:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ href, icon: Icon, label, ...rest }) => {
          const showBadge = 'showBadge' in rest ? rest.showBadge : false
          const isActive = pathname === href || (href !== '/platform' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px]',
                isActive ? 'text-[var(--platform-accent)]' : 'text-[var(--platform-text-muted)]'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {showBadge && pendingApprovals > 0 && (
                <span className="absolute -right-1 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-black">
                  {pendingApprovals > 9 ? '9+' : pendingApprovals}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
