'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import ProductForm from '@/components/products/product-form'
import type { VariantOptionInput, VariantInput } from '@/lib/types/variant'
import type { ProductImage } from '@/lib/types/store'

interface ProductData {
  id: string
  store_id: string
  title: string
  description: string
  price: number
  compare_at_price?: number
  cost_per_item?: number
  sku?: string
  barcode?: string
  quantity: number
  track_quantity: boolean
  featured: boolean
  status: string
  images: ProductImage[]
  categories: string[]
  tags: string[]
  weight?: number
  requires_shipping: boolean
  has_variants?: boolean
  variant_options?: Array<{
    id: string
    product_id: string
    name: string
    position: number
    values: Array<{
      id: string
      option_id: string
      value: string
      color_code?: string
      position: number
    }>
  }>
  variants?: Array<{
    id: string
    product_id: string
    attributes: Record<string, string>
    price?: number | null
    compare_at_price?: number | null
    sku?: string
    barcode?: string
    quantity: number
    track_quantity: boolean
    weight?: number
    image_id?: string
    is_default: boolean
    status: 'active' | 'disabled'
  }>
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const productId = params.id as string

  const [product, setProduct] = useState<ProductData | null>(null)
  const [storeSlug, setStoreSlug] = useState<string>('')
  const [storeId, setStoreId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const fetchProduct = useCallback(async () => {
    try {
      const [productRes, settingsRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch('/api/dashboard/settings')
      ])

      const productData = await productRes.json()
      const settingsData = await settingsRes.json()

      if (productData.success && productData.product) {
        setProduct(productData.product)
        setStoreId(productData.product.store_id)
      } else {
        toast({
          title: 'Error',
          description: 'Product not found',
          variant: 'destructive'
        })
        router.push('/dashboard/products')
        return
      }

      if (settingsData.store?.slug) {
        setStoreSlug(settingsData.store.slug)
      }
    } catch (error) {
      console.error('Failed to fetch product:', error)
      toast({
        title: 'Error',
        description: 'Failed to load product',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [productId, router]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Product not found</h2>
        <Link href="/dashboard/products">
          <Button variant="outline">Back to Products</Button>
        </Link>
      </div>
    )
  }

  // Transform variant options for ProductForm
  const initialVariantOptions: VariantOptionInput[] | undefined = product.variant_options?.map(opt => ({
    id: opt.id,
    name: opt.name,
    position: opt.position,
    values: opt.values.map(val => ({
      id: val.id,
      value: val.value,
      color_code: val.color_code,
      position: val.position
    }))
  }))

  // Transform variants for ProductForm
  const initialVariants: VariantInput[] | undefined = product.variants?.map(v => ({
    id: v.id,
    attributes: v.attributes,
    price: v.price,
    compare_at_price: v.compare_at_price,
    sku: v.sku,
    barcode: v.barcode,
    quantity: v.quantity,
    track_quantity: v.track_quantity,
    weight: v.weight,
    image_id: v.image_id,
    is_default: v.is_default,
    status: v.status
  }))

  return (
    <div className="space-y-6">
      {/* Back button + title */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{product.title}</h1>
      </div>

      <ProductForm
        storeId={storeId}
        productId={productId}
        mode="edit"
        storeSlug={storeSlug}
        productStatus={product.status}
        initialData={{
          title: product.title,
          description: product.description || '',
          price: product.price || 0,
          compare_at_price: product.compare_at_price || null,
          cost_per_item: product.cost_per_item || null,
          sku: product.sku || '',
          barcode: product.barcode || '',
          quantity: product.quantity || 0,
          track_quantity: product.track_quantity ?? true,
          weight: product.weight || null,
          requires_shipping: product.requires_shipping ?? true,
          categories: product.categories || [],
          tags: product.tags || []
        }}
        initialImages={product.images}
        initialVariantOptions={initialVariantOptions}
        initialVariants={initialVariants}
      />
    </div>
  )
}
