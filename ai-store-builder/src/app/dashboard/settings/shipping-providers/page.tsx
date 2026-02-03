'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Truck,
  Plus,
  Check,
  X,
  Loader2,
  Settings2,
  Trash2,
  ExternalLink,
  AlertCircle,
  Package,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProviderInfo {
  name: string
  description: string
  requiredFields: { key: string; label: string; type: 'text' | 'password' }[]
}

interface ConfiguredProvider {
  provider: string
  isActive: boolean
  isDefault: boolean
  pickupLocation?: string
  createdAt: string
  updatedAt: string
  maskedCredentials: Record<string, string>
}

interface ShippingSettings {
  providers: ConfiguredProvider[]
  defaultProvider: string | null
  autoCreateShipment: boolean
  preferredCourierStrategy: 'cheapest' | 'fastest'
  defaultPackageDimensions: {
    length: number
    breadth: number
    height: number
    weight: number
  }
  availableProviders: Record<string, ProviderInfo>
}

export default function ShippingProvidersPage() {
  const [settings, setSettings] = useState<ShippingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [pickupLocation, setPickupLocation] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [skipValidation, setSkipValidation] = useState(false)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/settings/shipping-providers')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        toast.error('Failed to load shipping settings')
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast.error('Failed to load shipping settings')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProvider = async () => {
    if (!selectedProvider || !settings) return

    const providerInfo = settings.availableProviders[selectedProvider]
    if (!providerInfo) return

    // Validate required fields
    for (const field of providerInfo.requiredFields) {
      if (!credentials[field.key]) {
        toast.error(`${field.label} is required`)
        return
      }
    }

    try {
      setValidating(true)
      const response = await fetch('/api/dashboard/settings/shipping-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          credentials,
          pickupLocation,
          isDefault,
          validate: !skipValidation,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Provider connected successfully')
        setShowAddDialog(false)
        setSelectedProvider(null)
        setCredentials({})
        setPickupLocation('')
        setIsDefault(false)
        setSkipValidation(false)
        fetchSettings()
      } else {
        toast.error(data.error || 'Failed to connect provider')
      }
    } catch (error) {
      console.error('Failed to add provider:', error)
      toast.error('Failed to connect provider')
    } finally {
      setValidating(false)
    }
  }

  const handleRemoveProvider = async (provider: string) => {
    if (!confirm(`Are you sure you want to remove this provider?`)) return

    try {
      const response = await fetch(
        `/api/dashboard/settings/shipping-providers?provider=${provider}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast.success('Provider removed successfully')
        fetchSettings()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove provider')
      }
    } catch (error) {
      console.error('Failed to remove provider:', error)
      toast.error('Failed to remove provider')
    }
  }

  const handleUpdateSettings = async (updates: Partial<ShippingSettings>) => {
    try {
      setSaving(true)
      const response = await fetch('/api/dashboard/settings/shipping-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast.success('Settings updated')
        fetchSettings()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'shiprocket':
        return '🚀'
      case 'delhivery':
        return '📦'
      case 'bluedart':
        return '✈️'
      case 'self':
        return '🏠'
      default:
        return '📦'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const unconfiguredProviders = settings
    ? Object.keys(settings.availableProviders).filter(
        p => !settings.providers.some(cp => cp.provider === p)
      )
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Shipping Providers</h1>
            <p className="text-gray-600 mt-1">
              Connect your shipping accounts for automatic shipment creation
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} disabled={unconfiguredProviders.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Multi-Provider Support</p>
              <p className="text-sm text-blue-700 mt-1">
                Connect multiple shipping providers and choose the best one for each order.
                You can also handle deliveries yourself without any provider.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configured Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Providers</CardTitle>
          <CardDescription>
            Your shipping accounts for creating shipments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings?.providers.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No providers connected</p>
              <p className="text-sm text-gray-500 mt-1">
                Add a shipping provider to enable automatic shipment creation
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {settings?.providers.map((provider) => (
                <div
                  key={provider.provider}
                  className={cn(
                    'border rounded-lg p-4',
                    provider.isDefault && 'border-primary bg-primary/5'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getProviderIcon(provider.provider)}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {settings?.availableProviders[provider.provider]?.name || provider.provider}
                          </h3>
                          {provider.isDefault && (
                            <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                              Default
                            </span>
                          )}
                          {provider.isActive ? (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {settings?.availableProviders[provider.provider]?.description}
                        </p>
                        {provider.pickupLocation && (
                          <p className="text-sm text-gray-500 mt-1">
                            Pickup: {provider.pickupLocation}
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {Object.entries(provider.maskedCredentials).map(([key, value]) => (
                            <span key={key}>
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!provider.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateSettings({ defaultProvider: provider.provider })}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveProvider(provider.provider)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Settings</CardTitle>
          <CardDescription>
            Configure how shipments are created for your orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Create Shipment */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Auto-create Shipments</Label>
              <p className="text-sm text-gray-500 mt-0.5">
                Automatically create shipments when orders are placed
              </p>
              {!settings?.providers.length && (
                <p className="text-xs text-orange-600 mt-1">
                  Add a shipping provider first to enable this feature
                </p>
              )}
            </div>
            <Switch
              checked={settings?.autoCreateShipment || false}
              onCheckedChange={(checked) => handleUpdateSettings({ autoCreateShipment: checked })}
              disabled={saving || !settings?.providers.length}
            />
          </div>

          {/* Courier Strategy */}
          <div className="space-y-2">
            <Label className="font-medium">Courier Selection Strategy</Label>
            <p className="text-sm text-gray-500">
              How to select courier when multiple options are available
            </p>
            <Select
              value={settings?.preferredCourierStrategy || 'cheapest'}
              onValueChange={(value) =>
                handleUpdateSettings({ preferredCourierStrategy: value as 'cheapest' | 'fastest' })
              }
              disabled={saving}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cheapest">Cheapest Rate</SelectItem>
                <SelectItem value="fastest">Fastest Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Default Package Dimensions */}
          <div className="space-y-3">
            <Label className="font-medium">Default Package Dimensions</Label>
            <p className="text-sm text-gray-500">
              Used when product dimensions are not specified
            </p>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Length (cm)</Label>
                <Input
                  type="number"
                  value={settings?.defaultPackageDimensions?.length || 20}
                  onChange={(e) =>
                    handleUpdateSettings({
                      defaultPackageDimensions: {
                        ...settings?.defaultPackageDimensions!,
                        length: parseFloat(e.target.value),
                      },
                    })
                  }
                  disabled={saving}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Breadth (cm)</Label>
                <Input
                  type="number"
                  value={settings?.defaultPackageDimensions?.breadth || 15}
                  onChange={(e) =>
                    handleUpdateSettings({
                      defaultPackageDimensions: {
                        ...settings?.defaultPackageDimensions!,
                        breadth: parseFloat(e.target.value),
                      },
                    })
                  }
                  disabled={saving}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Height (cm)</Label>
                <Input
                  type="number"
                  value={settings?.defaultPackageDimensions?.height || 10}
                  onChange={(e) =>
                    handleUpdateSettings({
                      defaultPackageDimensions: {
                        ...settings?.defaultPackageDimensions!,
                        height: parseFloat(e.target.value),
                      },
                    })
                  }
                  disabled={saving}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings?.defaultPackageDimensions?.weight || 0.5}
                  onChange={(e) =>
                    handleUpdateSettings({
                      defaultPackageDimensions: {
                        ...settings?.defaultPackageDimensions!,
                        weight: parseFloat(e.target.value),
                      },
                    })
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Setup Guides */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Guides</CardTitle>
          <CardDescription>
            Learn how to get credentials for each shipping provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://www.shiprocket.in"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🚀</span>
                <span className="font-medium">Shiprocket</span>
                <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Sign up at shiprocket.in, then use your login email and password.
              </p>
            </a>
            <a
              href="https://www.delhivery.com/partners"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📦</span>
                <span className="font-medium">Delhivery</span>
                <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Apply for API access at partners portal. Get API token after approval.
              </p>
            </a>
            <a
              href="https://www.bluedart.com/web-services"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">✈️</span>
                <span className="font-medium">Blue Dart</span>
                <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Contact Blue Dart sales team for API credentials.
              </p>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Add Provider Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Shipping Provider</DialogTitle>
            <DialogDescription>
              Connect a shipping provider to enable automatic shipment creation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>Select Provider</Label>
              <Select value={selectedProvider || ''} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
                  {unconfiguredProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      <div className="flex items-center gap-2">
                        <span>{getProviderIcon(provider)}</span>
                        <span>{settings?.availableProviders[provider]?.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Credential Fields */}
            {selectedProvider && settings?.availableProviders[selectedProvider] && (
              <>
                {settings.availableProviders[selectedProvider].requiredFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type}
                      value={credentials[field.key] || ''}
                      onChange={(e) =>
                        setCredentials({ ...credentials, [field.key]: e.target.value })
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}

                {/* Pickup Location */}
                {selectedProvider !== 'self' && (
                  <div className="space-y-2">
                    <Label>Pickup Location Name</Label>
                    <Input
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="Primary"
                    />
                    <p className="text-xs text-gray-500">
                      Name of your pickup location as configured in {settings.availableProviders[selectedProvider].name}
                    </p>
                  </div>
                )}

                {/* Set as Default */}
                <div className="flex items-center gap-2">
                  <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                  <Label>Set as default provider</Label>
                </div>

                {/* Skip Validation */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Switch checked={skipValidation} onCheckedChange={setSkipValidation} />
                  <div>
                    <Label>Skip credential validation</Label>
                    <p className="text-xs text-gray-500">
                      Save without testing the connection (useful if API is temporarily unavailable)
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProvider} disabled={!selectedProvider || validating}>
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
