'use client'

import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/orders/order-status-badge'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import type { Order } from '@/lib/types/order'

interface RecentOrdersTableProps {
  orders: Order[]
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ShoppingCart className="h-10 w-10 mb-2 opacity-50" />
        <p className="text-sm">No orders yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.slice(0, 5).map((order) => (
        <Link
          key={order.id}
          href={`/dashboard/orders/${order.id}`}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">#{order.order_number}</p>
              <OrderStatusBadge status={order.order_status} />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {order.customer_name} • {format(new Date(order.created_at), 'MMM dd, h:mm a')}
            </p>
          </div>
          <div className="text-right flex items-center gap-2">
            <div>
              <p className="text-sm font-semibold">{formatCurrency(order.total_amount, 'INR')}</p>
              <PaymentStatusBadge status={order.payment_status} />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      ))}

      {orders.length > 5 && (
        <Link
          href="/dashboard/orders"
          className="flex items-center justify-center gap-2 text-sm text-primary hover:underline pt-2"
        >
          View all orders
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}
