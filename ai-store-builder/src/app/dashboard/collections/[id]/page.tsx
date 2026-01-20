'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Upload, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ProductSelector } from '@/components/collections/product-selector'
import { useToast } from '@/lib/hooks/use-toast'

interface Collection {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  meta_title: string | null
  meta_description: string | null
  featured: boolean
  visible: boolean
  products: Array<{ id: string }>
}

export default function EditCollectionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    cover_image_url: '',
    meta_title: '',
    meta_description: '',
    featured: false,
    visible: true,
    product_ids: [] as string[]
  })

  useEffect(() => {
    fetchCollection()
  }, [id])

  const fetchCollection = async () => {
    try {
      const response = await fetch(`/api/dashboard/collections/${id}`)
      const data = await response.json()

      if (data.success && data.collection) {
        const c = data.collection
        setFormData({
          title: c.title || '',
          slug: c.slug || '',
          description: c.description || '',
          cover_image_url: c.cover_image_url || '',
          meta_title: c.meta_title || '',
          meta_description: c.meta_description || '',
          featured: c.featured || false,
          visible: c.visible !== false,
          product_ids: c.products?.map((p: { id: string }) => p.id) || []
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load collection',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/onboarding/upload-logo', {
        method: 'POST',
        body: formDataUpload
      })

      const data = await response.json()
      if (data.url) {
        setFormData((prev) => ({ ...prev, cover_image_url: data.url }))
        toast({
          title: 'Image uploaded',
          description: 'Cover image has been uploaded successfully'
        })
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload cover image',
        variant: 'destructive'
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Collection title is required',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      // Update collection details
      const response = await fetch(`/api/dashboard/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          description: formData.description || null,
          cover_image_url: formData.cover_image_url || null,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
          featured: formData.featured,
          visible: formData.visible
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update collection')
      }

      // Update products
      await fetch(`/api/dashboard/collections/${id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set',
          product_ids: formData.product_ids
        })
      })

      toast({
        title: 'Collection updated',
        description: 'Your changes have been saved'
      })

      router.push('/dashboard/collections')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update collection',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this collection? Products will not be deleted.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/dashboard/collections/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Collection deleted',
          description: 'The collection has been removed'
        })
        router.push('/dashboard/collections')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete collection',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/collections"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Collections
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit Collection</h1>
            <p className="text-muted-foreground">Update collection details and products</p>
          </div>
          <Link href={`/collections/${formData.slug}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Store
            </Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Collection Name *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated-from-title"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-start gap-4">
                {formData.cover_image_url ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={formData.cover_image_url}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cover_image_url: '' })}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <span className="sr-only">Remove</span>
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Upload</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({formData.product_ids.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSelector
              selectedIds={formData.product_ids}
              onChange={(ids) => setFormData({ ...formData, product_ids: ids })}
            />
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Visible</Label>
                <p className="text-sm text-muted-foreground">
                  Show this collection on your store
                </p>
              </div>
              <Switch
                checked={formData.visible}
                onCheckedChange={(checked) => setFormData({ ...formData, visible: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Featured</Label>
                <p className="text-sm text-muted-foreground">
                  Display prominently on your homepage
                </p>
              </div>
              <Switch
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta_title">Meta Title</Label>
              <Input
                id="meta_title"
                placeholder="SEO title (defaults to collection name)"
                value={formData.meta_title}
                onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta Description</Label>
              <Textarea
                id="meta_description"
                placeholder="SEO description"
                value={formData.meta_description}
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Collection
          </Button>

          <div className="flex items-center gap-4">
            <Link href="/dashboard/collections">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
