'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Package,
  Upload,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Store,
  Rocket
} from 'lucide-react'

interface WelcomeModalProps {
  storeName: string
}

export function WelcomeModal({ storeName }: WelcomeModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Show modal if welcome=true query param is present
    if (searchParams.get('welcome') === 'true') {
      setIsOpen(true)
      // Clean up the URL without refreshing
      const url = new URL(window.location.href)
      url.searchParams.delete('welcome')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [searchParams])

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleAddProduct = () => {
    router.push('/dashboard/products/new')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard/products')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            🎉 Congratulations!
          </DialogTitle>
          <DialogDescription className="text-base">
            <span className="font-semibold text-foreground">{storeName}</span> is now live!
            <br />
            Let&apos;s add your first product to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Quick Add Product */}
          <button
            onClick={handleAddProduct}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-lg">Add Product with AI</h3>
              <p className="text-sm text-muted-foreground">
                Upload images and let AI fill in the details
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Bulk Upload */}
          <button
            onClick={handleGoToDashboard}
            className="w-full flex items-center gap-4 p-4 rounded-xl border hover:border-primary/50 hover:bg-muted/50 transition-all group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Bulk Upload via CSV</h3>
              <p className="text-sm text-muted-foreground">
                Import multiple products at once
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* View Dashboard */}
          <button
            onClick={handleGoToDashboard}
            className="w-full flex items-center gap-4 p-4 rounded-xl border hover:border-primary/50 hover:bg-muted/50 transition-all group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Go to Products Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Manage all your products in one place
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleAddProduct} size="lg" className="w-full">
            <Rocket className="h-4 w-4 mr-2" />
            Add Your First Product
          </Button>
          <Button variant="ghost" onClick={handleClose} className="w-full">
            I&apos;ll do this later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
