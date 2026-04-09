'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Percent,
  DollarSign,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { useStoreCurrency } from '@/lib/hooks/use-store-currency'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DiscountType = 'percentage' | 'fixed'

interface FormData {
  code: string
  description: string
  discount_type: DiscountType
  discount_value: string
  minimum_order_value: string
  maximum_discount_amount: string
  usage_limit: string
  usage_limit_per_customer: string
  starts_at: string
  expires_at: string
  is_active: boolean
}

interface PageProps {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// Toast component (auto-dismiss, fixed bottom center)
// ---------------------------------------------------------------------------

interface ToastState {
  message: string
  type: 'success' | 'error'
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg',
          toast.type === 'success'
            ? 'border-green-500/20 bg-green-500/10 text-green-400'
            : 'border-red-500/20 bg-red-500/10 text-red-400',
        )}
      >
        <span>{toast.message}</span>
        <button
          onClick={onDismiss}
          className="ml-2 text-current opacity-60 hover:opacity-100 transition-opacity"
        >
          x
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  couponCode,
  deleting,
  onConfirm,
  onCancel,
}: {
  couponCode: string
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-[var(--platform-text-primary)]">
          Delete Coupon
        </h3>
        <p className="mt-2 text-xs text-[var(--platform-text-secondary)]">
          Are you sure you want to delete{' '}
          <span className="font-mono font-semibold text-[var(--platform-text-primary)]">
            {couponCode}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2',
              'text-xs font-medium text-red-400 transition-colors',
              deleting
                ? 'cursor-not-allowed opacity-60'
                : 'hover:bg-red-500/10',
            )}
          >
            {deleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className={cn(
              'flex-1 rounded-lg border border-[var(--platform-border)] px-4 py-2',
              'text-xs font-medium text-[var(--platform-text-secondary)]',
              'transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]',
            )}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditCouponPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { currency } = useStoreCurrency()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Usage stats from the API (read-only)
  const [usageCount, setUsageCount] = useState(0)

  const [form, setForm] = useState<FormData>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    minimum_order_value: '',
    maximum_discount_amount: '',
    usage_limit: '',
    usage_limit_per_customer: '1',
    starts_at: '',
    expires_at: '',
    is_active: true,
  })

  // Show toast with auto-dismiss
  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Update a single form field
  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Generate a random coupon code
  function generateCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    updateField('code', code)
  }

  // Currency symbol for display
  const currencySymbol = currency === 'INR' ? '\u20B9' : currency === 'USD' ? '$' : currency

  // ---------------------------------------------------------------------------
  // Fetch coupon
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function fetchCoupon() {
      try {
        const response = await fetch(`/api/dashboard/coupons/${id}`)
        const data = await response.json()

        if (data.success && data.coupon) {
          const c = data.coupon
          setForm({
            code: c.code ?? '',
            description: c.description ?? '',
            discount_type: c.discount_type === 'fixed_amount' ? 'fixed' : 'percentage',
            discount_value: c.discount_value?.toString() ?? '',
            minimum_order_value: c.minimum_order_value?.toString() ?? '',
            maximum_discount_amount: c.maximum_discount_amount?.toString() ?? '',
            usage_limit: c.usage_limit?.toString() ?? '',
            usage_limit_per_customer: c.usage_limit_per_customer?.toString() ?? '1',
            starts_at: c.starts_at
              ? new Date(c.starts_at).toISOString().slice(0, 16)
              : '',
            expires_at: c.expires_at
              ? new Date(c.expires_at).toISOString().slice(0, 16)
              : '',
            is_active: c.active ?? true,
          })
          setUsageCount(c.usage_count ?? 0)
        } else {
          showToast('Coupon not found', 'error')
          router.push('/platform/coupons')
        }
      } catch (error) {
        console.error('Failed to fetch coupon:', error)
        showToast('Failed to load coupon', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchCoupon()
  }, [id, router])

  // ---------------------------------------------------------------------------
  // Submit (PATCH)
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.code.trim()) {
      showToast('Please enter a coupon code', 'error')
      return
    }

    if (!form.discount_value || Number(form.discount_value) <= 0) {
      showToast('Please enter a valid discount value', 'error')
      return
    }

    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) {
      showToast('Percentage cannot exceed 100%', 'error')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/dashboard/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim(),
          description: form.description.trim() || undefined,
          discount_type: form.discount_type === 'fixed' ? 'fixed_amount' : 'percentage',
          discount_value: form.discount_value,
          minimum_order_value: form.minimum_order_value || undefined,
          maximum_discount_amount: form.maximum_discount_amount || undefined,
          usage_limit: form.usage_limit || undefined,
          usage_limit_per_customer: form.usage_limit_per_customer || undefined,
          starts_at: form.starts_at || undefined,
          expires_at: form.expires_at || undefined,
          active: form.is_active,
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast(`Coupon ${form.code} updated successfully`, 'success')
        setTimeout(() => router.push('/platform/coupons'), 800)
      } else {
        throw new Error(data.error || 'Failed to update coupon')
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to update coupon',
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    setDeleting(true)

    try {
      const response = await fetch(`/api/dashboard/coupons/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        showToast('Coupon deleted successfully', 'success')
        setTimeout(() => router.push('/platform/coupons'), 800)
      } else {
        throw new Error(data.error || 'Failed to delete coupon')
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to delete coupon',
        'error',
      )
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Coupons', href: '/platform/coupons' },
            { label: '...' },
          ]}
        />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Coupons', href: '/platform/coupons' },
          { label: form.code || 'Edit' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/platform/coupons"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--platform-border)] text-[var(--platform-text-muted)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              Edit Coupon
            </h1>
            <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
              Update coupon settings and conditions
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5',
            'text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10',
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      {/* Usage Stats */}
      <section className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)]">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--platform-text-muted)]">
              Usage
            </h2>
            <p className="mt-1 text-sm text-[var(--platform-text-secondary)]">
              How many times this coupon has been redeemed
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-[var(--platform-text-primary)]">
              {usageCount}
              <span className="text-sm font-normal text-[var(--platform-text-muted)]">
                {' / '}
                {form.usage_limit ? form.usage_limit : '\u221E'}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--platform-text-muted)]">
              {form.usage_limit
                ? `${Math.max(0, Number(form.usage_limit) - usageCount)} remaining`
                : 'Unlimited uses'}
            </p>
          </div>
        </div>
        {/* Progress bar when there is a limit */}
        {form.usage_limit && Number(form.usage_limit) > 0 && (
          <div className="border-t border-[var(--platform-border)] px-5 py-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--platform-surface-hover)]">
              <div
                className="h-full rounded-full bg-[var(--platform-accent)] transition-all"
                style={{
                  width: `${Math.min(100, (usageCount / Number(form.usage_limit)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ---------------------------------------------------------------
            Section: Coupon Details
        --------------------------------------------------------------- */}
        <section className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)]">
          <div className="border-b border-[var(--platform-border)] px-5 py-3.5">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--platform-text-muted)]">
              Coupon Details
            </h2>
          </div>
          <div className="space-y-5 px-5 py-5">
            {/* Code */}
            <div className="space-y-1.5">
              <label
                htmlFor="code"
                className="block text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                Coupon Code <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  type="text"
                  value={form.code}
                  onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                  placeholder="SAVE20"
                  className={cn(
                    'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                    'font-mono text-sm text-[var(--platform-text-primary)]',
                    'placeholder:text-[var(--platform-text-muted)]',
                    'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
                  )}
                />
                <button
                  type="button"
                  onClick={generateCode}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded border border-[var(--platform-border)] px-3 py-2',
                    'text-xs font-medium text-[var(--platform-text-secondary)]',
                    'transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]',
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate
                </button>
              </div>
              <p className="text-[11px] text-[var(--platform-text-muted)]">
                Customers will enter this code at checkout
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="description"
                className="block text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                Description
              </label>
              <input
                id="description"
                type="text"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="e.g., 20% off for new customers"
                className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
              />
              <p className="text-[11px] text-[var(--platform-text-muted)]">
                Internal note &mdash; not shown to customers
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------
            Section: Discount
        --------------------------------------------------------------- */}
        <section className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)]">
          <div className="border-b border-[var(--platform-border)] px-5 py-3.5">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--platform-text-muted)]">
              Discount
            </h2>
          </div>
          <div className="space-y-5 px-5 py-5">
            {/* Discount Type - selectable cards */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[var(--platform-text-secondary)]">
                Discount Type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Percentage card */}
                <button
                  type="button"
                  onClick={() => updateField('discount_type', 'percentage')}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                    form.discount_type === 'percentage'
                      ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)]/5 ring-1 ring-[var(--platform-accent)]'
                      : 'border-[var(--platform-border)] hover:border-[var(--platform-border-hover)]',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md',
                      form.discount_type === 'percentage'
                        ? 'bg-purple-500/15 text-purple-400'
                        : 'bg-[var(--platform-surface-hover)] text-[var(--platform-text-muted)]',
                    )}
                  >
                    <Percent className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--platform-text-primary)]">
                      Percentage
                    </p>
                    <p className="text-[11px] text-[var(--platform-text-muted)]">e.g., 20% off</p>
                  </div>
                </button>

                {/* Fixed Amount card */}
                <button
                  type="button"
                  onClick={() => updateField('discount_type', 'fixed')}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                    form.discount_type === 'fixed'
                      ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)]/5 ring-1 ring-[var(--platform-accent)]'
                      : 'border-[var(--platform-border)] hover:border-[var(--platform-border-hover)]',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md',
                      form.discount_type === 'fixed'
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-[var(--platform-surface-hover)] text-[var(--platform-text-muted)]',
                    )}
                  >
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--platform-text-primary)]">
                      Fixed Amount
                    </p>
                    <p className="text-[11px] text-[var(--platform-text-muted)]">
                      e.g., {currencySymbol}100 off
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div className="space-y-1.5">
              <label
                htmlFor="discount_value"
                className="block text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                {form.discount_type === 'percentage' ? 'Percentage' : 'Amount'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <div className="relative max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--platform-text-muted)]">
                  {form.discount_type === 'percentage' ? '%' : currencySymbol}
                </span>
                <input
                  id="discount_value"
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => updateField('discount_value', e.target.value)}
                  placeholder={form.discount_type === 'percentage' ? '20' : '100'}
                  min="0"
                  max={form.discount_type === 'percentage' ? '100' : undefined}
                  step="any"
                  className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] py-2 pl-8 pr-3 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
                />
              </div>
              {form.discount_type === 'percentage' && (
                <p className="text-[11px] text-[var(--platform-text-muted)]">
                  Value between 1 and 100
                </p>
              )}
            </div>

            {/* Maximum Discount Amount (only for percentage) */}
            {form.discount_type === 'percentage' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="maximum_discount_amount"
                  className="block text-xs font-medium text-[var(--platform-text-secondary)]"
                >
                  Max Discount Cap
                </label>
                <div className="relative max-w-xs">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--platform-text-muted)]">
                    {currencySymbol}
                  </span>
                  <input
                    id="maximum_discount_amount"
                    type="number"
                    value={form.maximum_discount_amount}
                    onChange={(e) => updateField('maximum_discount_amount', e.target.value)}
                    placeholder="500"
                    min="0"
                    step="any"
                    className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] py-2 pl-8 pr-3 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
                  />
                </div>
                <p className="text-[11px] text-[var(--platform-text-muted)]">
                  Leave empty for no cap on discount amount
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------
            Section: Conditions
        --------------------------------------------------------------- */}
        <section className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)]">
          <div className="border-b border-[var(--platform-border)] px-5 py-3.5">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--platform-text-muted)]">
              Conditions
            </h2>
          </div>
          <div className="space-y-5 px-5 py-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Minimum Order Amount */}
              <div className="space-y-1.5">
                <label
                  htmlFor="minimum_order_value"
                  className="block text-xs font-medium text-[var(--platform-text-secondary)]"
                >
                  Minimum Order Amount
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--platform-text-muted)]">
                    {currencySymbol}
                  </span>
                  <input
                    id="minimum_order_value"
                    type="number"
                    value={form.minimum_order_value}
                    onChange={(e) => updateField('minimum_order_value', e.target.value)}
                    placeholder="999"
                    min="0"
                    step="any"
                    className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] py-2 pl-8 pr-3 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
                  />
                </div>
                <p className="text-[11px] text-[var(--platform-text-muted)]">
                  Leave empty for no minimum
                </p>
              </div>

              {/* Usage Limit */}
              <div className="space-y-1.5">
                <label
                  htmlFor="usage_limit"
                  className="block text-xs font-medium text-[var(--platform-text-secondary)]"
                >
                  Total Usage Limit
                </label>
                <input
                  id="usage_limit"
                  type="number"
                  value={form.usage_limit}
                  onChange={(e) => updateField('usage_limit', e.target.value)}
                  placeholder="100"
                  min="1"
                  className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
                />
                <p className="text-[11px] text-[var(--platform-text-muted)]">
                  Leave empty for unlimited
                </p>
              </div>
            </div>

            {/* Uses per Customer */}
            <div className="space-y-1.5">
              <label
                htmlFor="usage_limit_per_customer"
                className="block text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                Uses per Customer
              </label>
              <input
                id="usage_limit_per_customer"
                type="number"
                value={form.usage_limit_per_customer}
                onChange={(e) => updateField('usage_limit_per_customer', e.target.value)}
                placeholder="1"
                min="1"
                className="w-full max-w-xs rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
              />
              <p className="text-[11px] text-[var(--platform-text-muted)]">
                How many times a single customer can use this coupon
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------
            Section: Schedule
        --------------------------------------------------------------- */}
        <section className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)]">
          <div className="border-b border-[var(--platform-border)] px-5 py-3.5">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--platform-text-muted)]">
              Schedule
            </h2>
          </div>
          <div className="space-y-5 px-5 py-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Start Date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="starts_at"
                  className="block text-xs font-medium text-[var(--platform-text-secondary)]"
                >
                  Start Date
                </label>
                <input
                  id="starts_at"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => updateField('starts_at', e.target.value)}
                  className={cn(
                    'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                    'text-sm text-[var(--platform-text-primary)]',
                    'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
                    !form.starts_at && 'text-[var(--platform-text-muted)]',
                  )}
                />
                <p className="text-[11px] text-[var(--platform-text-muted)]">
                  Leave empty to start immediately
                </p>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="expires_at"
                  className="block text-xs font-medium text-[var(--platform-text-secondary)]"
                >
                  Expiry Date
                </label>
                <input
                  id="expires_at"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => updateField('expires_at', e.target.value)}
                  className={cn(
                    'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                    'text-sm text-[var(--platform-text-primary)]',
                    'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
                    !form.expires_at && 'text-[var(--platform-text-muted)]',
                  )}
                />
                <p className="text-[11px] text-[var(--platform-text-muted)]">
                  Leave empty for no expiration
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------
            Section: Status
        --------------------------------------------------------------- */}
        <section className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)]">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">Active</h2>
              <p className="mt-0.5 text-[11px] text-[var(--platform-text-muted)]">
                Coupon can be used by customers at checkout
              </p>
            </div>
            {/* Toggle switch (no shadcn) */}
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              onClick={() => updateField('is_active', !form.is_active)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.is_active
                  ? 'bg-[var(--platform-accent)]'
                  : 'bg-[var(--platform-surface-hover)]',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  form.is_active ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        </section>

        {/* ---------------------------------------------------------------
            Actions
        --------------------------------------------------------------- */}
        <div className="flex items-center gap-3 pb-8">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--platform-accent)] px-4 py-2.5',
              'text-xs font-medium text-white transition-opacity',
              saving ? 'cursor-not-allowed opacity-60' : 'hover:opacity-90',
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
          <Link
            href="/platform/coupons"
            className={cn(
              'rounded-lg border border-[var(--platform-border)] px-4 py-2.5',
              'text-xs font-medium text-[var(--platform-text-secondary)]',
              'transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]',
            )}
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          couponCode={form.code}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
