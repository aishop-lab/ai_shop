'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProductForm from '@/components/products/product-form'

export default function NewProductPage() {
  const router = useRouter()
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const response = await fetch('/api/auth/user')
        const data = await response.json()
        
        if (!data.user) {
          router.push('/sign-in')
          return
        }
        
        if (!data.store) {
          setError('Please complete store setup first')
          return
        }
        
        setStoreId(data.store.id)
      } catch (err) {
        console.error('Failed to fetch store:', err)
        setError('Failed to load store information')
      } finally {
        setLoading(false)
      }
    }
    
    fetchStore()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-xl font-semibold mb-2">Unable to Add Product</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/onboarding">
          <Button>Complete Store Setup</Button>
        </Link>
      </div>
    )
  }

  if (!storeId) {
    return null
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Add New Product</h1>
        <p className="text-muted-foreground mt-1">
          Upload images and fill in product details
        </p>
      </div>

      {/* Form */}
      <ProductForm storeId={storeId} mode="create" />
    </div>
  )
}
