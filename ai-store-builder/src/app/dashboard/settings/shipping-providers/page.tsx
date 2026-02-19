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
      case 'shippo':
        return '🚢'
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
            Step-by-step instructions to get credentials for each shipping provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Shiprocket Guide */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🚀</span>
              <span className="font-semibold text-lg">Shiprocket</span>
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Easiest Setup</span>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">
                Shiprocket is the easiest to set up - just use your login credentials.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-800">Steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Go to{' '}
                    <a
                      href="https://app.shiprocket.in/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      app.shiprocket.in/register
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and create an account
                  </li>
                  <li>Complete phone/email verification</li>
                  <li>Add your pickup address in Shiprocket dashboard under <strong>Settings → Pickup Address</strong></li>
                  <li>Come back here and enter your <strong>Shiprocket login email</strong> and <strong>password</strong></li>
                  <li>Enter the pickup location name exactly as you created it in Shiprocket</li>
                </ol>
              </div>
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">
                  Use the same email and password you use to login to Shiprocket. No API key required.
                </p>
              </div>
            </div>
          </div>

          {/* Delhivery Guide */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📦</span>
              <span className="font-semibold text-lg">Delhivery</span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Requires Approval</span>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">
                Delhivery requires you to apply for a business account and get approved for API access.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-800">Steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Go to{' '}
                    <a
                      href="https://www.delhivery.com/seller-signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      delhivery.com/seller-signup
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and register as a seller
                  </li>
                  <li>Complete KYC verification (PAN, GST, bank details)</li>
                  <li>Wait for account approval (usually 2-3 business days)</li>
                  <li>
                    Once approved, login to{' '}
                    <a
                      href="https://track.delhivery.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      track.delhivery.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Go to <strong>Settings → API Setup</strong> or contact support to get your API Token</li>
                  <li>Copy your <strong>Client Name</strong> from the dashboard</li>
                  <li>Come back here and enter your API Token and Client Name</li>
                </ol>
              </div>
              <div className="flex items-start gap-2 text-blue-700 bg-blue-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">
                  If you can&apos;t find API settings, email <strong>support@delhivery.com</strong> or call <strong>011-4891-1111</strong> and request API access.
                </p>
              </div>
            </div>
          </div>

          {/* Blue Dart Guide */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">✈️</span>
              <span className="font-semibold text-lg">Blue Dart</span>
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Enterprise</span>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">
                Blue Dart provides API access for business accounts with regular shipping volume.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-800">Steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Visit{' '}
                    <a
                      href="https://www.bluedart.com/customer-service-contact-us"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      bluedart.com/contact-us
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and fill the inquiry form
                  </li>
                  <li>Select &quot;I want to ship with Blue Dart&quot; as inquiry type</li>
                  <li>A sales representative will contact you within 24-48 hours</li>
                  <li>After signing the service agreement, request API access</li>
                  <li>
                    Blue Dart will provide: <strong>API Key</strong>, <strong>Client Code</strong>, <strong>License Key</strong>, and <strong>Login ID</strong>
                  </li>
                  <li>Come back here and enter all four credentials</li>
                </ol>
              </div>
              <div className="flex items-start gap-2 text-purple-700 bg-purple-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">
                  You can also call Blue Dart at <strong>1860-233-1234</strong> for faster onboarding. Mention you need NetConnect API access.
                </p>
              </div>
            </div>
          </div>

          {/* Shippo Guide */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🚢</span>
              <span className="font-semibold text-lg">Shippo</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">US Shipping</span>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">
                Shippo connects you to USPS, UPS, FedEx, and DHL with a single API token. Best for US-based stores.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-800">Steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Go to{' '}
                    <a
                      href="https://apps.goshippo.com/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      apps.goshippo.com/register
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and create a free account
                  </li>
                  <li>Verify your email address</li>
                  <li>Add your <strong>warehouse / pickup address</strong> in Shippo under <strong>Settings → Addresses</strong></li>
                  <li>
                    Go to{' '}
                    <a
                      href="https://apps.goshippo.com/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      Settings → API
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and copy your <strong>Live API Token</strong> (starts with <code className="bg-gray-200 px-1 rounded">shippo_live_</code>)
                  </li>
                  <li>Come back here and paste the API Token</li>
                  <li>(Optional) Connect your own USPS, UPS, or FedEx carrier accounts in Shippo for negotiated rates</li>
                </ol>
              </div>
              <div className="flex items-start gap-2 text-indigo-700 bg-indigo-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">
                  Shippo offers free USPS rates out of the box. For UPS/FedEx discounted rates, connect your carrier accounts in the{' '}
                  <a
                    href="https://apps.goshippo.com/settings/carriers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Shippo Carriers settings
                  </a>.
                  For testing, use a token starting with <code className="bg-indigo-100 px-1 rounded">shippo_test_</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Self Delivery Guide */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏠</span>
              <span className="font-semibold text-lg">Self Delivery</span>
              <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">No Setup Required</span>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                Handle deliveries yourself without any shipping provider. Perfect for local deliveries,
                in-store pickup, or if you have your own delivery staff.
              </p>
              <p className="mt-2">
                Just select &quot;Self Delivery&quot; when adding a provider - no credentials needed.
              </p>
            </div>
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
