'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Folder, MoreVertical, Eye, EyeOff, Star, Trash2, Edit, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'

interface Collection {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  featured: boolean
  visible: boolean
  product_count: number
  created_at: string
}

export default function CollectionsPage() {
  const { toast } = useToast()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/dashboard/collections')
      const data = await response.json()

      if (data.success) {
        setCollections(data.collections)
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error)
      toast({
        title: 'Error',
        description: 'Failed to load collections',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  const toggleVisibility = async (id: string, visible: boolean) => {
    try {
      const response = await fetch(`/api/dashboard/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !visible })
      })

      if (response.ok) {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, visible: !visible } : c))
        )
        toast({
          title: visible ? 'Collection hidden' : 'Collection visible',
          description: visible
            ? 'This collection is now hidden from your store'
            : 'This collection is now visible on your store'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update collection',
        variant: 'destructive'
      })
    }
  }

  const toggleFeatured = async (id: string, featured: boolean) => {
    try {
      const response = await fetch(`/api/dashboard/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !featured })
      })

      if (response.ok) {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, featured: !featured } : c))
        )
        toast({
          title: featured ? 'Removed from featured' : 'Added to featured',
          description: featured
            ? 'This collection is no longer featured'
            : 'This collection will be featured on your homepage'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update collection',
        variant: 'destructive'
      })
    }
  }

  const deleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection? Products will not be deleted.')) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard/collections/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCollections((prev) => prev.filter((c) => c.id !== id))
        toast({
          title: 'Collection deleted',
          description: 'The collection has been removed'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete collection',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Collections</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-muted" />
              <CardContent className="p-4">
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-muted-foreground">
            Group your products into collections for better organization
          </p>
        </div>
        <Link href="/dashboard/collections/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Collection
          </Button>
        </Link>
      </div>

      {collections.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Folder className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first collection to organize your products
          </p>
          <Link href="/dashboard/collections/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Card key={collection.id} className="overflow-hidden group">
              <Link href={`/dashboard/collections/${collection.id}`}>
                <div className="relative h-40 bg-muted">
                  {collection.cover_image_url ? (
                    <Image
                      src={collection.cover_image_url}
                      alt={collection.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Folder className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  {!collection.visible && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </Badge>
                    </div>
                  )}
                  {collection.featured && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-amber-500">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/collections/${collection.id}`}>
                      <h3 className="font-semibold truncate hover:text-primary">
                        {collection.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {collection.product_count} product{collection.product_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/collections/${collection.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/collections/${collection.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on store
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toggleVisibility(collection.id, collection.visible)}>
                        {collection.visible ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Show
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleFeatured(collection.id, collection.featured)}>
                        <Star className="h-4 w-4 mr-2" />
                        {collection.featured ? 'Remove from featured' : 'Add to featured'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => deleteCollection(collection.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
