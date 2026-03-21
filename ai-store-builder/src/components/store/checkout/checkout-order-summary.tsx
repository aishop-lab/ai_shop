'use client'

import Image from 'next/image'
import {
  Lock,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { DeliveryEstimateInline } from '../delivery-estimate'
import type { CartItem } from '@/lib/contexts/store-context'

interface CheckoutOrderSummaryProps {
  cart: CartItem[]
  cartSubtotal: number
  shippingCost: number
  codFee: number
  finalTotal: number
  formatPrice: (price: number) => string
  storeId: string
  pincode: string
  showMobileSummary: boolean
  onToggleMobileSummary: () => void
}

function CartItemRow({
  item,
  formatPrice,
  size = 'default',
}: {
  item: CartItem
  formatPrice: (price: number) => string
  size?: 'default' | 'small'
}) {
  const imgSize = size === 'small' ? 'w-12 h-12' : 'w-16 h-16'
  const badgeSize = size === 'small' ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs'
  const iconSize = size === 'small' ? 'w-4 h-4' : 'w-6 h-6'
  const lineClamp = size === 'small' ? 'line-clamp-1' : 'line-clamp-2'
  const gap = size === 'small' ? 'gap-3' : 'gap-4'

  return (
    <div className={`flex ${gap}`}>
      <div className={`relative ${imgSize} rounded-lg overflow-hidden bg-gray-100 flex-shrink-0`}>
        {item.product.images?.[0]?.url ? (
          <Image
            src={item.product.images[0].url}
            alt={item.product.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className={`${iconSize} text-gray-300`} />
          </div>
        )}
        <span className={`absolute -top-1 -right-1 ${badgeSize} bg-gray-600 text-white rounded-full flex items-center justify-center`}>
          {item.quantity}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${lineClamp}`}>{item.product.title}</p>
        {item.variant && (
          <p className="text-xs text-gray-500">
            {Object.values(item.variant.attributes).join(' / ')}
          </p>
        )}
      </div>
      <p className="font-medium text-sm">
        {formatPrice((item.variant?.price ?? item.product.price) * item.quantity)}
      </p>
    </div>
  )
}

export default function CheckoutOrderSummary({
  cart,
  cartSubtotal,
  shippingCost,
  codFee,
  finalTotal,
  formatPrice,
  storeId,
  pincode,
  showMobileSummary,
  onToggleMobileSummary,
}: CheckoutOrderSummaryProps) {
  return (
    <>
      {/* Order Summary - Desktop (Sticky) */}
      <div className="hidden lg:block lg:pl-8 lg:border-l">
        <div className="sticky top-8">
          <h2 className="text-lg font-semibold mb-6">Order Summary</h2>

          <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
            {cart.map((item) => (
              <CartItemRow
                key={`${item.product.id}-${item.variant?.id || 'default'}`}
                item={item}
                formatPrice={formatPrice}
              />
            ))}
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPrice(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <div className="text-gray-600">
                <span>Shipping</span>
                {pincode.length === 6 && (
                  <DeliveryEstimateInline
                    storeId={storeId}
                    pincode={pincode}
                    className="ml-1"
                  />
                )}
              </div>
              <span>
                {shippingCost === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  formatPrice(shippingCost)
                )}
              </span>
            </div>
            {codFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">COD Fee</span>
                <span>{formatPrice(codFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-3 border-t">
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium">Secure Checkout</p>
                <p className="text-xs text-gray-500">Your payment information is encrypted</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary - Mobile (Collapsible) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <button
          type="button"
          onClick={onToggleMobileSummary}
          className="w-full px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gray-500" />
            <span className="font-medium">
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
              {formatPrice(finalTotal)}
            </span>
            {showMobileSummary ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </div>
        </button>

        {showMobileSummary && (
          <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto border-t">
            <div className="space-y-3 py-4">
              {cart.map((item) => (
                <CartItemRow
                  key={`${item.product.id}-${item.variant?.id || 'default'}`}
                  item={item}
                  formatPrice={formatPrice}
                  size="small"
                />
              ))}
            </div>

            <div className="space-y-2 pt-3 border-t text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>
                  {shippingCost === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>
              {pincode.length === 6 && (
                <div className="text-xs text-gray-500">
                  <DeliveryEstimateInline
                    storeId={storeId}
                    pincode={pincode}
                  />
                </div>
              )}
              {codFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">COD Fee</span>
                  <span>{formatPrice(codFee)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Spacer for mobile fixed summary */}
      <div className="lg:hidden h-16" />
    </>
  )
}
