'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Store,
  Palette,
  Truck,
  CreditCard,
  Save,
  Loader2,
  ExternalLink,
  ArrowLeft,
  FileText,
  Database,
  Shield
} from 'lucide-react'
import { ColorAccessibilityChecker } from '@/components/ui/color-accessibility-checker'
import { LogoEditor } from '@/components/dashboard/logo-editor'

interface StoreSettings {
  id: string
  name: string
  slug: string
  description: string | null
  tagline: string | null
  logo_url: string | null
  contact_email: string | null
  contact_phone: string | null
  whatsapp_number: string | null
  instagram_handle: string | null
  brand_colors: {
    primary: string
    secondary: string
  }
  settings: {
    checkout?: {
      guest_checkout_enabled?: boolean
      phone_required?: boolean
    }
    shipping?: {
      free_shipping_threshold?: number
      flat_rate_national?: number
      cod_enabled?: boolean
      cod_fee?: number
    }
    payments?: {
      razorpay_enabled?: boolean
      stripe_enabled?: boolean
      upi_enabled?: boolean
    }
    ai_logo_generations?: number
  }
  status: string
  blueprint?: {
    business_category?: string[]
    brand_vibe?: string
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [store, setStore] = useState<StoreSettings | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    whatsapp_number: '',
    instagram_handle: '',
    primary_color: '#3B82F6',
    free_shipping_threshold: 999,
    flat_rate_national: 49,
    cod_enabled: true,
    cod_fee: 20,
    guest_checkout_enabled: true,
    phone_required: true
  })

  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.store) {
            setStore(data.store)
            setFormData({
              name: data.store.name || '',
              tagline: data.store.tagline || '',
              description: data.store.description || '',
              contact_email: data.store.contact_email || '',
              contact_phone: data.store.contact_phone || '',
              whatsapp_number: data.store.whatsapp_number || '',
              instagram_handle: data.store.instagram_handle || '',
              primary_color: data.store.brand_colors?.primary || '#3B82F6',
              free_shipping_threshold: data.store.settings?.shipping?.free_shipping_threshold || 999,
              flat_rate_national: data.store.settings?.shipping?.flat_rate_national || 49,
              cod_enabled: data.store.settings?.shipping?.cod_enabled ?? true,
              cod_fee: data.store.settings?.shipping?.cod_fee || 20,
              guest_checkout_enabled: data.store.settings?.checkout?.guest_checkout_enabled ?? true,
              phone_required: data.store.settings?.checkout?.phone_required ?? true
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch store:', error)
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    fetchStore()
  }, [])

  const handleSave = async () => {
    if (!store) return
    setSaving(true)

    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          tagline: formData.tagline,
          description: formData.description,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          whatsapp_number: formData.whatsapp_number,
          instagram_handle: formData.instagram_handle,
          brand_colors: {
            primary: formData.primary_color,
            secondary: store.brand_colors?.secondary || '#6B7280'
          },
          settings: {
            ...store.settings,
            checkout: {
              guest_checkout_enabled: formData.guest_checkout_enabled,
              phone_required: formData.phone_required
            },
            shipping: {
              free_shipping_threshold: formData.free_shipping_threshold,
              flat_rate_national: formData.flat_rate_national,
              cod_enabled: formData.cod_enabled,
              cod_fee: formData.cod_fee
            }
          }
        })
      })

      if (response.ok) {
        toast.success('Settings saved successfully')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Store Found</h2>
        <p className="text-muted-foreground mb-4">Create a store first to access settings.</p>
        <Link href="/onboarding">
          <Button>Create Store</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Store Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your store configuration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/${store.slug}`} target="_blank">
            <Button variant="outline">
              View Store
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Store Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Information
            </CardTitle>
            <CardDescription>
              Basic information about your store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Store"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Your store tagline"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your store..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@store.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                  placeholder="@yourstore"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>
              Customize your store appearance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <div
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                  style={{ backgroundColor: formData.primary_color }}
                  onClick={() => document.getElementById('color-picker')?.click()}
                />
                <Input
                  id="color-picker"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-20 h-10 p-1"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
              <ColorAccessibilityChecker primaryColor={formData.primary_color} className="mt-3" />
            </div>

            <div className="space-y-2">
              <Label>Store Logo</Label>
              <LogoEditor
                currentLogoUrl={store.logo_url}
                storeId={store.id}
                businessName={store.name}
                businessCategory={store.blueprint?.business_category?.[0]}
                description={store.description || undefined}
                brandVibe={store.blueprint?.brand_vibe}
                onLogoChange={(url) => {
                  setStore({ ...store, logo_url: url })
                  toast.success('Logo updated successfully')
                }}
                onColorSuggestion={(colors) => {
                  setFormData({ ...formData, primary_color: colors.suggested_primary })
                  toast.info('Brand color updated from logo')
                }}
              />
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Store URL: <code className="bg-muted px-2 py-1 rounded">/{store.slug}</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping
            </CardTitle>
            <CardDescription>
              Configure shipping rates and options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="free_shipping">Free Shipping Threshold (₹)</Label>
                <Input
                  id="free_shipping"
                  type="number"
                  value={formData.free_shipping_threshold}
                  onChange={(e) => setFormData({ ...formData, free_shipping_threshold: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flat_rate">Flat Rate Shipping (₹)</Label>
                <Input
                  id="flat_rate"
                  type="number"
                  value={formData.flat_rate_national}
                  onChange={(e) => setFormData({ ...formData, flat_rate_national: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cash on Delivery</Label>
                <p className="text-sm text-muted-foreground">Allow customers to pay on delivery</p>
              </div>
              <Switch
                checked={formData.cod_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, cod_enabled: checked })}
              />
            </div>

            {formData.cod_enabled && (
              <div className="space-y-2">
                <Label htmlFor="cod_fee">COD Fee (₹)</Label>
                <Input
                  id="cod_fee"
                  type="number"
                  value={formData.cod_fee}
                  onChange={(e) => setFormData({ ...formData, cod_fee: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checkout Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Checkout
            </CardTitle>
            <CardDescription>
              Configure checkout behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Guest Checkout</Label>
                <p className="text-sm text-muted-foreground">Allow checkout without account</p>
              </div>
              <Switch
                checked={formData.guest_checkout_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, guest_checkout_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Phone Number</Label>
                <p className="text-sm text-muted-foreground">Phone required for orders</p>
              </div>
              <Switch
                checked={formData.phone_required}
                onCheckedChange={(checked) => setFormData({ ...formData, phone_required: checked })}
              />
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Payment Methods</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${store.settings?.payments?.razorpay_enabled ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Razorpay {store.settings?.payments?.razorpay_enabled ? '(Enabled)' : '(Disabled)'}
                </p>
                <p className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${store.settings?.payments?.upi_enabled ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  UPI {store.settings?.payments?.upi_enabled ? '(Enabled)' : '(Disabled)'}
                </p>
                <p className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${store.settings?.payments?.stripe_enabled ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Stripe {store.settings?.payments?.stripe_enabled ? '(Enabled)' : '(Disabled)'}
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-3" disabled>
                Configure Payments (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legal Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Legal Policies
            </CardTitle>
            <CardDescription>
              Manage your store's legal documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Edit your Return Policy, Privacy Policy, Terms of Service, and Shipping Policy.
            </p>
            <Link href="/dashboard/settings/policies">
              <Button variant="outline">
                Manage Policies
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data & Privacy
            </CardTitle>
            <CardDescription>
              Export your data, no lock-in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Download all your store data including customers, orders, products, and analytics.
              You own your data - export anytime.
            </p>
            <Link href="/dashboard/settings/data">
              <Button variant="outline">
                Export Data
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Protect your account with 2FA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Enable two-factor authentication to add an extra layer of security.
              Use Google Authenticator or similar apps.
            </p>
            <Link href="/dashboard/settings/security">
              <Button variant="outline">
                Security Settings
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
