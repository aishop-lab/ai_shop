'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2,
  AlertCircle,
  Package,
  Bot,
  CreditCard,
  Truck,
  Palette,
  ArrowRight,
} from 'lucide-react'

interface HealthCheck {
  id: string
  label: string
  status: 'good' | 'warning' | 'critical'
  message: string
  icon: React.ReactNode
  href: string
}

interface StoreHealthProps {
  storeId: string | null
}

export function StoreHealth({ storeId }: StoreHealthProps) {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!storeId) return

    async function runChecks() {
      try {
        const supabase = createClient()
        const results: HealthCheck[] = []

        // Run all checks in parallel
        const [productsRes, agentsRes, storeRes] = await Promise.all([
          supabase
            .from('products')
            .select('id, status, inventory, description, product_images(id)')
            .eq('store_id', storeId),
          supabase
            .from('agent_states')
            .select('agent_type, is_enabled')
            .eq('store_id', storeId),
          supabase
            .from('stores')
            .select('logo_url, contact_email, brand_colors, settings')
            .eq('id', storeId)
            .single(),
        ])

        // 1. Product catalog check
        const products = productsRes.data ?? []
        const activeProducts = products.filter((p) => p.status === 'active')
        const productsWithImages = products.filter((p) => (p.product_images?.length ?? 0) > 0)
        const productsWithDesc = products.filter((p) => p.description && p.description.length > 20)

        if (products.length === 0) {
          results.push({
            id: 'products',
            label: 'Products',
            status: 'critical',
            message: 'No products added yet',
            icon: <Package className="h-4 w-4" />,
            href: '/platform/products/new',
          })
        } else if (productsWithImages.length < products.length * 0.5) {
          results.push({
            id: 'products',
            label: 'Products',
            status: 'warning',
            message: `${products.length - productsWithImages.length} products missing images`,
            icon: <Package className="h-4 w-4" />,
            href: '/platform/products',
          })
        } else if (productsWithDesc.length < products.length * 0.5) {
          results.push({
            id: 'products',
            label: 'Products',
            status: 'warning',
            message: `${products.length - productsWithDesc.length} products need descriptions`,
            icon: <Package className="h-4 w-4" />,
            href: '/platform/products',
          })
        } else {
          results.push({
            id: 'products',
            label: 'Products',
            status: 'good',
            message: `${activeProducts.length} active, ${productsWithImages.length} with images`,
            icon: <Package className="h-4 w-4" />,
            href: '/platform/products',
          })
        }

        // 2. Agent setup check
        const agents = agentsRes.data ?? []
        const enabledAgents = agents.filter((a) => a.is_enabled)
        if (agents.length === 0) {
          results.push({
            id: 'agents',
            label: 'AI Agents',
            status: 'critical',
            message: 'Agents not initialized',
            icon: <Bot className="h-4 w-4" />,
            href: '/platform/settings/agents',
          })
        } else if (enabledAgents.length === 0) {
          results.push({
            id: 'agents',
            label: 'AI Agents',
            status: 'warning',
            message: 'No agents enabled — enable at least one',
            icon: <Bot className="h-4 w-4" />,
            href: '/platform/settings/agents',
          })
        } else {
          results.push({
            id: 'agents',
            label: 'AI Agents',
            status: 'good',
            message: `${enabledAgents.length} of ${agents.length} enabled`,
            icon: <Bot className="h-4 w-4" />,
            href: '/platform/settings/agents',
          })
        }

        // 3. Payment config check
        const store = storeRes.data
        const paymentsConfigured =
          store?.settings?.payments?.razorpay_enabled || store?.settings?.payments?.stripe_enabled
        results.push({
          id: 'payments',
          label: 'Payments',
          status: paymentsConfigured ? 'good' : 'warning',
          message: paymentsConfigured ? 'Payment gateway configured' : 'No payment gateway configured',
          icon: <CreditCard className="h-4 w-4" />,
          href: '/platform/settings/payments',
        })

        // 4. Branding check
        const hasLogo = !!store?.logo_url
        const hasColors = !!store?.brand_colors?.primary
        const hasContact = !!store?.contact_email
        const brandingScore = [hasLogo, hasColors, hasContact].filter(Boolean).length
        results.push({
          id: 'branding',
          label: 'Branding',
          status: brandingScore >= 3 ? 'good' : brandingScore >= 1 ? 'warning' : 'critical',
          message:
            brandingScore >= 3
              ? 'Logo, colors, and contact set'
              : `Missing: ${[!hasLogo && 'logo', !hasColors && 'brand colors', !hasContact && 'contact email'].filter(Boolean).join(', ')}`,
          icon: <Palette className="h-4 w-4" />,
          href: '/platform/settings/store',
        })

        setChecks(results)
      } catch {
        // Non-critical
      } finally {
        setLoading(false)
      }
    }

    runChecks()
  }, [storeId])

  if (loading || checks.length === 0) return null

  const score = Math.round(
    (checks.filter((c) => c.status === 'good').length / checks.length) * 100
  )

  const STATUS_STYLES = {
    good: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />, text: 'text-green-400' },
    warning: { icon: <AlertCircle className="h-3.5 w-3.5 text-amber-400" />, text: 'text-amber-400' },
    critical: { icon: <AlertCircle className="h-3.5 w-3.5 text-red-400" />, text: 'text-red-400' },
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
          Store Health
        </h2>
        <span
          className={cn(
            'font-mono text-xs font-semibold',
            score >= 75 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
          )}
        >
          {score}%
        </span>
      </div>

      <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] divide-y divide-[var(--platform-border)]">
        {checks.map((check) => {
          const styles = STATUS_STYLES[check.status]
          return (
            <Link
              key={check.id}
              href={check.href}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--platform-surface-hover)]"
            >
              <div className="text-[var(--platform-text-muted)]">{check.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                  {check.label}
                </p>
                <p className={cn('text-[10px]', styles.text)}>
                  {check.message}
                </p>
              </div>
              {styles.icon}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
