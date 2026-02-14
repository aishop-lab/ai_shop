'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowRight,
  Upload,
  ExternalLink,
  Package,
} from 'lucide-react'

interface OnboardingMigrationStepProps {
  storeId: string
  onSkip: () => void
}

export function OnboardingMigrationStep({
  storeId,
  onSkip,
}: OnboardingMigrationStepProps) {
  const [shopifyUrl, setShopifyUrl] = useState('')

  const handleShopifyImport = () => {
    if (!shopifyUrl.trim()) return
    window.location.href = `/api/migration/shopify/auth?store_id=${storeId}&shop=${encodeURIComponent(shopifyUrl.trim())}`
  }

  const handleEtsyImport = () => {
    window.location.href = `/api/migration/etsy/auth?store_id=${storeId}`
  }

  return (
    <Card className="p-6 border-primary/20 bg-primary/5">
      <CardContent className="p-0 space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">
            Import Products from an Existing Store
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Already selling on another platform? Import your entire product catalog in one click.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Shopify */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-[#95BF47]/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-[#95BF47]" />
              </div>
              <span className="font-medium">Shopify</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-shopify-url" className="text-xs">
                Store URL
              </Label>
              <Input
                id="onboarding-shopify-url"
                placeholder="myshop.myshopify.com"
                value={shopifyUrl}
                onChange={(e) => setShopifyUrl(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleShopifyImport}
              disabled={!shopifyUrl.trim()}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Import from Shopify
            </Button>
          </div>

          {/* Etsy */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-[#F1641E]/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-[#F1641E]" />
              </div>
              <span className="font-medium">Etsy</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Connect your Etsy account to import all listings and shop sections.
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={handleEtsyImport}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Import from Etsy
            </Button>
          </div>
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            Skip, I&apos;ll add products manually
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
