'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, Check } from 'lucide-react'

interface PlatformConnectorProps {
  storeId: string
  connectedPlatform?: string | null
  connectedShopName?: string | null
  onConnected?: () => void
}

export function PlatformConnector({
  storeId,
  connectedPlatform,
  connectedShopName,
  onConnected,
}: PlatformConnectorProps) {
  const [shopifyUrl, setShopifyUrl] = useState('')
  const [connecting, setConnecting] = useState<'shopify' | 'etsy' | null>(null)

  const handleShopifyConnect = () => {
    if (!shopifyUrl.trim()) return
    setConnecting('shopify')
    // Redirect to OAuth flow
    window.location.href = `/api/migration/shopify/auth?store_id=${storeId}&shop=${encodeURIComponent(shopifyUrl.trim())}`
  }

  const handleEtsyConnect = () => {
    setConnecting('etsy')
    window.location.href = `/api/migration/etsy/auth?store_id=${storeId}`
  }

  if (connectedPlatform) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {connectedPlatform === 'shopify' ? 'Shopify' : 'Etsy'} Connected
                </CardTitle>
                <CardDescription>{connectedShopName}</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
              Connected
            </Badge>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Shopify Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#95BF47]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#95BF47]" fill="currentColor">
                <path d="M15.34 15.58c-.18-.1-2.67-1.28-2.67-1.28l-1.17-4.04s-.07-.23-.24-.36c-.17-.13-.4-.13-.4-.13h-1.73s-.34 0-.47.35c0 0-1.28 3.3-1.28 3.3l-.33 1.09s-.07.23.12.35c.19.12 2.67 1.35 2.67 1.35l1.15 3.96s.08.24.27.27c.19.03.35-.12.35-.12l3.6-4.38s.18-.22.13-.36zM12.78 5.12l-1.22-.47S10.38 8.73 10.34 8.9c-.03.17.13.22.13.22l.73.35 1.58-4.35z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg">Shopify</CardTitle>
              <CardDescription>Import from your Shopify store</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopify-url">Your Shopify Store URL</Label>
            <Input
              id="shopify-url"
              placeholder="myshop.myshopify.com"
              value={shopifyUrl}
              onChange={(e) => setShopifyUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleShopifyConnect()}
            />
          </div>
          <Button
            onClick={handleShopifyConnect}
            disabled={!shopifyUrl.trim() || connecting !== null}
            className="w-full"
          >
            {connecting === 'shopify' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Connect Shopify
          </Button>
        </CardContent>
      </Card>

      {/* Etsy Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#F1641E]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#F1641E]" fill="currentColor">
                <path d="M8.56 4.85c0-.37.3-.51.86-.51h3.27c2.02 0 2.83 1.05 3.2 2.83l.17.72h.68V3.31h-.68l-.37.78c-.37-.09-1.7-.37-3.27-.37H7.85c-1.33 0-2.11.78-2.11 1.7v10.28c0 .92.78 1.7 2.11 1.7h4.58c1.57 0 2.9-.28 3.27-.37l.37.78h.68v-4.58h-.68l-.17.72c-.37 1.78-1.18 2.83-3.2 2.83H9.42c-.56 0-.86-.14-.86-.51V12.3h3.22c1.47 0 1.93.72 2.11 2.11h.68V8.78h-.68c-.18 1.39-.64 2.11-2.11 2.11H8.56V4.85z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg">Etsy</CardTitle>
              <CardDescription>Import from your Etsy shop</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your Etsy account to import all your active listings, images, and shop sections.
          </p>
          <Button
            onClick={handleEtsyConnect}
            disabled={connecting !== null}
            className="w-full"
          >
            {connecting === 'etsy' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Connect Etsy
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
