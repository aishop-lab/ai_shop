'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles, Percent, DollarSign } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
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
  minimum_amount: string
  max_uses: string
  expires_at: string
  is_active: boolean
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
// Page
// ---------------------------------------------------------------------------

export default function CreateCouponPage() {
  const router = useRouter()
  const { currency } = useStoreCurrency()
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const [form, setForm] = useState<FormData>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    minimum_amount: '',
    max_uses: '',
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
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Client-side validation
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
      const response = await fetch('/api/dashboard/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim(),
          description: form.description.trim() || undefined,
          discount_type: form.discount_type === 'fixed' ? 'fixed_amount' : 'percentage',
          discount_value: form.discount_value,
          minimum_order_value: form.minimum_amount || undefined,
          usage_limit: form.max_uses || undefined,
          expires_at: form.expires_at || undefined,
          active: form.is_active,
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast(`Coupon ${form.code} created successfully`, 'success')
        // Redirect after brief delay so user sees the toast
        setTimeout(() => router.push('/platform/coupons'), 800)
      } else {
        throw new Error(data.error || 'Failed to create coupon')
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create coupon',
        'error',
      )
    } finally {
      setSaving(false)
    }
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
          { label: 'Create' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/platform/coupons"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--platform-border)] text-[var(--platform-text-muted)] transition-colors hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            Create Coupon
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Set up a new discount coupon for your customers
          </p>
        </div>
      </div>

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
                  Generate Random
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
                  htmlFor="minimum_amount"
                  className="block text-xs font-medium text-[var(--platform-text-secondary)]"
                >
                  Minimum Order Amount
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--platform-text-muted)]">
                    {currencySymbol}
                  </span>
                  <input
                    id="minimum_amount"
                    type="number"
                    value={form.minimum_amount}
                    onChange={(e) => updateField('minimum_amount', e.target.value)}
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

              {/* Max Uses */}
              <div className="space-y-1.5">
                <label
                  htmlFor="max_uses"
                  className="block text-xs font-medium text-[var(--platform-text-secondary)]"
                >
                  Max Uses
                </label>
                <input
                  id="max_uses"
                  type="number"
                  value={form.max_uses}
                  onChange={(e) => updateField('max_uses', e.target.value)}
                  placeholder="100"
                  min="1"
                  className="w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]"
                />
                <p className="text-[11px] text-[var(--platform-text-muted)]">
                  Leave empty for unlimited
                </p>
              </div>
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
                  'w-full max-w-xs rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2',
                  'text-sm text-[var(--platform-text-primary)]',
                  'focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]',
                  // Style the date picker placeholder text
                  !form.expires_at && 'text-[var(--platform-text-muted)]',
                )}
              />
              <p className="text-[11px] text-[var(--platform-text-muted)]">
                Leave empty for no expiration
              </p>
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
                Coupon can be used by customers immediately
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
                Creating...
              </>
            ) : (
              'Create Coupon'
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
    </div>
  )
}
