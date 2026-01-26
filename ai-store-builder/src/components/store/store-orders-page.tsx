'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Search, ArrowRight, ShoppingBag, Clock, MapPin, ExternalLink } from 'lucide-react'
import { useStore } from '@/lib/contexts/store-context'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/orders/order-status-badge'
import type { Order, OrderItem } from '@/lib/types/order'

interface OrderDetails extends Order {
  order_items?: OrderItem[]
}

export default function StoreOrdersPage() {
  const { store, formatPrice } = useStore()
  const baseUrl = `/${store.slug}`
  
  const [searchQuery, setSearchQuery] = useState('')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchQuery.trim()) {
      setError('Please enter an order number')
      return
    }
    
    setLoading(true)
    setError('')
    setSearched(true)
    
    try {
      const response = await fetch(`/api/orders/lookup/${searchQuery.trim()}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Order not found. Please check the order number.')
        } else {
          setError('Failed to fetch order details')
        }
        setOrder(null)
        return
      }
      
      const data = await response.json()
      setOrder(data.order)
      setError('')
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search for order')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 
        className="text-3xl md:text-4xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Track Your Order
      </h1>
      <p className="text-gray-600 mb-8">
        Enter your order number to view order details and track shipping status.
      </p>
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter order number (e.g., ORD-1234567890-ABCDE)"
              className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading ? 'Searching...' : 'Track Order'}
          </button>
        </div>
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </form>
      
      {/* Order Details */}
      {order && (
        <div className="bg-white border rounded-lg overflow-hidden">
          {/* Order Header */}
          <div className="p-6 border-b bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Order Number</p>
                <p className="text-xl font-bold font-mono">{order.order_number}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Placed on {formatDate(order.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PaymentStatusBadge status={order.payment_status} />
                <OrderStatusBadge status={order.order_status} />
              </div>
            </div>
          </div>
          
          {/* Order Progress */}
          <div className="p-6 border-b">
            <h3 className="font-semibold mb-4">Order Progress</h3>
            <div className="flex items-center justify-between">
              {['processing', 'packed', 'shipped', 'delivered'].map((step, index) => {
                // Database status order: unfulfilled → processing → packed → shipped → out_for_delivery → delivered
                const statusOrder = ['unfulfilled', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered']
                const currentIndex = statusOrder.indexOf(order.order_status)
                const stepIndex = statusOrder.indexOf(step)
                const isCompleted = stepIndex <= currentIndex
                const isCurrent = step === order.order_status
                
                return (
                  <div key={step} className="flex-1 flex flex-col items-center relative">
                    {/* Connector Line */}
                    {index > 0 && (
                      <div 
                        className={`absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                    {index < 3 && (
                      <div 
                        className={`absolute left-1/2 right-0 top-4 h-0.5 -translate-y-1/2 ${
                          stepIndex < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                    
                    {/* Circle */}
                    <div 
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : isCurrent
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted && stepIndex < currentIndex ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    {/* Label */}
                    <span className={`text-xs mt-2 capitalize ${
                      isCompleted || isCurrent ? 'text-gray-900 font-medium' : 'text-gray-500'
                    }`}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Tracking Info */}
          {order.tracking_number && (
            <div className="p-6 border-b bg-blue-50">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Tracking Information</p>
                  <p className="text-sm text-blue-700">
                    {order.courier_name && `${order.courier_name}: `}
                    <span className="font-mono">{order.tracking_number}</span>
                  </p>
                  {order.courier_name && (
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(order.courier_name + ' tracking ' + order.tracking_number)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:underline mt-1"
                    >
                      Track Shipment <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Order Items */}
          <div className="p-6 border-b">
            <h3 className="font-semibold mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_title}
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
                  <p className="font-semibold">{formatPrice(item.total_price)}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Pricing Summary */}
          <div className="p-6 border-b">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span>{order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost)}</span>
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
          </div>
          
          {/* Shipping Address */}
          {order.shipping_address && (
            <div className="p-6">
              <h3 className="font-semibold mb-3">Shipping Address</h3>
              <div className="text-gray-700 text-sm">
                <p className="font-medium">{order.shipping_address.name}</p>
                <p>{order.shipping_address.address_line1}</p>
                {order.shipping_address.address_line2 && (
                  <p>{order.shipping_address.address_line2}</p>
                )}
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
                </p>
                <p className="mt-1">Phone: {order.shipping_address.phone}</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Empty State */}
      {searched && !order && !loading && !error && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t find an order with that number. Please check and try again.
          </p>
        </div>
      )}
      
      {/* No Search Yet */}
      {!searched && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-bold mb-2">Enter Your Order Number</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            You can find your order number in the confirmation email we sent you after placing your order.
          </p>
        </div>
      )}
      
      {/* Continue Shopping */}
      <div className="mt-8 text-center">
        <Link
          href={`${baseUrl}/products`}
          className="inline-flex items-center text-sm font-medium hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          Continue Shopping
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </div>
  )
}
