'use client'

import Link from 'next/link'
import { AlertTriangle, Package, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface LowStockProduct {
  id: string
  title: string
  quantity: number
}

interface LowStockAlertProps {
  products: LowStockProduct[]
}

export default function LowStockAlert({ products }: LowStockAlertProps) {
  if (!products || products.length === 0) {
    return null
  }

  const outOfStock = products.filter(p => p.quantity === 0)
  const lowStock = products.filter(p => p.quantity > 0)

  return (
    <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-900">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">Inventory Alert</AlertTitle>
      <AlertDescription className="text-orange-700">
        <div className="mt-2 space-y-2">
          {outOfStock.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold uppercase text-red-600 bg-red-100 px-2 py-0.5 rounded">
                Out of Stock
              </span>
              <span className="text-sm">
                {outOfStock.map(p => p.title).join(', ')}
              </span>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold uppercase text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                Low Stock
              </span>
              <span className="text-sm">
                {lowStock.map(p => `${p.title} (${p.quantity} left)`).join(', ')}
              </span>
            </div>
          )}
          <Link href="/dashboard/products?filter=low_stock" className="inline-block mt-2">
            <Button variant="outline" size="sm" className="border-orange-300 hover:bg-orange-100">
              <Package className="h-4 w-4 mr-2" />
              Manage Inventory
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  )
}
