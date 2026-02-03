'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  MapPin,
  Truck,
  Package,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { ShippingZone, ShippingConfig } from '@/lib/types/store'
import { INDIAN_STATES, SHIPPING_ZONE_TEMPLATES } from '@/lib/types/store'
import { validateZoneConfig, getZoneSummary } from '@/lib/shipping/zones'

interface StoreShippingSettings {
  free_shipping_threshold: number
  flat_rate_national: number
  cod_enabled: boolean
  cod_fee: number
  config?: ShippingConfig
}

export default function ShippingSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState<StoreShippingSettings>({
    free_shipping_threshold: 999,
    flat_rate_national: 49,
    cod_enabled: true,
    cod_fee: 20,
    config: {
      use_zones: false,
      zones: [],
    },
  })

  const [expandedZone, setExpandedZone] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/dashboard/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.store?.settings?.shipping) {
          setSettings({
            ...settings,
            ...data.store.settings.shipping,
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast.error('Failed to load shipping settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validate zones if enabled
    if (settings.config?.use_zones && settings.config.zones?.length) {
      const validation = validateZoneConfig(settings.config.zones)
      if (!validation.valid) {
        toast.error(validation.errors[0])
        return
      }
    }

    setSaving(true)
    try {
      const response = await fetch('/api/dashboard/settings/shipping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        toast.success('Shipping settings saved!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const addZone = (template?: keyof typeof SHIPPING_ZONE_TEMPLATES) => {
    const zones = settings.config?.zones || []
    const newZone: ShippingZone = {
      id: `zone-${Date.now()}`,
      name: template ? SHIPPING_ZONE_TEMPLATES[template].name : 'New Zone',
      type: 'states',
      states: template ? SHIPPING_ZONE_TEMPLATES[template].states : [],
      flat_rate: settings.flat_rate_national,
      cod_available: settings.cod_enabled,
      cod_fee: settings.cod_fee,
      estimated_days: template ? SHIPPING_ZONE_TEMPLATES[template].estimated_days : 5,
    }

    setSettings({
      ...settings,
      config: {
        ...settings.config,
        use_zones: true,
        zones: [...zones, newZone],
      },
    })
    setExpandedZone(newZone.id)
  }

  const removeZone = (zoneId: string) => {
    const zones = settings.config?.zones?.filter((z) => z.id !== zoneId) || []
    setSettings({
      ...settings,
      config: {
        use_zones: settings.config?.use_zones ?? false,
        ...settings.config,
        zones,
      },
    })
  }

  const updateZone = (zoneId: string, updates: Partial<ShippingZone>) => {
    const zones =
      settings.config?.zones?.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)) || []
    setSettings({
      ...settings,
      config: {
        use_zones: settings.config?.use_zones ?? false,
        ...settings.config,
        zones,
      },
    })
  }

  const toggleZoneState = (zoneId: string, stateCode: string) => {
    const zone = settings.config?.zones?.find((z) => z.id === zoneId)
    if (!zone) return

    const states = zone.states || []
    const newStates = states.includes(stateCode)
      ? states.filter((s) => s !== stateCode)
      : [...states, stateCode]

    updateZone(zoneId, { states: newStates })
  }

  const addDefaultZone = () => {
    const zones = settings.config?.zones || []
    const hasDefault = zones.some((z) => z.is_default)
    if (hasDefault) {
      toast.error('A default zone already exists')
      return
    }

    const newZone: ShippingZone = {
      id: `zone-default-${Date.now()}`,
      name: 'Rest of India',
      type: 'default',
      flat_rate: settings.flat_rate_national,
      cod_available: settings.cod_enabled,
      cod_fee: settings.cod_fee,
      estimated_days: 7,
      is_default: true,
    }

    setSettings({
      ...settings,
      config: {
        ...settings.config,
        use_zones: true,
        zones: [...zones, newZone],
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Settings
          </Link>
          <h1 className="text-2xl font-bold">Shipping Settings</h1>
          <p className="text-gray-600 mt-1">Configure shipping rates and delivery zones</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Basic Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Basic Shipping Settings
          </CardTitle>
          <CardDescription>
            Default shipping rates applied when zones are not configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="flat_rate">Flat Rate (All India)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>
                <Input
                  id="flat_rate"
                  type="number"
                  value={settings.flat_rate_national}
                  onChange={(e) =>
                    setSettings({ ...settings, flat_rate_national: parseInt(e.target.value) || 0 })
                  }
                  className="pl-8"
                  min={0}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="free_threshold">Free Shipping Above</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>
                <Input
                  id="free_threshold"
                  type="number"
                  value={settings.free_shipping_threshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      free_shipping_threshold: parseInt(e.target.value) || 0,
                    })
                  }
                  className="pl-8"
                  min={0}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Set to 0 to disable free shipping
              </p>
            </div>
          </div>

          {/* COD Settings */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label htmlFor="cod_enabled" className="text-base font-medium">
                  Cash on Delivery
                </Label>
                <p className="text-sm text-gray-500">Allow customers to pay on delivery</p>
              </div>
              <Switch
                id="cod_enabled"
                checked={settings.cod_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, cod_enabled: checked })}
              />
            </div>

            {settings.cod_enabled && (
              <div className="ml-0 md:ml-6">
                <Label htmlFor="cod_fee">COD Fee</Label>
                <div className="relative mt-1 max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <Input
                    id="cod_fee"
                    type="number"
                    value={settings.cod_fee}
                    onChange={(e) =>
                      setSettings({ ...settings, cod_fee: parseInt(e.target.value) || 0 })
                    }
                    className="pl-8"
                    min={0}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Additional fee charged for COD orders
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Zone-based Shipping */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Zones
              </CardTitle>
              <CardDescription>
                Set different rates for different regions
              </CardDescription>
            </div>
            <Switch
              checked={settings.config?.use_zones || false}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  config: { ...settings.config, use_zones: checked, zones: settings.config?.zones || [] },
                })
              }
            />
          </div>
        </CardHeader>

        {settings.config?.use_zones && (
          <CardContent>
            {/* Quick Add Templates */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-2 block">Quick Add Zone</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SHIPPING_ZONE_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => addZone(key as keyof typeof SHIPPING_ZONE_TEMPLATES)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {template.name}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={addDefaultZone}>
                  <Plus className="w-3 h-3 mr-1" />
                  Default Zone
                </Button>
              </div>
            </div>

            {/* Zone List */}
            <div className="space-y-4">
              {settings.config?.zones?.map((zone) => (
                <div key={zone.id} className="border rounded-lg">
                  {/* Zone Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{zone.name}</p>
                        <p className="text-sm text-gray-500">
                          {zone.is_default
                            ? 'Covers all unmatched areas'
                            : zone.type === 'states'
                            ? `${zone.states?.length || 0} states`
                            : `${zone.pincodes?.length || 0} pincodes`}
                          {' • '}₹{zone.flat_rate}
                          {zone.estimated_days && ` • ${zone.estimated_days} days`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeZone(zone.id)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {expandedZone === zone.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Zone Details (Expanded) */}
                  {expandedZone === zone.id && (
                    <div className="border-t p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label htmlFor={`zone-name-${zone.id}`}>Zone Name</Label>
                          <Input
                            id={`zone-name-${zone.id}`}
                            value={zone.name}
                            onChange={(e) => updateZone(zone.id, { name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`zone-rate-${zone.id}`}>Flat Rate</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                              ₹
                            </span>
                            <Input
                              id={`zone-rate-${zone.id}`}
                              type="number"
                              value={zone.flat_rate}
                              onChange={(e) =>
                                updateZone(zone.id, { flat_rate: parseInt(e.target.value) || 0 })
                              }
                              className="pl-8"
                              min={0}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label htmlFor={`zone-days-${zone.id}`}>Estimated Delivery (days)</Label>
                          <Input
                            id={`zone-days-${zone.id}`}
                            type="number"
                            value={zone.estimated_days || ''}
                            onChange={(e) =>
                              updateZone(zone.id, {
                                estimated_days: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            className="mt-1"
                            min={1}
                            placeholder="5"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`zone-threshold-${zone.id}`}>Free Shipping Above</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                              ₹
                            </span>
                            <Input
                              id={`zone-threshold-${zone.id}`}
                              type="number"
                              value={zone.free_shipping_threshold ?? settings.free_shipping_threshold}
                              onChange={(e) =>
                                updateZone(zone.id, {
                                  free_shipping_threshold: parseInt(e.target.value) || undefined,
                                })
                              }
                              className="pl-8"
                              min={0}
                              placeholder="Use global setting"
                            />
                          </div>
                        </div>
                      </div>

                      {/* COD for this zone */}
                      <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border">
                        <div>
                          <Label className="font-medium">COD Available</Label>
                          <p className="text-xs text-gray-500">Allow COD for this zone</p>
                        </div>
                        <Switch
                          checked={zone.cod_available ?? settings.cod_enabled}
                          onCheckedChange={(checked) =>
                            updateZone(zone.id, { cod_available: checked })
                          }
                        />
                      </div>

                      {/* State Selection (only for state-based zones) */}
                      {!zone.is_default && zone.type === 'states' && (
                        <div>
                          <Label className="mb-2 block">Select States</Label>
                          <div className="max-h-48 overflow-y-auto border rounded-lg bg-white p-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                            {INDIAN_STATES.map((state) => (
                              <label
                                key={state.code}
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                                  zone.states?.includes(state.code)
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={zone.states?.includes(state.code) || false}
                                  onChange={() => toggleZoneState(zone.id, state.code)}
                                  className="rounded border-gray-300"
                                />
                                <span className="truncate" title={state.name}>
                                  {state.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {zone.is_default && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p>
                            This is the default zone. It will be used for any location not covered by
                            other zones.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {(!settings.config?.zones || settings.config.zones.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No shipping zones configured</p>
                  <p className="text-sm mt-1">
                    Use the quick add buttons above to create zones, or the flat rate will be used
                  </p>
                </div>
              )}
            </div>

            {/* Add Custom Zone */}
            <Button variant="outline" className="w-full mt-4" onClick={() => addZone()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Zone
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Weight-based Pricing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Weight-based Pricing
              </CardTitle>
              <CardDescription>
                Add extra charges based on package weight
              </CardDescription>
            </div>
            <Switch
              checked={settings.config?.weight_based?.enabled || false}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  config: {
                    use_zones: settings.config?.use_zones ?? false,
                    ...settings.config,
                    weight_based: {
                      enabled: checked,
                      base_weight: settings.config?.weight_based?.base_weight || 0.5,
                      per_kg_rate: settings.config?.weight_based?.per_kg_rate || 30,
                    },
                  },
                })
              }
            />
          </div>
        </CardHeader>

        {settings.config?.weight_based?.enabled && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="base_weight">Base Weight (kg)</Label>
                <Input
                  id="base_weight"
                  type="number"
                  value={settings.config.weight_based.base_weight}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      config: {
                        use_zones: settings.config?.use_zones ?? false,
                        ...settings.config,
                        weight_based: {
                          ...settings.config?.weight_based,
                          enabled: true,
                          base_weight: parseFloat(e.target.value) || 0,
                          per_kg_rate: settings.config?.weight_based?.per_kg_rate ?? 30,
                        },
                      },
                    })
                  }
                  className="mt-1"
                  min={0}
                  step={0.1}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Weight included in base shipping rate
                </p>
              </div>
              <div>
                <Label htmlFor="per_kg">Additional Rate per kg</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <Input
                    id="per_kg"
                    type="number"
                    value={settings.config.weight_based.per_kg_rate}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        config: {
                          use_zones: settings.config?.use_zones ?? false,
                          ...settings.config,
                          weight_based: {
                            ...settings.config?.weight_based,
                            enabled: true,
                            base_weight: settings.config?.weight_based?.base_weight ?? 0.5,
                            per_kg_rate: parseInt(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="pl-8"
                    min={0}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Extra charge for each kg above base weight
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Example:</strong> With base weight of{' '}
                {settings.config.weight_based.base_weight} kg and ₹
                {settings.config.weight_based.per_kg_rate}/kg rate:
              </p>
              <ul className="text-sm text-gray-500 mt-2 space-y-1">
                <li>• 0.5 kg package: No extra charge (within base weight)</li>
                <li>
                  • 2 kg package: +₹
                  {Math.ceil(2 - settings.config.weight_based.base_weight) *
                    settings.config.weight_based.per_kg_rate}{' '}
                  extra
                </li>
                <li>
                  • 5 kg package: +₹
                  {Math.ceil(5 - settings.config.weight_based.base_weight) *
                    settings.config.weight_based.per_kg_rate}{' '}
                  extra
                </li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
