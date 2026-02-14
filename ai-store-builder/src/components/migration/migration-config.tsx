'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Package, Folder, Play } from 'lucide-react'

interface MigrationConfigProps {
  migrationId: string
  platform: string
  shopName: string
  onStart: (config: {
    import_products: boolean
    import_collections: boolean
    product_status: 'draft' | 'active'
  }) => void
  starting: boolean
}

export function MigrationConfig({
  migrationId,
  platform,
  shopName,
  onStart,
  starting,
}: MigrationConfigProps) {
  const [importProducts, setImportProducts] = useState(true)
  const [importCollections, setImportCollections] = useState(true)
  const [productStatus, setProductStatus] = useState<'draft' | 'active'>('draft')

  const handleStart = () => {
    onStart({
      import_products: importProducts,
      import_collections: importCollections,
      product_status: productStatus,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Configure Import
        </CardTitle>
        <CardDescription>
          Choose what to import from {shopName} ({platform === 'shopify' ? 'Shopify' : 'Etsy'})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* What to import */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">What to import</h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Products</Label>
                <p className="text-xs text-muted-foreground">
                  Titles, descriptions, prices, images, variants
                </p>
              </div>
            </div>
            <Switch
              checked={importProducts}
              onCheckedChange={setImportProducts}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Collections</Label>
                <p className="text-xs text-muted-foreground">
                  {platform === 'shopify' ? 'Shopify collections' : 'Etsy shop sections'}
                </p>
              </div>
            </div>
            <Switch
              checked={importCollections}
              onCheckedChange={setImportCollections}
            />
          </div>
        </div>

        {/* Product status */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-sm font-medium">Imported product status</h4>
          <RadioGroup
            value={productStatus}
            onValueChange={(v) => setProductStatus(v as 'draft' | 'active')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="draft" id="draft" />
              <Label htmlFor="draft" className="font-normal">
                Draft — Review before publishing
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="active" id="active" />
              <Label htmlFor="active" className="font-normal">
                Active — Publish immediately
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Start button */}
        <Button
          onClick={handleStart}
          disabled={(!importProducts && !importCollections) || starting}
          className="w-full"
          size="lg"
        >
          {starting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Start Migration
        </Button>
      </CardContent>
    </Card>
  )
}
