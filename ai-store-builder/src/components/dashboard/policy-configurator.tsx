'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Package, Truck, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { PolicyConfig, ReturnPolicyConfig, ShippingPolicyConfig } from '@/lib/types/store'

interface PolicyConfiguratorProps {
  initialConfig: PolicyConfig
  onConfigSaved: () => void
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
]

export function PolicyConfigurator({ initialConfig, onConfigSaved }: PolicyConfiguratorProps) {
  const [config, setConfig] = useState<PolicyConfig>(initialConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'returns' | 'shipping'>('returns')

  const updateReturns = (updates: Partial<ReturnPolicyConfig>) => {
    setConfig(prev => ({
      ...prev,
      returns: { ...prev.returns, ...updates }
    }))
  }

  const updateShipping = (updates: Partial<ShippingPolicyConfig>) => {
    setConfig(prev => ({
      ...prev,
      shipping: { ...prev.shipping, ...updates }
    }))
  }

  const toggleState = (state: string) => {
    const currentStates = config.shipping.specific_states || []
    const newStates = currentStates.includes(state)
      ? currentStates.filter(s => s !== state)
      : [...currentStates, state]
    updateShipping({ specific_states: newStates })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/stores/policy-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration')
      }

      if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success('Policy configuration saved and policies regenerated!')
      }

      onConfigSaved()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveSection('returns')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeSection === 'returns'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          Return Policy
        </button>
        <button
          onClick={() => setActiveSection('shipping')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeSection === 'shipping'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Truck className="h-4 w-4" />
          Shipping Policy
        </button>
      </div>

      {/* Return Policy Section */}
      {activeSection === 'returns' && (
        <div className="space-y-6">
          {/* Returns Enabled */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Do you accept returns?</CardTitle>
              <CardDescription>
                Choose whether customers can return products they&apos;ve purchased
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={config.returns.enabled ? 'yes' : 'no'}
                onValueChange={(v) => {
                  updateReturns({
                    enabled: v === 'yes',
                    window_days: v === 'yes' ? 14 : 0
                  })
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="returns-yes" />
                  <Label htmlFor="returns-yes">Yes, I accept returns</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="returns-no" />
                  <Label htmlFor="returns-no">No, all sales are final</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {config.returns.enabled && (
            <>
              {/* Return Window */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Return Window</CardTitle>
                  <CardDescription>
                    How many days do customers have to return an item?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={String(config.returns.window_days)}
                    onValueChange={(v) => updateReturns({ window_days: Number(v) as 7 | 14 | 30 })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="7" id="window-7" />
                      <Label htmlFor="window-7">7 days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="14" id="window-14" />
                      <Label htmlFor="window-14">14 days (Recommended)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="30" id="window-30" />
                      <Label htmlFor="window-30">30 days</Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Return Condition */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Return Condition</CardTitle>
                  <CardDescription>
                    What condition must items be in to be returned?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={config.returns.condition}
                    onValueChange={(v) => updateReturns({ condition: v as ReturnPolicyConfig['condition'] })}
                  >
                    <div className="flex items-start space-x-2 py-1">
                      <RadioGroupItem value="unused_with_tags" id="condition-unused" className="mt-1" />
                      <div>
                        <Label htmlFor="condition-unused">Unused with tags only</Label>
                        <p className="text-sm text-muted-foreground">
                          Items must be unused, unworn, with original tags attached
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 py-1">
                      <RadioGroupItem value="opened_ok" id="condition-opened" className="mt-1" />
                      <div>
                        <Label htmlFor="condition-opened">Opened but unused</Label>
                        <p className="text-sm text-muted-foreground">
                          Packaging can be opened but item must be in original condition
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 py-1">
                      <RadioGroupItem value="any_condition" id="condition-any" className="mt-1" />
                      <div>
                        <Label htmlFor="condition-any">Any condition</Label>
                        <p className="text-sm text-muted-foreground">
                          Accept returns regardless of condition (partial refunds for damaged items)
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Refund Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Refund Method</CardTitle>
                  <CardDescription>
                    How will customers be refunded?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={config.returns.refund_method}
                    onValueChange={(v) => updateReturns({ refund_method: v as ReturnPolicyConfig['refund_method'] })}
                  >
                    <div className="flex items-start space-x-2 py-1">
                      <RadioGroupItem value="original_payment" id="refund-original" className="mt-1" />
                      <div>
                        <Label htmlFor="refund-original">Original payment method</Label>
                        <p className="text-sm text-muted-foreground">
                          Refund to the same payment method used for purchase
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 py-1">
                      <RadioGroupItem value="store_credit" id="refund-credit" className="mt-1" />
                      <div>
                        <Label htmlFor="refund-credit">Store credit only</Label>
                        <p className="text-sm text-muted-foreground">
                          Issue store credit for future purchases
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 py-1">
                      <RadioGroupItem value="exchange_only" id="refund-exchange" className="mt-1" />
                      <div>
                        <Label htmlFor="refund-exchange">Exchange only</Label>
                        <p className="text-sm text-muted-foreground">
                          Only allow exchanges for other products, no cash refunds
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 py-1">
                      <RadioGroupItem value="buyer_choice" id="refund-choice" className="mt-1" />
                      <div>
                        <Label htmlFor="refund-choice">Buyer&apos;s choice</Label>
                        <p className="text-sm text-muted-foreground">
                          Let customers choose between refund, store credit, or exchange
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Shipping Policy Section */}
      {activeSection === 'shipping' && (
        <div className="space-y-6">
          {/* Free Shipping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Free Shipping</CardTitle>
              <CardDescription>
                Do you offer free shipping?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={config.shipping.free_shipping}
                onValueChange={(v) => updateShipping({ free_shipping: v as ShippingPolicyConfig['free_shipping'] })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="always" id="ship-always" />
                  <Label htmlFor="ship-always">Always free shipping</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="threshold" id="ship-threshold" />
                  <Label htmlFor="ship-threshold">Free above a certain amount</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="never" id="ship-never" />
                  <Label htmlFor="ship-never">Never (always charge shipping)</Label>
                </div>
              </RadioGroup>

              {config.shipping.free_shipping === 'threshold' && (
                <div className="pl-6 pt-2">
                  <Label htmlFor="threshold-amount">Free shipping threshold</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">₹</span>
                    <Input
                      id="threshold-amount"
                      type="number"
                      value={config.shipping.free_threshold}
                      onChange={(e) => updateShipping({ free_threshold: Number(e.target.value) || 0 })}
                      className="w-32"
                      min={0}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Common thresholds: ₹499, ₹999, ₹1499
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Speed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Speed</CardTitle>
              <CardDescription>
                What&apos;s your typical delivery timeframe?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={config.shipping.delivery_speed}
                onValueChange={(v) => updateShipping({ delivery_speed: v as ShippingPolicyConfig['delivery_speed'] })}
              >
                <div className="flex items-start space-x-2 py-1">
                  <RadioGroupItem value="express" id="speed-express" className="mt-1" />
                  <div>
                    <Label htmlFor="speed-express">Express</Label>
                    <p className="text-sm text-muted-foreground">
                      1-2 days (metros), 2-3 days (other cities)
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2 py-1">
                  <RadioGroupItem value="standard" id="speed-standard" className="mt-1" />
                  <div>
                    <Label htmlFor="speed-standard">Standard (Recommended)</Label>
                    <p className="text-sm text-muted-foreground">
                      3-5 days (metros), 5-7 days (other cities)
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2 py-1">
                  <RadioGroupItem value="economy" id="speed-economy" className="mt-1" />
                  <div>
                    <Label htmlFor="speed-economy">Economy</Label>
                    <p className="text-sm text-muted-foreground">
                      5-7 days (metros), 7-10 days (other cities)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Processing Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processing Time</CardTitle>
              <CardDescription>
                How long does it take to prepare and ship an order?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={String(config.shipping.processing_days)}
                onValueChange={(v) => updateShipping({ processing_days: Number(v) as 1 | 2 | 3 | 5 })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="process-1" />
                  <Label htmlFor="process-1">Same/Next business day</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="process-2" />
                  <Label htmlFor="process-2">1-2 business days (Recommended)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="process-3" />
                  <Label htmlFor="process-3">2-3 business days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="process-5" />
                  <Label htmlFor="process-5">3-5 business days (for made-to-order items)</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Shipping Regions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shipping Regions</CardTitle>
              <CardDescription>
                Where do you deliver?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={config.shipping.regions}
                onValueChange={(v) => updateShipping({ regions: v as ShippingPolicyConfig['regions'] })}
              >
                <div className="flex items-start space-x-2 py-1">
                  <RadioGroupItem value="pan_india" id="region-pan" className="mt-1" />
                  <div>
                    <Label htmlFor="region-pan">Pan India</Label>
                    <p className="text-sm text-muted-foreground">
                      Deliver to all serviceable PIN codes in India
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2 py-1">
                  <RadioGroupItem value="metro_only" id="region-metro" className="mt-1" />
                  <div>
                    <Label htmlFor="region-metro">Metro cities only</Label>
                    <p className="text-sm text-muted-foreground">
                      Delhi NCR, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2 py-1">
                  <RadioGroupItem value="specific_states" id="region-states" className="mt-1" />
                  <div>
                    <Label htmlFor="region-states">Specific states</Label>
                    <p className="text-sm text-muted-foreground">
                      Select the states you deliver to
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {config.shipping.regions === 'specific_states' && (
                <div className="pl-6 pt-2 border-t">
                  <Label className="mb-2 block">Select states:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                    {INDIAN_STATES.map((state) => (
                      <div key={state} className="flex items-center space-x-2">
                        <Checkbox
                          id={`state-${state}`}
                          checked={config.shipping.specific_states?.includes(state) || false}
                          onCheckedChange={() => toggleState(state)}
                        />
                        <label htmlFor={`state-${state}`} className="text-sm cursor-pointer">
                          {state}
                        </label>
                      </div>
                    ))}
                  </div>
                  {(config.shipping.specific_states?.length || 0) > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {config.shipping.specific_states?.length} states
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
        <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-700 dark:text-blue-300">
            Policies will be automatically regenerated
          </p>
          <p className="text-blue-600 dark:text-blue-400 mt-1">
            When you save these settings, your Return and Shipping policies will be updated to reflect your choices.
            You can still manually edit the policy text afterwards.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-[200px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving & Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Save & Regenerate Policies
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
