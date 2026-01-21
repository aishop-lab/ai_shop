'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'

interface RebuildStoreDialogProps {
  storeName: string
  storeSlug: string
}

export function RebuildStoreDialog({ storeName, storeSlug }: RebuildStoreDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmed = confirmText.toLowerCase() === storeName.toLowerCase()

  const handleRebuild = async () => {
    if (!isConfirmed) return

    setIsDeleting(true)

    try {
      const response = await fetch('/api/onboarding/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Store deleted. Redirecting to onboarding...')
        // Small delay to show the toast
        setTimeout(() => {
          router.push('/onboarding')
        }, 1000)
      } else {
        toast.error(data.error || 'Failed to reset store')
        setIsDeleting(false)
      }
    } catch (error) {
      console.error('Rebuild error:', error)
      toast.error('Something went wrong. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Rebuild Store
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Rebuild Store from Scratch
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                This action will permanently delete your store and all associated data:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>All products and product images</li>
                <li>All orders and order history</li>
                <li>Customer data and reviews</li>
                <li>Coupons and promotions</li>
                <li>Store settings and branding</li>
                <li>Legal policies</li>
              </ul>
              <p className="font-medium text-destructive">
                This action cannot be undone.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirm-name" className="text-foreground">
                  Type <span className="font-semibold">{storeName}</span> to confirm:
                </Label>
                <Input
                  id="confirm-name"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={storeName}
                  className="mt-2"
                  disabled={isDeleting}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleRebuild}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete & Rebuild'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
