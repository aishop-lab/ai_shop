'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Package, Folder, Play, ShoppingCart, Users, Tag } from 'lucide-react'

interface MigrationConfigProps {
  migrationId: string
  platform: string
  shopName: string
  onStart: (config: {
    import_products: boolean
    import_collections: boolean
    import_orders: boolean
    import_customers: boolean
    import_coupons: boolean
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
  const [importOrders, setImportOrders] = useState(true)
  const [importCustomers, setImportCustomers] = useState(true)
  const [importCoupons, setImportCoupons] = useState(true)
  const [productStatus, setProductStatus] = useState<'draft' | 'active'>('draft')

  const isShopify = platform === 'shopify'

  const handleStart = () => {
    onStart({
      import_products: importProducts,
      import_collections: importCollections,
      import_orders: isShopify ? importOrders : false,
      import_customers: isShopify ? importCustomers : false,
      import_coupons: isShopify ? importCoupons : false,
      product_status: productStatus,
    })
  }

  const nothingSelected = !importProducts && !importCollections &&
    !(isShopify && importOrders) && !(isShopify && importCustomers) && !(isShopify && importCoupons)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Configure Import
        </CardTitle>
        <CardDescription>
          Choose what to import from {shopName} ({isShopify ? 'Shopify' : 'Etsy'})
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
                  {isShopify ? 'Shopify collections' : 'Etsy shop sections'}
                </p>
              </div>
            </div>
            <Switch
              checked={importCollections}
              onCheckedChange={setImportCollections}
            />
          </div>

          {isShopify && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Customers</Label>
                    <p className="text-xs text-muted-foreground">
                      Customer accounts and saved addresses
                    </p>
                  </div>
                </div>
                <Switch
                  checked={importCustomers}
                  onCheckedChange={setImportCustomers}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Coupons</Label>
                    <p className="text-xs text-muted-foreground">
                      Discount codes (percentage, fixed amount, free shipping)
                    </p>
                  </div>
                </div>
                <Switch
                  checked={importCoupons}
                  onCheckedChange={setImportCoupons}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Orders</Label>
                    <p className="text-xs text-muted-foreground">
                      Order history with line items and customer links
                    </p>
                  </div>
                </div>
                <Switch
                  checked={importOrders}
                  onCheckedChange={setImportOrders}
                />
              </div>
            </>
          )}
        </div>

        {/* Product status */}
        {importProducts && (
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
        )}

        {/* Start button */}
        <Button
          onClick={handleStart}
          disabled={nothingSelected || starting}
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
