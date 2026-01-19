import { cn } from '@/lib/utils'

type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

interface StatusConfig {
  color: string
  label: string
}

const orderStatusConfig: Record<OrderStatus, StatusConfig> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
  processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', label: 'Shipped' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  refunded: { color: 'bg-gray-100 text-gray-800', label: 'Refunded' }
}

const paymentStatusConfig: Record<PaymentStatus, StatusConfig> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Payment Pending' },
  paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
  failed: { color: 'bg-red-100 text-red-800', label: 'Payment Failed' },
  refunded: { color: 'bg-gray-100 text-gray-800', label: 'Refunded' }
}

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = orderStatusConfig[status] || orderStatusConfig.pending

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus
  className?: string
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const config = paymentStatusConfig[status] || paymentStatusConfig.pending

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}

// Export types for external use
export type { OrderStatus, PaymentStatus }
