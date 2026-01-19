'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MoreVertical, Eye, Edit, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types/store'

interface ProductCardProps {
  product: Product
  storeSlug?: string
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
}

export default function ProductCard({ 
  product, 
  storeSlug,
  onDelete,
  onDuplicate 
}: ProductCardProps) {
  const primaryImage = product.images?.[0]?.thumbnail_url || product.images?.[0]?.url
  
  const statusStyles = {
    published: 'bg-green-500 text-white',
    draft: 'bg-yellow-500 text-white',
    archived: 'bg-gray-500 text-white'
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  return (
    <div className="group relative border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow">
      {/* Image */}
      <Link href={`/dashboard/products/${product.id}`}>
        <div className="aspect-square relative bg-muted">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
          
          {/* Status badge */}
          <div className="absolute top-2 left-2">
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              statusStyles[product.status as keyof typeof statusStyles] || statusStyles.draft
            )}>
              {product.status}
            </span>
          </div>

          {/* Featured badge */}
          {product.featured && (
            <div className="absolute top-2 right-2">
              <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
                Featured
              </span>
            </div>
          )}

          {/* Low stock warning */}
          {product.track_quantity && product.quantity <= 5 && product.quantity > 0 && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                Low Stock
              </span>
            </div>
          )}

          {/* Out of stock */}
          {product.track_quantity && product.quantity === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white text-sm font-medium px-3 py-1.5 rounded-full">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/dashboard/products/${product.id}`} className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors">
              {product.title}
            </h3>
          </Link>
          
          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {storeSlug && product.status === 'published' && (
                <DropdownMenuItem asChild>
                  <Link href={`/${storeSlug}/products/${product.id}`} target="_blank">
                    <Eye className="w-4 h-4 mr-2" />
                    View in Store
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/products/${product.id}`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(product.id)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(product.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>

        {/* Meta info */}
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          {product.sku && (
            <span>SKU: {product.sku}</span>
          )}
          {product.track_quantity && (
            <span>Qty: {product.quantity}</span>
          )}
        </div>

        {/* Categories */}
        {product.categories && product.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.categories.slice(0, 2).map((cat, i) => (
              <span
                key={i}
                className="text-xs bg-muted px-2 py-0.5 rounded-full"
              >
                {cat}
              </span>
            ))}
            {product.categories.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{product.categories.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
