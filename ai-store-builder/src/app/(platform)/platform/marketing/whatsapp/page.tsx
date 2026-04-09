'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  MessageSquare,
  Send,
  Loader2,
  Clock,
  Users,
  Filter,
  Check,
  AlertTriangle,
  ChevronRight,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CustomerData {
  id: string
  store_id: string
  email: string
  full_name: string
  phone: string | null
  created_at: string
  total_orders: number
  total_spent: number
  last_order_at: string | null
}

type TemplateKey =
  | 'new_product'
  | 'flash_sale'
  | 'order_update'
  | 'cart_recovery'
  | 'custom'

type AudienceFilter = 'all' | 'with_orders' | 'without_orders' | 'inactive'
type ScheduleMode = 'now' | 'later'

interface Template {
  label: string
  content: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEMPLATES: Record<TemplateKey, Template> = {
  new_product: {
    label: 'New Product Announcement',
    content:
      'Hi {{customer_name}}! We just launched something exciting at {{store_name}}. Check out our newest product: {{product_name}}. Shop now and be the first to get it!',
  },
  flash_sale: {
    label: 'Flash Sale Alert',
    content:
      'Flash Sale at {{store_name}}! Get {{discount}} off on everything for the next 24 hours. Don\'t miss out, {{customer_name}} — shop now before it\'s gone!',
  },
  order_update: {
    label: 'Order Update',
    content:
      'Hi {{customer_name}}, here\'s an update on your recent order from {{store_name}}. We\'re working hard to get your items to you as fast as possible. Thank you for shopping with us!',
  },
  cart_recovery: {
    label: 'Cart Recovery',
    content:
      'Hey {{customer_name}}, you left some great items in your cart at {{store_name}}! Complete your purchase now and enjoy {{discount}} off. Your items are waiting for you.',
  },
  custom: {
    label: 'Custom Message',
    content: '',
  },
}

const VARIABLE_PLACEHOLDERS = [
  { key: '{{customer_name}}', description: 'Customer\'s full name' },
  { key: '{{store_name}}', description: 'Your store name' },
  { key: '{{product_name}}', description: 'Product name' },
  { key: '{{discount}}', description: 'Discount amount/percentage' },
]

const MAX_MESSAGE_LENGTH = 1024

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WhatsAppBroadcastPage() {
  // Campaign Setup
  const [campaignName, setCampaignName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('new_product')
  const [messageContent, setMessageContent] = useState(TEMPLATES.new_product.content)

  // Audience
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all')
  const [inactiveDays, setInactiveDays] = useState(30)
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string>('')

  // Schedule
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  // Sending
  const [isSending, setIsSending] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [sendResult, setSendResult] = useState<{
    success: boolean
    count: number
    message: string
  } | null>(null)

  // Preview
  const [showPreview, setShowPreview] = useState(true)

  // Fetch store ID
  useEffect(() => {
    async function fetchStoreId() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) {
            setStoreId(data.store.id)
            setStoreName(data.store.name || data.store.slug || 'Your Store')
          }
        }
      } catch {
        console.error('[WhatsApp] Failed to fetch store ID')
      }
    }
    fetchStoreId()
  }, [])

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    if (!storeId) {
      setIsLoadingCustomers(false)
      return
    }
    try {
      setIsLoadingCustomers(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomers((data as CustomerData[]) ?? [])
    } catch (err) {
      console.error('[WhatsApp] Failed to fetch customers:', err)
    } finally {
      setIsLoadingCustomers(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Template change handler
  function handleTemplateChange(key: TemplateKey) {
    setSelectedTemplate(key)
    setMessageContent(TEMPLATES[key].content)
  }

  // Filter customers based on audience selection
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!c.phone) return false // Must have a phone number

      switch (audienceFilter) {
        case 'with_orders':
          return (c.total_orders ?? 0) > 0
        case 'without_orders':
          return (c.total_orders ?? 0) === 0
        case 'inactive': {
          if (!c.last_order_at) return true // Never ordered = inactive
          const lastOrder = new Date(c.last_order_at)
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - inactiveDays)
          return lastOrder < cutoff
        }
        case 'all':
        default:
          return true
      }
    })
  }, [customers, audienceFilter, inactiveDays])

  // Preview message with sample data
  const previewMessage = useMemo(() => {
    return messageContent
      .replace(/\{\{customer_name\}\}/g, 'Rahul')
      .replace(/\{\{store_name\}\}/g, storeName || 'Your Store')
      .replace(/\{\{product_name\}\}/g, 'Premium Wireless Earbuds')
      .replace(/\{\{discount\}\}/g, '20%')
  }, [messageContent, storeName])

  // Insert variable placeholder at cursor
  function insertVariable(variable: string) {
    setMessageContent((prev) => prev + variable)
  }

  // Send broadcast
  async function handleSendBroadcast() {
    if (!storeId || filteredCustomers.length === 0) return
    setIsSending(true)
    setShowConfirmation(false)
    setSendResult(null)

    let successCount = 0
    let failCount = 0

    try {
      // Send messages in batches to avoid overwhelming the API
      for (const customer of filteredCustomers) {
        try {
          const personalizedMessage = messageContent
            .replace(/\{\{customer_name\}\}/g, customer.full_name || 'Valued Customer')
            .replace(/\{\{store_name\}\}/g, storeName)
            .replace(/\{\{product_name\}\}/g, '{{product_name}}')
            .replace(/\{\{discount\}\}/g, '{{discount}}')

          const response = await fetch('/api/agents/tools/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              store_id: storeId,
              to_phone: customer.phone,
              message_text: personalizedMessage,
              message_type: 'template',
              template_name: selectedTemplate === 'custom' ? 'generic_notification' : selectedTemplate,
            }),
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      setSendResult({
        success: successCount > 0,
        count: successCount,
        message:
          failCount > 0
            ? `Sent to ${successCount} customers, ${failCount} failed`
            : `Successfully sent to ${successCount} customers`,
      })
    } catch (err) {
      console.error('[WhatsApp] Broadcast error:', err)
      setSendResult({
        success: false,
        count: 0,
        message: 'Failed to send broadcast. Please try again.',
      })
    } finally {
      setIsSending(false)
    }
  }

  const canSend =
    campaignName.trim() !== '' &&
    messageContent.trim() !== '' &&
    filteredCustomers.length > 0 &&
    !isSending &&
    (scheduleMode === 'now' || (scheduleDate !== '' && scheduleTime !== ''))

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoadingCustomers && customers.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PlatformBreadcrumb
          items={[
            { label: 'Command Center', href: '/platform' },
            { label: 'Marketing', href: '/platform/agents/marketing' },
            { label: 'WhatsApp Broadcast' },
          ]}
        />
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
            WhatsApp Broadcast
          </h1>
          <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
            Loading...
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Marketing', href: '/platform/agents/marketing' },
          { label: 'WhatsApp Broadcast' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              WhatsApp Broadcast
            </h1>
            <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
              Send bulk WhatsApp campaigns to your customers
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error Result Banner */}
      {sendResult && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border p-4',
            sendResult.success
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-red-500/20 bg-red-500/5'
          )}
        >
          {sendResult.success ? (
            <Check className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
          )}
          <div>
            <p
              className={cn(
                'text-sm font-medium',
                sendResult.success ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {sendResult.success ? 'Broadcast Sent' : 'Broadcast Failed'}
            </p>
            <p className="text-xs text-[var(--platform-text-muted)]">
              {sendResult.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSendResult(null)}
            className="ml-auto text-xs text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column: Setup + Audience + Schedule */}
        <div className="lg:col-span-3 space-y-6">
          {/* ---------------------------------------------------------- */}
          {/* Section 1: Campaign Setup                                    */}
          {/* ---------------------------------------------------------- */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                Campaign Setup
              </h2>
            </div>

            {/* Campaign Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="campaign-name"
                className="text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                Campaign Name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Summer Sale 2026"
                className={cn(
                  'w-full rounded-lg border border-[var(--platform-border)]',
                  'bg-[var(--platform-bg)] px-3 py-2',
                  'text-sm text-[var(--platform-text-primary)]',
                  'placeholder:text-[var(--platform-text-muted)]',
                  'outline-none transition-colors',
                  'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                )}
              />
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="template-select"
                className="text-xs font-medium text-[var(--platform-text-secondary)]"
              >
                Message Template
              </label>
              <select
                id="template-select"
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value as TemplateKey)}
                className={cn(
                  'w-full rounded-lg border border-[var(--platform-border)]',
                  'bg-[var(--platform-bg)] px-3 py-2',
                  'text-sm text-[var(--platform-text-primary)]',
                  'outline-none transition-colors appearance-none',
                  'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                )}
              >
                {(Object.entries(TEMPLATES) as [TemplateKey, Template][]).map(
                  ([key, template]) => (
                    <option key={key} value={key}>
                      {template.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Message Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="message-content"
                  className="text-xs font-medium text-[var(--platform-text-secondary)]"
                >
                  Message Content
                </label>
                <span
                  className={cn(
                    'font-mono text-[10px]',
                    messageContent.length > MAX_MESSAGE_LENGTH
                      ? 'text-red-400'
                      : 'text-[var(--platform-text-muted)]'
                  )}
                >
                  {messageContent.length} / {MAX_MESSAGE_LENGTH}
                </span>
              </div>
              <textarea
                id="message-content"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={5}
                placeholder="Type your message here..."
                className={cn(
                  'w-full resize-none rounded-lg border border-[var(--platform-border)]',
                  'bg-[var(--platform-bg)] px-3 py-2',
                  'text-sm leading-relaxed text-[var(--platform-text-primary)]',
                  'placeholder:text-[var(--platform-text-muted)]',
                  'outline-none transition-colors',
                  'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                )}
              />
            </div>

            {/* Variable Placeholders */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                Variables (click to insert)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLE_PLACEHOLDERS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    title={v.description}
                    className={cn(
                      'rounded-md border border-[var(--platform-border)] px-2 py-1',
                      'font-mono text-[10px] text-[var(--platform-text-secondary)]',
                      'hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]',
                      'transition-colors'
                    )}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Section 2: Audience                                          */}
          {/* ---------------------------------------------------------- */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[var(--platform-text-muted)]" />
                <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Audience
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
                <span className="font-mono text-xs text-[var(--platform-text-primary)]">
                  {filteredCustomers.length}
                </span>
                <span className="text-xs text-[var(--platform-text-muted)]">
                  recipients
                </span>
              </div>
            </div>

            {/* Filter Options */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { key: 'all', label: 'All Customers' },
                  { key: 'with_orders', label: 'With Orders' },
                  { key: 'without_orders', label: 'No Orders' },
                  { key: 'inactive', label: 'Inactive' },
                ] as { key: AudienceFilter; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAudienceFilter(opt.key)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    audienceFilter === opt.key
                      ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)]/10 text-[var(--platform-accent)]'
                      : 'border-[var(--platform-border)] text-[var(--platform-text-secondary)] hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Inactive days input */}
            {audienceFilter === 'inactive' && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="inactive-days"
                  className="text-xs text-[var(--platform-text-secondary)]"
                >
                  Inactive for at least
                </label>
                <input
                  id="inactive-days"
                  type="number"
                  min={1}
                  max={365}
                  value={inactiveDays}
                  onChange={(e) =>
                    setInactiveDays(Math.max(1, parseInt(e.target.value) || 30))
                  }
                  className={cn(
                    'w-20 rounded-lg border border-[var(--platform-border)]',
                    'bg-[var(--platform-bg)] px-2 py-1.5 text-center',
                    'font-mono text-sm text-[var(--platform-text-primary)]',
                    'outline-none transition-colors',
                    'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                  )}
                />
                <span className="text-xs text-[var(--platform-text-secondary)]">
                  days
                </span>
              </div>
            )}

            {/* Recipients summary */}
            <div className="rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--platform-text-muted)]">
                  Customers with phone numbers
                </span>
                <span className="font-mono text-xs text-[var(--platform-text-primary)]">
                  {customers.filter((c) => c.phone).length} / {customers.length}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-[var(--platform-text-muted)]">
                  Matching filter
                </span>
                <span className="font-mono text-xs text-emerald-400">
                  {filteredCustomers.length} recipients
                </span>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Section 4: Schedule                                          */}
          {/* ---------------------------------------------------------- */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                Schedule
              </h2>
            </div>

            {/* Schedule radio buttons */}
            <div className="flex gap-4">
              {(
                [
                  { key: 'now', label: 'Send Now', icon: Send },
                  { key: 'later', label: 'Schedule for Later', icon: Clock },
                ] as { key: ScheduleMode; label: string; icon: typeof Send }[]
              ).map((opt) => (
                <label
                  key={opt.key}
                  className={cn(
                    'flex flex-1 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                    scheduleMode === opt.key
                      ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)]/5'
                      : 'border-[var(--platform-border)] hover:border-[var(--platform-border-hover)]'
                  )}
                >
                  <input
                    type="radio"
                    name="schedule-mode"
                    value={opt.key}
                    checked={scheduleMode === opt.key}
                    onChange={() => setScheduleMode(opt.key)}
                    className="sr-only"
                  />
                  <opt.icon
                    className={cn(
                      'h-4 w-4',
                      scheduleMode === opt.key
                        ? 'text-[var(--platform-accent)]'
                        : 'text-[var(--platform-text-muted)]'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      scheduleMode === opt.key
                        ? 'text-[var(--platform-text-primary)]'
                        : 'text-[var(--platform-text-secondary)]'
                    )}
                  >
                    {opt.label}
                  </span>
                  <div
                    className={cn(
                      'ml-auto h-4 w-4 rounded-full border-2 transition-colors',
                      scheduleMode === opt.key
                        ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)]'
                        : 'border-[var(--platform-border)]'
                    )}
                  >
                    {scheduleMode === opt.key && (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Date/Time picker for scheduled sends */}
            {scheduleMode === 'later' && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <label
                    htmlFor="schedule-date"
                    className="text-xs font-medium text-[var(--platform-text-secondary)]"
                  >
                    Date
                  </label>
                  <input
                    id="schedule-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={cn(
                      'w-full rounded-lg border border-[var(--platform-border)]',
                      'bg-[var(--platform-bg)] px-3 py-2',
                      'text-sm text-[var(--platform-text-primary)]',
                      'outline-none transition-colors',
                      'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                    )}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label
                    htmlFor="schedule-time"
                    className="text-xs font-medium text-[var(--platform-text-secondary)]"
                  >
                    Time
                  </label>
                  <input
                    id="schedule-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className={cn(
                      'w-full rounded-lg border border-[var(--platform-border)]',
                      'bg-[var(--platform-bg)] px-3 py-2',
                      'text-sm text-[var(--platform-text-primary)]',
                      'outline-none transition-colors',
                      'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]'
                    )}
                  />
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              type="button"
              disabled={!canSend}
              onClick={() => setShowConfirmation(true)}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                canSend
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'cursor-not-allowed bg-[var(--platform-surface-hover)] text-[var(--platform-text-muted)]'
              )}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Broadcast...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {scheduleMode === 'now'
                    ? `Send Broadcast to ${filteredCustomers.length} Recipients`
                    : `Schedule Broadcast for ${filteredCustomers.length} Recipients`}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column: Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* ---------------------------------------------------------- */}
          {/* Section 3: WhatsApp Preview                                  */}
          {/* ---------------------------------------------------------- */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[var(--platform-text-muted)]" />
                <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                  Preview
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="text-[10px] text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)]"
              >
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>

            {showPreview && (
              <div className="space-y-3">
                {/* WhatsApp-style preview */}
                <div className="overflow-hidden rounded-xl border border-emerald-500/10">
                  {/* Header bar */}
                  <div className="flex items-center gap-2 bg-emerald-800/90 px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700">
                      <span className="text-[10px] font-bold text-white">
                        {(storeName || 'S')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{storeName || 'Your Store'}</p>
                      <p className="text-[10px] text-emerald-200/60">Business Account</p>
                    </div>
                  </div>

                  {/* Chat area */}
                  <div
                    className="px-3 py-4"
                    style={{
                      backgroundImage:
                        'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23134e23\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                      backgroundColor: '#0b1d14',
                    }}
                  >
                    {/* Message bubble */}
                    <div className="max-w-[90%]">
                      <div className="relative rounded-lg rounded-tl-none bg-emerald-900/60 px-3 py-2 shadow-sm">
                        {/* Triangle pointer */}
                        <div className="absolute -left-1.5 top-0 h-3 w-3 overflow-hidden">
                          <div className="h-3 w-3 origin-bottom-right rotate-45 bg-emerald-900/60" />
                        </div>
                        <p className="text-xs leading-relaxed text-emerald-50/90 whitespace-pre-wrap">
                          {previewMessage || 'Your message will appear here...'}
                        </p>
                        <p className="mt-1 text-right text-[9px] text-emerald-400/40">
                          {new Date().toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                          <span className="ml-1">
                            <Check className="inline h-2.5 w-2.5" />
                            <Check className="-ml-1 inline h-2.5 w-2.5" />
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign summary */}
                <div className="rounded-md border border-[var(--platform-border)] bg-[var(--platform-bg)] p-3 space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
                    Campaign Summary
                  </p>
                  <div className="space-y-1.5">
                    <SummaryRow
                      label="Campaign"
                      value={campaignName || '(unnamed)'}
                    />
                    <SummaryRow
                      label="Template"
                      value={TEMPLATES[selectedTemplate].label}
                    />
                    <SummaryRow
                      label="Recipients"
                      value={`${filteredCustomers.length} customers`}
                    />
                    <SummaryRow
                      label="Schedule"
                      value={
                        scheduleMode === 'now'
                          ? 'Immediate'
                          : scheduleDate && scheduleTime
                            ? `${scheduleDate} at ${scheduleTime}`
                            : 'Not set'
                      }
                    />
                    <SummaryRow
                      label="Message Length"
                      value={`${messageContent.length} chars`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick tips card */}
          <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-3">
            <h3 className="font-mono text-xs font-medium uppercase tracking-wider text-[var(--platform-text-muted)]">
              Tips
            </h3>
            <ul className="space-y-2">
              {[
                'Keep messages under 200 words for best engagement.',
                'Use {{customer_name}} to personalize each message.',
                'WhatsApp Business templates must be pre-approved by Meta.',
                'Avoid sending broadcasts between 9 PM and 9 AM.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/60" />
                  <span className="text-xs leading-relaxed text-[var(--platform-text-muted)]">
                    {tip}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Confirmation Dialog                                               */}
      {/* ---------------------------------------------------------------- */}
      {showConfirmation && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmation(false)}
          />

          {/* Dialog */}
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <Send className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
                    Confirm Broadcast
                  </h3>
                  <p className="text-xs text-[var(--platform-text-muted)]">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="mb-5 space-y-2 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] p-3">
                <SummaryRow label="Campaign" value={campaignName} />
                <SummaryRow
                  label="Template"
                  value={TEMPLATES[selectedTemplate].label}
                />
                <SummaryRow
                  label="Recipients"
                  value={`${filteredCustomers.length} customers`}
                />
                <SummaryRow
                  label="Schedule"
                  value={scheduleMode === 'now' ? 'Send immediately' : `${scheduleDate} at ${scheduleTime}`}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className={cn(
                    'flex-1 rounded-lg border border-[var(--platform-border)] px-4 py-2.5',
                    'text-xs font-medium text-[var(--platform-text-secondary)]',
                    'hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]',
                    'transition-colors'
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Broadcast
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SummaryRow
// ---------------------------------------------------------------------------

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-[var(--platform-text-muted)]">{label}</span>
      <span className="font-mono text-[11px] text-[var(--platform-text-secondary)]">
        {value}
      </span>
    </div>
  )
}
