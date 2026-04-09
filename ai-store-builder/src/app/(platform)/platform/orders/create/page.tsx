'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Plus,
  Search,
  Trash2,
  Minus,
  Package,
  Loader2,
  User,
  ShoppingBag,
  Truck,
  CreditCard,
  FileText,
  X,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { PlatformBreadcrumb } from '@/components/ui/breadcrumb'
import { usePlatformStore } from '@/lib/hooks/use-platform-store'
import { useToast } from '@/lib/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductImage {
  original_url: string
  thumbnail_url: string | null
  position: number
}

interface CatalogProduct {
  id: string
  title: string
  price: number
  inventory: number
  status: 'active' | 'draft'
  product_images: ProductImage[]
}

interface LineItem {
  product: CatalogProduct
  quantity: number
}

interface CustomerResult {
  id: string
  name: string
  email: string
  phone: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
] as const

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
] as const

// ---------------------------------------------------------------------------
// Shared input / label / section styles
// ---------------------------------------------------------------------------

const inputCls = cn(
  'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)]',
  'px-3 py-2 text-sm text-[var(--platform-text-primary)]',
  'placeholder:text-[var(--platform-text-muted)]',
  'outline-none transition-colors',
  'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
)

const selectCls = cn(
  'w-full appearance-none rounded border border-[var(--platform-border)] bg-[var(--platform-bg)]',
  'px-3 py-2 text-sm text-[var(--platform-text-primary)]',
  'outline-none transition-colors cursor-pointer',
  'hover:border-[var(--platform-border-hover)] focus:border-[var(--platform-accent)]',
)

const labelCls = 'block text-xs font-medium text-[var(--platform-text-secondary)] mb-1'

const sectionCls = 'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreateOrderPage() {
  const router = useRouter()
  const { storeId, currency } = usePlatformStore()
  const { toast } = useToast()

  // Customer
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const customerDropdownRef = useRef<HTMLDivElement>(null)

  // Products
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<CatalogProduct[]>([])
  const [productSearching, setProductSearching] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const productDropdownRef = useRef<HTMLDivElement>(null)

  // Shipping address
  const [shippingName, setShippingName] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')

  // Order summary overrides
  const [shippingFee, setShippingFee] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)

  // Payment & notes
  const [paymentMethod, setPaymentMethod] = useState<string>('cod')
  const [paymentStatus, setPaymentStatus] = useState<string>('pending')
  const [orderNotes, setOrderNotes] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)

  // ---------- Computed ----------
  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.product.price * li.quantity, 0),
    [lineItems],
  )
  const total = useMemo(
    () => Math.max(0, subtotal + shippingFee + tax - discount),
    [subtotal, shippingFee, tax, discount],
  )

  // ---------- Click-outside to close dropdowns ----------
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCustomerDropdown(false)
      }
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(e.target as Node)
      ) {
        setShowProductDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ---------- Customer search ----------
  useEffect(() => {
    if (!storeId || customerSearch.length < 2) {
      setCustomerResults([])
      return
    }
    const timer = setTimeout(async () => {
      setCustomerSearching(true)
      try {
        const supabase = createClient()
        const q = customerSearch.toLowerCase()
        const { data } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('store_id', storeId)
          .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(8)
        setCustomerResults((data as CustomerResult[]) ?? [])
        setShowCustomerDropdown(true)
      } catch {
        console.error('[CreateOrder] Customer search failed')
      } finally {
        setCustomerSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch, storeId])

  // ---------- Product search ----------
  useEffect(() => {
    if (!storeId || productSearch.length < 1) {
      setProductResults([])
      return
    }
    const timer = setTimeout(async () => {
      setProductSearching(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('products')
          .select('id, title, price, inventory, status, product_images(original_url, thumbnail_url, position)')
          .eq('store_id', storeId)
          .eq('status', 'active')
          .ilike('title', `%${productSearch}%`)
          .order('title')
          .limit(10)
        setProductResults((data as CatalogProduct[]) ?? [])
        setShowProductDropdown(true)
      } catch {
        console.error('[CreateOrder] Product search failed')
      } finally {
        setProductSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch, storeId])

  // ---------- Customer selection ----------
  function handleSelectCustomer(c: CustomerResult) {
    setSelectedCustomer(c)
    setCustomerName(c.name)
    setCustomerEmail(c.email)
    setCustomerPhone(c.phone ?? '')
    setCustomerSearch('')
    setShowCustomerDropdown(false)
  }

  function handleClearCustomer() {
    setSelectedCustomer(null)
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
  }

  // ---------- Product add / remove / qty ----------
  function handleAddProduct(product: CatalogProduct) {
    setLineItems((prev) => {
      const existing = prev.find((li) => li.product.id === product.id)
      if (existing) {
        return prev.map((li) =>
          li.product.id === product.id ? { ...li, quantity: li.quantity + 1 } : li,
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    setProductSearch('')
    setShowProductDropdown(false)
  }

  function handleRemoveProduct(productId: string) {
    setLineItems((prev) => prev.filter((li) => li.product.id !== productId))
  }

  function handleQuantityChange(productId: string, delta: number) {
    setLineItems((prev) =>
      prev
        .map((li) =>
          li.product.id === productId
            ? { ...li, quantity: Math.max(1, li.quantity + delta) }
            : li,
        ),
    )
  }

  // ---------- Autofill shipping from customer ----------
  const handleAutofillShipping = useCallback(() => {
    if (customerName) setShippingName(customerName)
    if (customerPhone) setShippingPhone(customerPhone)
  }, [customerName, customerPhone])

  // ---------- Get primary product image ----------
  function getProductImage(product: CatalogProduct): string | null {
    const sorted = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)
    return sorted[0]?.thumbnail_url || sorted[0]?.original_url || null
  }

  // ---------- Validate & Submit ----------
  async function handleSubmit() {
    // Validation
    if (!storeId) {
      toast({ title: 'Error', description: 'Store not loaded. Please refresh.', variant: 'destructive' })
      return
    }
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      toast({ title: 'Missing Customer', description: 'Name, email, and phone are required.', variant: 'destructive' })
      return
    }
    if (lineItems.length === 0) {
      toast({ title: 'No Products', description: 'Add at least one product to the order.', variant: 'destructive' })
      return
    }
    if (!shippingName.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      toast({ title: 'Missing Address', description: 'Fill in all required shipping address fields.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      // Map payment method to API-compatible value
      const apiPaymentMethod = paymentMethod === 'cod' ? 'cod' : 'razorpay'

      const body = {
        store_id: storeId,
        items: lineItems.map((li) => ({
          product_id: li.product.id,
          quantity: li.quantity,
        })),
        shipping_address: {
          name: shippingName.trim(),
          phone: shippingPhone.trim() || customerPhone.trim(),
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: 'India',
        },
        customer_details: {
          name: customerName.trim(),
          email: customerEmail.trim(),
          phone: customerPhone.trim(),
        },
        payment_method: apiPaymentMethod,
      }

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        const msg = data.details?.join(', ') || data.error || 'Failed to create order'
        toast({ title: 'Order Failed', description: msg, variant: 'destructive' })
        return
      }

      // If this is a non-COD draft order marked as paid, update payment status
      if (paymentStatus === 'paid' && data.order?.id) {
        const supabase = createClient()
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            ...(paymentMethod !== 'cod' ? { payment_method: paymentMethod } : {}),
          })
          .eq('id', data.order.id)
      }

      // If there are manual adjustments (extra shipping, discount, tax, notes), patch the order
      if (data.order?.id && (discount > 0 || orderNotes.trim())) {
        const supabase = createClient()
        const updates: Record<string, unknown> = {}
        if (discount > 0) updates.discount_amount = discount
        if (orderNotes.trim()) updates.notes = orderNotes.trim()
        if (Object.keys(updates).length > 0) {
          await supabase.from('orders').update(updates).eq('id', data.order.id)
        }
      }

      toast({ title: 'Order Created', description: `Order ${data.order.order_number} created successfully.` })
      router.push(`/platform/orders/${data.order.id}`)
    } catch (err) {
      console.error('[CreateOrder] Submit error:', err)
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- Render ----------
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <PlatformBreadcrumb
        items={[
          { label: 'Command Center', href: '/platform' },
          { label: 'Orders', href: '/platform/orders' },
          { label: 'Create Order' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Create Draft Order
        </h1>
        <p className="mt-0.5 text-sm text-[var(--platform-text-secondary)]">
          Manually create an order for phone, WhatsApp, or in-person sales
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* ============================================================= */}
        {/* Left column                                                      */}
        {/* ============================================================= */}
        <div className="space-y-6">
          {/* ----------------------------------------------------------- */}
          {/* Section 1: Customer                                            */}
          {/* ----------------------------------------------------------- */}
          <section className={sectionCls}>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
                Customer
              </h2>
            </div>

            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--platform-text-primary)]">
                    {selectedCustomer.name}
                  </p>
                  <p className="text-xs text-[var(--platform-text-muted)]">
                    {selectedCustomer.email}
                    {selectedCustomer.phone ? ` / ${selectedCustomer.phone}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="rounded p-1 text-[var(--platform-text-muted)] transition-colors hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-primary)]"
                  aria-label="Clear customer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={customerDropdownRef}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search existing customers..."
                    className={cn(inputCls, 'pl-9')}
                  />
                  {customerSearching && (
                    <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[var(--platform-text-muted)]" />
                  )}
                </div>

                {/* Dropdown results */}
                {showCustomerDropdown && customerResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] py-1 shadow-xl">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--platform-surface-hover)]"
                      >
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--platform-accent)]/10 text-[var(--platform-accent)]">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-[var(--platform-text-primary)]">{c.name}</p>
                          <p className="truncate text-xs text-[var(--platform-text-muted)]">
                            {c.email}{c.phone ? ` / ${c.phone}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showCustomerDropdown && customerSearch.length >= 2 && customerResults.length === 0 && !customerSearching && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-3 text-center text-xs text-[var(--platform-text-muted)] shadow-xl">
                    No customers found. Enter details below.
                  </div>
                )}
              </div>
            )}

            {/* Manual entry fields */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------- */}
          {/* Section 2: Products                                            */}
          {/* ----------------------------------------------------------- */}
          <section className={sectionCls}>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
                Products
              </h2>
            </div>

            {/* Product search */}
            <div className="relative" ref={productDropdownRef}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products to add..."
                  className={cn(inputCls, 'pl-9')}
                />
                {productSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[var(--platform-text-muted)]" />
                )}
              </div>

              {/* Product dropdown */}
              {showProductDropdown && productResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] py-1 shadow-xl max-h-72 overflow-y-auto">
                  {productResults.map((p) => {
                    const img = getProductImage(p)
                    const alreadyAdded = lineItems.some((li) => li.product.id === p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--platform-surface-hover)]',
                          alreadyAdded && 'opacity-60',
                        )}
                      >
                        {img ? (
                          <Image
                            src={img}
                            alt={p.title}
                            width={32}
                            height={32}
                            className="h-8 w-8 flex-shrink-0 rounded border border-[var(--platform-border)] object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-[var(--platform-border)] bg-[var(--platform-bg)]">
                            <Package className="h-3.5 w-3.5 text-[var(--platform-text-muted)]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[var(--platform-text-primary)]">{p.title}</p>
                          <p className="text-xs text-[var(--platform-text-muted)]">
                            {formatCurrency(p.price, currency)} &middot; {p.inventory} in stock
                          </p>
                        </div>
                        {alreadyAdded ? (
                          <span className="flex-shrink-0 text-[10px] font-medium text-[var(--platform-accent)]">Added</span>
                        ) : (
                          <Plus className="h-4 w-4 flex-shrink-0 text-[var(--platform-text-muted)]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Line items */}
            {lineItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--platform-border)] py-10">
                <Package className="mb-2 h-6 w-6 text-[var(--platform-text-muted)]" />
                <p className="text-xs text-[var(--platform-text-muted)]">No products added yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--platform-border)] rounded-lg border border-[var(--platform-border)]">
                {lineItems.map((li) => {
                  const img = getProductImage(li.product)
                  const lineTotal = li.product.price * li.quantity
                  return (
                    <div key={li.product.id} className="flex items-center gap-3 px-3 py-3">
                      {/* Image */}
                      {img ? (
                        <Image
                          src={img}
                          alt={li.product.title}
                          width={40}
                          height={40}
                          className="h-10 w-10 flex-shrink-0 rounded border border-[var(--platform-border)] object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-[var(--platform-border)] bg-[var(--platform-bg)]">
                          <Package className="h-4 w-4 text-[var(--platform-text-muted)]" />
                        </div>
                      )}

                      {/* Title + price */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--platform-text-primary)]">
                          {li.product.title}
                        </p>
                        <p className="text-xs text-[var(--platform-text-muted)]">
                          {formatCurrency(li.product.price, currency)} each
                        </p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(li.product.id, -1)}
                          disabled={li.quantity <= 1}
                          className="rounded border border-[var(--platform-border)] p-1 text-[var(--platform-text-muted)] transition-colors hover:bg-[var(--platform-surface-hover)] disabled:opacity-30"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center font-mono text-sm text-[var(--platform-text-primary)]">
                          {li.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(li.product.id, 1)}
                          disabled={li.quantity >= li.product.inventory}
                          className="rounded border border-[var(--platform-border)] p-1 text-[var(--platform-text-muted)] transition-colors hover:bg-[var(--platform-surface-hover)] disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Line total */}
                      <span className="w-24 text-right font-mono text-sm font-medium text-[var(--platform-text-primary)]">
                        {formatCurrency(lineTotal, currency)}
                      </span>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(li.product.id)}
                        className="rounded p-1 text-[var(--platform-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                        aria-label={`Remove ${li.product.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ----------------------------------------------------------- */}
          {/* Section 4: Shipping Address                                     */}
          {/* ----------------------------------------------------------- */}
          <section className={sectionCls}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[var(--platform-text-muted)]" />
                <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
                  Shipping Address
                </h2>
              </div>
              {customerName && (
                <button
                  type="button"
                  onClick={handleAutofillShipping}
                  className="text-[10px] font-medium text-[var(--platform-accent)] transition-opacity hover:opacity-80"
                >
                  Autofill from customer
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Full Name *</label>
                <input
                  type="text"
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  placeholder="Recipient name"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address Line 1 *</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="House no., building, street"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address Line 2</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, landmark (optional)"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Pincode *</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="110001"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  placeholder="Shipping phone (optional)"
                  className={inputCls}
                />
              </div>
            </div>
          </section>
        </div>

        {/* ============================================================= */}
        {/* Right column (sticky)                                           */}
        {/* ============================================================= */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* ----------------------------------------------------------- */}
          {/* Section 3: Order Summary                                       */}
          {/* ----------------------------------------------------------- */}
          <section className={sectionCls}>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
                Order Summary
              </h2>
            </div>

            <div className="space-y-3">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--platform-text-secondary)]">
                  Subtotal ({lineItems.reduce((s, li) => s + li.quantity, 0)} items)
                </span>
                <span className="font-mono text-sm text-[var(--platform-text-primary)]">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>

              {/* Shipping */}
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-[var(--platform-text-secondary)]">Shipping</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value) || 0))}
                  className={cn(inputCls, 'w-28 text-right font-mono')}
                />
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-[var(--platform-text-secondary)]">Discount</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className={cn(inputCls, 'w-28 text-right font-mono')}
                />
              </div>

              {/* Tax */}
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-[var(--platform-text-secondary)]">Tax</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={tax}
                  onChange={(e) => setTax(Math.max(0, Number(e.target.value) || 0))}
                  className={cn(inputCls, 'w-28 text-right font-mono')}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--platform-border)]" />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--platform-text-primary)]">Total</span>
                <span className="font-mono text-lg font-bold text-[var(--platform-text-primary)]">
                  {formatCurrency(total, currency)}
                </span>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------- */}
          {/* Section 5: Payment & Notes                                     */}
          {/* ----------------------------------------------------------- */}
          <section className={sectionCls}>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[var(--platform-text-muted)]" />
              <h2 className="font-mono text-sm font-semibold text-[var(--platform-text-primary)]">
                Payment & Notes
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={selectCls}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className={selectCls}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Order Notes</label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Internal notes about this order..."
                  rows={3}
                  className={cn(inputCls, 'resize-none')}
                />
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------- */}
          {/* Create button                                                  */}
          {/* ----------------------------------------------------------- */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || lineItems.length === 0}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3',
              'bg-[var(--platform-accent)] text-white text-sm font-semibold',
              'transition-opacity hover:opacity-90',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
