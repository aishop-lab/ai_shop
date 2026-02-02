'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Package, Mail, ArrowRight, Home, Truck, Loader2, ShoppingBag, Copy, Check } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'
import { useAnalytics } from '@/lib/analytics'
import { toast } from 'sonner'
import type { Order, OrderItem, ShippingAddress } from '@/lib/types/order'

interface OrderDetails extends Order {
  order_items: OrderItem[]
  shipping_address: ShippingAddress
}

export default function StoreThankYouPage() {
  const { store, formatPrice } = useStore()
  const analytics = useAnalytics()
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  const baseUrl = `/${store.slug}`

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(!!orderNumber)
  const [showConfetti, setShowConfetti] = useState(true)
  const [copied, setCopied] = useState(false)
  const [purchaseTracked, setPurchaseTracked] = useState(false)
  
  // Fetch order details
  useEffect(() => {
    if (orderNumber) {
      fetchOrderDetails()
    }

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [orderNumber])

  // Track purchase conversion once order data is loaded
  useEffect(() => {
    if (order && !purchaseTracked) {
      analytics.trackPurchase({
        id: order.order_number,
        items: order.order_items?.map(item => ({
          id: item.product_id,
          name: item.product_title,
          price: item.unit_price,
          quantity: item.quantity
        })) || [],
        total: order.total_amount,
        shipping: order.shipping_cost,
        tax: order.tax_amount
      })
      setPurchaseTracked(true)
    }
  }, [order, purchaseTracked]) // eslint-disable-line react-hooks/exhaustive-deps
  
  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`/api/orders/lookup/${orderNumber}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data.order)
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const copyOrderNumber = () => {
    if (orderNumber) {
      navigator.clipboard.writeText(orderNumber)
      setCopied(true)
      toast.success('Order number copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  // Simple confetti animation using CSS
  const ConfettiPiece = ({ delay, left, color }: { delay: number; left: string; color: string }) => (
    <div
      className="absolute w-2 h-2 rounded-sm animate-fall"
      style={{
        left,
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        top: '-10px'
      }}
    />
  )
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          <style jsx>{`
            @keyframes fall {
              0% {
                transform: translateY(-10px) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
              }
            }
            .animate-fall {
              animation: fall 3s ease-out forwards;
            }
          `}</style>
          {[...Array(50)].map((_, i) => (
            <ConfettiPiece
              key={i}
              delay={Math.random() * 2000}
              left={`${Math.random() * 100}%`}
              color={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]}
            />
          ))}
        </div>
      )}
      
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div 
          className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <CheckCircle className="w-14 h-14" style={{ color: 'var(--color-primary)' }} />
        </div>
        
        <h1 
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Thank You for Your Order!
        </h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Your order has been placed successfully.
          {order?.payment_method === 'cod' 
            ? " You'll pay when you receive your order."
            : " Payment confirmed!"}
        </p>
        
        {/* Order Number */}
        {orderNumber && (
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-lg px-6 py-3">
            <div>
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="text-xl font-bold font-mono">{orderNumber}</p>
            </div>
            <button
              onClick={copyOrderNumber}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Copy order number"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Order Details */}
      {order && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Order Details
          </h2>
          
          {/* Order Items */}
          <div className="space-y-4 border-b pb-4 mb-4">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.product_image ? (
                    <Image
                      src={item.product_image}
                      alt={item.product_title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.product_title}</p>
                  <p className="text-sm text-gray-600">
                    Qty: {item.quantity} × {formatPrice(item.unit_price)}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatPrice(item.total_price)}
                </p>
              </div>
            ))}
          </div>
          
          {/* Pricing Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span>{order.shipping_cost === 0 ? <span className="text-green-600">Free</span> : formatPrice(order.shipping_cost)}</span>
            </div>
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span>{formatPrice(order.tax_amount)}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>{formatPrice(order.total_amount)}</span>
            </div>
          </div>
          
          {/* Payment & Status */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="font-medium text-blue-900">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Payment Confirmed'}
                </p>
                <p className="text-sm text-blue-700">
                  Your order will be delivered in 3-7 business days
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Shipping Address */}
      {order?.shipping_address && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Shipping Address
          </h2>
          <div className="text-gray-700">
            <p className="font-medium">{order.shipping_address.name}</p>
            <p>{order.shipping_address.address_line1}</p>
            {order.shipping_address.address_line2 && (
              <p>{order.shipping_address.address_line2}</p>
            )}
            <p>
              {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
            </p>
            <p className="mt-2">
              <span className="text-gray-600">Phone:</span> {order.shipping_address.phone}
            </p>
          </div>
        </div>
      )}
      
      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-6 border rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <Mail className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h3 className="font-semibold">Confirmation Email</h3>
          </div>
          <p className="text-gray-600 text-sm">
            We&apos;ve sent an order confirmation to{' '}
            <span className="font-medium">{order?.customer_email || 'your email'}</span>
          </p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <Truck className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h3 className="font-semibold">Track Your Order</h3>
          </div>
          <p className="text-gray-600 text-sm">
            {orderNumber ? (
              <>
                <Link
                  href={`${baseUrl}/track/${orderNumber}`}
                  className="font-medium hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Track your order
                </Link>
                {' '}anytime to see real-time shipping updates.
              </>
            ) : (
              "You'll receive tracking information once your order ships."
            )}
          </p>
        </div>
      </div>
      
      {/* What's Next */}
      <div className="p-8 rounded-lg mb-8" style={{ backgroundColor: 'var(--color-primary-light)' }}>
        <h2 
          className="text-xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          What&apos;s Next?
        </h2>
        <ul className="max-w-md mx-auto space-y-3">
          <li className="flex items-start gap-3">
            <span 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              1
            </span>
            <span className="text-gray-700">We&apos;ll process your order within 24 hours</span>
          </li>
          <li className="flex items-start gap-3">
            <span 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              2
            </span>
            <span className="text-gray-700">Your order will be carefully packed and shipped</span>
          </li>
          <li className="flex items-start gap-3">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              3
            </span>
            <span className="text-gray-700">
              {orderNumber ? (
                <>
                  <Link
                    href={`${baseUrl}/track/${orderNumber}`}
                    className="font-medium hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Track your order
                  </Link>
                  {' '}to see real-time delivery updates
                </>
              ) : (
                'Track your delivery with the link in your email'
              )}
            </span>
          </li>
        </ul>
      </div>
      
      {/* Contact Info */}
      <p className="text-gray-600 text-center mb-8">
        Have questions? Contact us at{' '}
        <a 
          href={`mailto:${store.contact_email}`}
          className="font-medium hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          {store.contact_email}
        </a>
        {store.whatsapp_number && (
          <>
            {' '}or{' '}
            <a
              href={`https://wa.me/91${store.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              WhatsApp
            </a>
          </>
        )}
      </p>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {orderNumber && (
          <Link
            href={`${baseUrl}/track/${orderNumber}`}
            className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Truck className="mr-2 w-4 h-4" />
            Track Order
          </Link>
        )}

        <Link
          href={`${baseUrl}/products`}
          className="inline-flex items-center px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50"
        >
          Continue Shopping
          <ArrowRight className="ml-2 w-4 h-4" />
        </Link>

        <Link
          href={baseUrl}
          className="inline-flex items-center px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50"
        >
          <Home className="mr-2 w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
