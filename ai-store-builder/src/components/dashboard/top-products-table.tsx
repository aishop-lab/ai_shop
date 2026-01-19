'use client'

import Image from 'next/image'
import { Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TopProduct {
  product_id: string
  product_title: string
  product_image?: string
  quantity: number
  revenue: number
}

interface TopProductsTableProps {
  products: TopProduct[]
}

export default function TopProductsTable({ products }: TopProductsTableProps) {
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Package className="h-10 w-10 mb-2 opacity-50" />
        <p className="text-sm">No sales data yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {products.map((product, index) => (
        <div key={product.product_id} className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground w-4">
            {index + 1}
          </span>
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {product.product_image ? (
              <Image
                src={product.product_image}
                alt={product.product_title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{product.product_title}</p>
            <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{formatCurrency(product.revenue, 'INR')}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
