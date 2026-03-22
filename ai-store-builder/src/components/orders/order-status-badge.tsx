import { cn } from '@/lib/utils'

// Database fulfillment_status values
type OrderStatus =
  | 'unfulfilled'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  // Legacy values for backwards compatibility
  | 'pending'
  | 'confirmed'
  | 'refunded'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

interface StatusConfig {
  color: string
  label: string
}

const orderStatusConfig: Record<OrderStatus, StatusConfig> = {
  // Database status values
  unfulfilled: { color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400', label: 'New Order' },
  processing: { color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400', label: 'Processing' },
  packed: { color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400', label: 'Packed' },
  shipped: { color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400', label: 'Shipped' },
  out_for_delivery: { color: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400', label: 'Out for Delivery' },
  delivered: { color: 'bg-green-500/15 text-green-700 dark:text-green-400', label: 'Delivered' },
  returned: { color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400', label: 'Returned' },
  cancelled: { color: 'bg-red-500/15 text-red-700 dark:text-red-400', label: 'Cancelled' },
  // Legacy status values
  pending: { color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400', label: 'Pending' },
  confirmed: { color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400', label: 'Confirmed' },
  refunded: { color: 'bg-gray-500/15 text-gray-700 dark:text-gray-400', label: 'Refunded' }
}

const paymentStatusConfig: Record<PaymentStatus, StatusConfig> = {
  pending: { color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400', label: 'Payment Pending' },
  paid: { color: 'bg-green-500/15 text-green-700 dark:text-green-400', label: 'Paid' },
  failed: { color: 'bg-red-500/15 text-red-700 dark:text-red-400', label: 'Payment Failed' },
  refunded: { color: 'bg-gray-500/15 text-gray-700 dark:text-gray-400', label: 'Refunded' }
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
