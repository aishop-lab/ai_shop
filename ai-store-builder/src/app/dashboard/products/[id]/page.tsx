'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Package,
  BarChart3,
  ImagePlus,
  X,
  Loader2,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/lib/contexts/auth-context'

interface ProductImage {
  id: string
  url: string
  thumbnail_url?: string
  position: number
  alt_text?: string
}

interface Product {
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
  status: 'draft' | 'active' | 'archived'
  images: ProductImage[]
  categories: string[]
  tags: string[]
  weight?: number
  requires_shipping: boolean
  has_variants?: boolean
  created_at: string
  updated_at: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { store } = useAuth()

  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [compareAtPrice, setCompareAtPrice] = useState<number | undefined>()
  const [costPerItem, setCostPerItem] = useState<number | undefined>()
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState<number>(0)
  const [trackQuantity, setTrackQuantity] = useState(true)
  const [weight, setWeight] = useState<number | undefined>()
  const [requiresShipping, setRequiresShipping] = useState(true)
  const [featured, setFeatured] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [categoryInput, setCategoryInput] = useState('')
  const [tagInput, setTagInput] = useState('')

  // Fetch product
  const fetchProduct = useCallback(async () => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      const data = await response.json()

      if (data.success && data.product) {
        const p = data.product
        setProduct(p)
        setTitle(p.title)
        setDescription(p.description || '')
        setPrice(p.price || 0)
        setCompareAtPrice(p.compare_at_price)
        setCostPerItem(p.cost_per_item)
        setSku(p.sku || '')
        setBarcode(p.barcode || '')
        setQuantity(p.quantity || 0)
        setTrackQuantity(p.track_quantity ?? true)
        setWeight(p.weight)
        setRequiresShipping(p.requires_shipping ?? true)
        setFeatured(p.featured ?? false)
        setCategories(p.categories || [])
        setTags(p.tags || [])
      } else {
        toast({
          title: 'Error',
          description: 'Product not found',
          variant: 'destructive'
        })
        router.push('/dashboard/products')
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

  // Save product
  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Product title is required',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price,
          compare_at_price: compareAtPrice || null,
          cost_per_item: costPerItem || null,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          quantity,
          track_quantity: trackQuantity,
          weight: weight || null,
          requires_shipping: requiresShipping,
          featured,
          categories,
          tags
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Saved',
          description: 'Product updated successfully'
        })
        setProduct(data.product)
      } else {
        throw new Error(data.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Error',
        description: 'Failed to save product',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Toggle publish status
  const handleToggleStatus = async () => {
    if (!product) return

    const newStatus = product.status === 'active' ? 'draft' : 'active'

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()

      if (data.success) {
        setProduct({ ...product, status: newStatus })
        toast({
          title: newStatus === 'active' ? 'Published' : 'Unpublished',
          description: `Product is now ${newStatus === 'active' ? 'visible' : 'hidden'} in your store`
        })
      }
    } catch (error) {
      console.error('Status toggle error:', error)
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      })
    }
  }

  // Delete product
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Deleted',
          description: 'Product has been deleted'
        })
        router.push('/dashboard/products')
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  // Add category
  const addCategory = () => {
    const cat = categoryInput.trim()
    if (cat && !categories.includes(cat)) {
      setCategories([...categories, cat])
      setCategoryInput('')
    }
  }

  // Remove category
  const removeCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat))
  }

  // Add tag
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  // Remove tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

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

  const profit = price - (costPerItem || 0)
  const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                {product.status === 'active' ? 'Published' : 'Draft'}
              </Badge>
              {product.quantity <= 0 && product.track_quantity && (
                <Badge variant="destructive">Out of Stock</Badge>
              )}
              {product.quantity > 0 && product.quantity <= 5 && product.track_quantity && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Low Stock ({product.quantity})
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {store && (
            <Link href={`/${store.slug}/products/${product.id}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View in Store
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
          >
            {product.status === 'active' ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Publish
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Product title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Product description"
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="compareAtPrice">Compare at Price</Label>
                      <Input
                        id="compareAtPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={compareAtPrice || ''}
                        onChange={(e) => setCompareAtPrice(parseFloat(e.target.value) || undefined)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="costPerItem">Cost per Item</Label>
                      <Input
                        id="costPerItem"
                        type="number"
                        min="0"
                        step="0.01"
                        value={costPerItem || ''}
                        onChange={(e) => setCostPerItem(parseFloat(e.target.value) || undefined)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {costPerItem !== undefined && costPerItem > 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Profit: <span className="font-medium text-foreground">₹{profit.toFixed(2)}</span>
                        {' · '}
                        Margin: <span className="font-medium text-foreground">{margin}%</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <div className="flex gap-2">
                      <Input
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        placeholder="Add category"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                      />
                      <Button type="button" variant="outline" onClick={addCategory}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="gap-1">
                          {cat}
                          <button onClick={() => removeCategory(cat)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add tag"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" variant="outline" onClick={addTag}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="gap-1">
                          {tag}
                          <button onClick={() => removeTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="featured">Featured Product</Label>
                    <Switch
                      id="featured"
                      checked={featured}
                      onCheckedChange={setFeatured}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shipping</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="requiresShipping">Requires Shipping</Label>
                    <Switch
                      id="requiresShipping"
                      checked={requiresShipping}
                      onCheckedChange={setRequiresShipping}
                    />
                  </div>
                  {requiresShipping && (
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        min="0"
                        step="0.01"
                        value={weight || ''}
                        onChange={(e) => setWeight(parseFloat(e.target.value) || undefined)}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete Product
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>
                Manage product images. The first image will be used as the main image.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden border">
                    <Image
                      src={image.thumbnail_url || image.url}
                      alt={image.alt_text || `Product image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    {index === 0 && (
                      <Badge className="absolute top-2 left-2">Main</Badge>
                    )}
                  </div>
                ))}
                <button className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImagePlus className="w-8 h-8 mb-2" />
                  <span className="text-sm">Add Image</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>
                Track and manage your product inventory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Track Quantity</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable inventory tracking for this product
                  </p>
                </div>
                <Switch
                  checked={trackQuantity}
                  onCheckedChange={setTrackQuantity}
                />
              </div>

              {trackQuantity && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Current Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Stock Keeping Unit"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="UPC, EAN, ISBN, etc."
                    />
                  </div>

                  {quantity <= 0 && (
                    <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">Out of Stock</p>
                        <p className="text-sm text-muted-foreground">
                          This product will not be available for purchase.
                        </p>
                      </div>
                    </div>
                  )}

                  {quantity > 0 && quantity <= 5 && (
                    <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-medium text-orange-600">Low Stock Warning</p>
                        <p className="text-sm text-muted-foreground">
                          Only {quantity} units remaining. Consider restocking soon.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Inventory Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Product Analytics</CardTitle>
              <CardDescription>
                View performance metrics for this product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-sm">Total Views</span>
                  </div>
                  <p className="text-2xl font-bold">--</p>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Package className="w-4 h-4" />
                    <span className="text-sm">Units Sold</span>
                  </div>
                  <p className="text-2xl font-bold">--</p>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-sm">Revenue</span>
                  </div>
                  <p className="text-2xl font-bold">--</p>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
              </div>
              <div className="mt-6 p-8 border rounded-lg text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Detailed analytics coming soon</p>
                <p className="text-sm">Track views, conversions, and revenue for this product</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
