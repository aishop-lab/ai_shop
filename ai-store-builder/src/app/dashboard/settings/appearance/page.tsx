'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Loader2,
  Palette,
  Type,
  Layout,
  Code,
  Check,
  Eye,
  Megaphone,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'
import {
  DEFAULT_CUSTOMIZATION,
  COLOR_PRESETS,
  FONT_OPTIONS,
  BUTTON_RADIUS_MAP,
  FONT_SIZE_MAP,
} from '@/lib/types/customization'
import type { StoreCustomization, CustomizationColors } from '@/lib/types/customization'

interface StoreData {
  id: string
  slug: string
  name: string
  brand_colors: { primary: string; secondary: string }
  customization: StoreCustomization | null
  blueprint?: {
    branding?: { typography?: { heading_font: string; body_font: string } }
    theme?: { template: string }
    button_radius?: string
  }
}

export default function AppearancePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [store, setStore] = useState<StoreData | null>(null)
  const [customization, setCustomization] = useState<StoreCustomization>(DEFAULT_CUSTOMIZATION)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.store) {
            setStore(data.store)
            // Initialize from existing customization or build from current settings
            const existing = data.store.customization as StoreCustomization | null
            if (existing && existing.colors) {
              setCustomization({
                ...DEFAULT_CUSTOMIZATION,
                ...existing,
                colors: { ...DEFAULT_CUSTOMIZATION.colors, ...existing.colors },
                typography: { ...DEFAULT_CUSTOMIZATION.typography, ...existing.typography },
                layout: { ...DEFAULT_CUSTOMIZATION.layout, ...existing.layout },
                announcement_bar: {
                  enabled: existing.announcement_bar?.enabled ?? DEFAULT_CUSTOMIZATION.announcement_bar!.enabled,
                  text: existing.announcement_bar?.text ?? DEFAULT_CUSTOMIZATION.announcement_bar!.text,
                  link_url: existing.announcement_bar?.link_url,
                  link_text: existing.announcement_bar?.link_text,
                  bg_color: existing.announcement_bar?.bg_color ?? DEFAULT_CUSTOMIZATION.announcement_bar!.bg_color,
                  text_color: existing.announcement_bar?.text_color ?? DEFAULT_CUSTOMIZATION.announcement_bar!.text_color,
                },
              })
            } else {
              // Build from legacy settings
              const bp = data.store.blueprint
              setCustomization({
                ...DEFAULT_CUSTOMIZATION,
                colors: {
                  ...DEFAULT_CUSTOMIZATION.colors,
                  primary: data.store.brand_colors?.primary || DEFAULT_CUSTOMIZATION.colors.primary,
                  secondary: data.store.brand_colors?.secondary || DEFAULT_CUSTOMIZATION.colors.secondary,
                },
                typography: {
                  ...DEFAULT_CUSTOMIZATION.typography,
                  heading_font: bp?.branding?.typography?.heading_font || DEFAULT_CUSTOMIZATION.typography.heading_font,
                  body_font: bp?.branding?.typography?.body_font || DEFAULT_CUSTOMIZATION.typography.body_font,
                },
                layout: {
                  ...DEFAULT_CUSTOMIZATION.layout,
                  theme_template: bp?.theme?.template || DEFAULT_CUSTOMIZATION.layout.theme_template,
                  button_style: bp?.button_radius === '0px' ? 'sharp' : bp?.button_radius === '9999px' ? 'pill' : 'rounded',
                },
              })
            }
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

  const updateColors = useCallback((updates: Partial<CustomizationColors>) => {
    setCustomization(prev => ({
      ...prev,
      colors: { ...prev.colors, ...updates },
    }))
    setHasChanges(true)
  }, [])

  const updateTypography = useCallback((updates: Partial<StoreCustomization['typography']>) => {
    setCustomization(prev => ({
      ...prev,
      typography: { ...prev.typography, ...updates },
    }))
    setHasChanges(true)
  }, [])

  const updateLayout = useCallback((updates: Partial<StoreCustomization['layout']>) => {
    setCustomization(prev => ({
      ...prev,
      layout: { ...prev.layout, ...updates },
    }))
    setHasChanges(true)
  }, [])

  const updateAnnouncementBar = useCallback((updates: Partial<NonNullable<StoreCustomization['announcement_bar']>>) => {
    setCustomization(prev => ({
      ...prev,
      announcement_bar: { ...(prev.announcement_bar || DEFAULT_CUSTOMIZATION.announcement_bar!), ...updates },
    }))
    setHasChanges(true)
  }, [])

  const applyColorPreset = useCallback((preset: typeof COLOR_PRESETS[number]) => {
    setCustomization(prev => ({
      ...prev,
      colors: { ...preset.colors },
    }))
    setHasChanges(true)
    toast.success(`Applied "${preset.name}" color palette`)
  }, [])

  const resetToDefaults = useCallback(() => {
    setCustomization(DEFAULT_CUSTOMIZATION)
    setHasChanges(true)
    toast.info('Reset to defaults')
  }, [])

  const handleSave = async () => {
    if (!store) return
    setSaving(true)
    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customization,
          // Also sync primary/secondary to brand_colors for backward compat
          brand_colors: {
            primary: customization.colors.primary,
            secondary: customization.colors.secondary,
          },
          // Sync theme template
          theme_template: customization.layout.theme_template,
          // Sync typography to blueprint
          typography: {
            heading_font: customization.typography.heading_font,
            body_font: customization.typography.body_font,
          },
          // Sync button radius
          button_radius: BUTTON_RADIUS_MAP[customization.layout.button_style],
        }),
      })

      if (response.ok) {
        toast.success('Appearance saved successfully')
        setHasChanges(false)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save appearance settings')
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
        <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Store Found</h2>
        <p className="text-muted-foreground">Create a store first to customize its appearance.</p>
      </div>
    )
  }

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
            <h1 className="text-2xl font-bold">Store Appearance</h1>
            <p className="text-muted-foreground mt-1">
              Customize fonts, colors, and layout for your storefront
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${store.slug}`} target="_blank">
            <Button variant="outline" size="sm">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Preview Store
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Settings Panel */}
        <div>
          <Tabs defaultValue="colors" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="colors" className="gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Colors</span>
              </TabsTrigger>
              <TabsTrigger value="fonts" className="gap-1.5">
                <Type className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fonts</span>
              </TabsTrigger>
              <TabsTrigger value="layout" className="gap-1.5">
                <Layout className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Layout</span>
              </TabsTrigger>
              <TabsTrigger value="announcement" className="gap-1.5">
                <Megaphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Banner</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1.5">
                <Code className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">CSS</span>
              </TabsTrigger>
            </TabsList>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-6">
              {/* Color Presets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Color Presets</CardTitle>
                  <CardDescription>
                    Start with a curated palette, then customize individual colors below
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyColorPreset(preset)}
                        className="group relative rounded-lg border border-border p-3 hover:border-primary transition-colors text-left"
                      >
                        <div className="flex gap-1 mb-2">
                          {[preset.colors.primary, preset.colors.secondary, preset.colors.accent, preset.colors.background].map((color, i) => (
                            <div
                              key={i}
                              className="h-5 w-5 rounded-full border border-border/50"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Individual Colors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Brand Colors</CardTitle>
                  <CardDescription>Primary and accent colors used throughout your store</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorPicker
                    label="Primary"
                    description="Buttons, links, and highlights"
                    value={customization.colors.primary}
                    onChange={(v) => updateColors({ primary: v })}
                  />
                  <ColorPicker
                    label="Secondary"
                    description="Secondary buttons and badges"
                    value={customization.colors.secondary}
                    onChange={(v) => updateColors({ secondary: v })}
                  />
                  <ColorPicker
                    label="Accent"
                    description="Sale badges, notifications, alerts"
                    value={customization.colors.accent}
                    onChange={(v) => updateColors({ accent: v })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Page Colors</CardTitle>
                  <CardDescription>Background and text colors for the main content area</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorPicker
                    label="Background"
                    description="Main page background"
                    value={customization.colors.background}
                    onChange={(v) => updateColors({ background: v })}
                  />
                  <ColorPicker
                    label="Text"
                    description="Body text color"
                    value={customization.colors.text}
                    onChange={(v) => updateColors({ text: v })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Header & Footer</CardTitle>
                  <CardDescription>Customize header and footer appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorPicker
                    label="Header Background"
                    description="Store header background"
                    value={customization.colors.header_bg}
                    onChange={(v) => updateColors({ header_bg: v })}
                  />
                  <ColorPicker
                    label="Header Text"
                    description="Navigation links and store name"
                    value={customization.colors.header_text}
                    onChange={(v) => updateColors({ header_text: v })}
                  />
                  <ColorPicker
                    label="Footer Background"
                    description="Store footer background"
                    value={customization.colors.footer_bg}
                    onChange={(v) => updateColors({ footer_bg: v })}
                  />
                  <ColorPicker
                    label="Footer Text"
                    description="Footer links and content"
                    value={customization.colors.footer_text}
                    onChange={(v) => updateColors({ footer_text: v })}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fonts Tab */}
            <TabsContent value="fonts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Typography</CardTitle>
                  <CardDescription>Choose fonts from Google Fonts for headings and body text</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Heading Font</Label>
                    <Select
                      value={customization.typography.heading_font}
                      onValueChange={(v) => updateTypography({ heading_font: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {FONT_OPTIONS.map((font) => (
                          <SelectItem key={font.name} value={font.name}>
                            <span className="flex items-center gap-2">
                              {font.name}
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{font.category}</Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Used for store name, section titles, and product names</p>
                  </div>

                  <div className="space-y-3">
                    <Label>Body Font</Label>
                    <Select
                      value={customization.typography.body_font}
                      onValueChange={(v) => updateTypography({ body_font: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {FONT_OPTIONS.map((font) => (
                          <SelectItem key={font.name} value={font.name}>
                            <span className="flex items-center gap-2">
                              {font.name}
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{font.category}</Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Used for product descriptions, paragraphs, and UI text</p>
                  </div>

                  <div className="space-y-3">
                    <Label>Base Font Size</Label>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => updateTypography({ base_font_size: size })}
                          className={`flex-1 rounded-lg border p-3 text-center transition-colors ${
                            customization.typography.base_font_size === size
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <span className="block text-sm font-medium capitalize">{size}</span>
                          <span className="text-xs text-muted-foreground">{FONT_SIZE_MAP[size]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Font pairing suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Popular Pairings</CardTitle>
                  <CardDescription>Click to apply a professionally matched font combination</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {FONT_PAIRINGS.map((pair, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          updateTypography({ heading_font: pair.heading, body_font: pair.body })
                          toast.success(`Applied "${pair.heading}" + "${pair.body}"`)
                        }}
                        className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/50 ${
                          customization.typography.heading_font === pair.heading && customization.typography.body_font === pair.body
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-semibold">{pair.heading}</span>
                            <span className="text-xs text-muted-foreground mx-1.5">+</span>
                            <span className="text-sm">{pair.body}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{pair.style}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{pair.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="space-y-6">
              {/* Theme Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Store Theme</CardTitle>
                  <CardDescription>Choose the overall look and feel of your store</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {THEME_OPTIONS.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => updateLayout({ theme_template: theme.id })}
                        className={`relative rounded-lg border p-4 text-left transition-colors ${
                          customization.layout.theme_template === theme.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {customization.layout.theme_template === theme.id && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="text-2xl mb-2">{theme.icon}</div>
                        <h4 className="text-sm font-semibold">{theme.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Header Style */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Header Style</CardTitle>
                  <CardDescription>How your store navigation appears</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {HEADER_STYLES.map((style) => (
                      <button
                        key={style.value}
                        onClick={() => updateLayout({ header_style: style.value })}
                        className={`rounded-lg border p-3 text-center transition-colors ${
                          customization.layout.header_style === style.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="text-lg mb-1">{style.icon}</div>
                        <span className="text-xs font-medium">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Button Style */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Button Style</CardTitle>
                  <CardDescription>Shape of buttons throughout your store</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {BUTTON_STYLES.map((style) => (
                      <button
                        key={style.value}
                        onClick={() => updateLayout({ button_style: style.value })}
                        className={`rounded-lg border p-4 text-center transition-colors ${
                          customization.layout.button_style === style.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div
                          className="mx-auto mb-2 h-8 w-24 flex items-center justify-center text-xs font-medium text-white"
                          style={{
                            backgroundColor: customization.colors.primary,
                            borderRadius: BUTTON_RADIUS_MAP[style.value],
                          }}
                        >
                          Button
                        </div>
                        <span className="text-xs font-medium">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Product Card Style */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Product Cards</CardTitle>
                  <CardDescription>How products appear in grid listings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {PRODUCT_CARD_STYLES.map((style) => (
                      <button
                        key={style.value}
                        onClick={() => updateLayout({ product_card_style: style.value })}
                        className={`rounded-lg border p-3 text-center transition-colors ${
                          customization.layout.product_card_style === style.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="text-lg mb-1">{style.icon}</div>
                        <span className="text-xs font-medium">{style.label}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{style.description}</p>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Label>Products Per Row</Label>
                    <div className="flex gap-2">
                      {([2, 3, 4] as const).map((cols) => (
                        <button
                          key={cols}
                          onClick={() => updateLayout({ product_grid_columns: cols })}
                          className={`flex-1 rounded-lg border p-3 text-center transition-colors ${
                            customization.layout.product_grid_columns === cols
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex gap-0.5 justify-center mb-1">
                            {Array.from({ length: cols }).map((_, i) => (
                              <div key={i} className="w-3 h-4 rounded-sm bg-muted-foreground/30" />
                            ))}
                          </div>
                          <span className="text-xs font-medium">{cols} columns</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Announcement Bar Tab */}
            <TabsContent value="announcement" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Announcement Bar</CardTitle>
                  <CardDescription>A banner at the top of your store for promotions or important messages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Announcement Bar</Label>
                    <Switch
                      checked={customization.announcement_bar?.enabled || false}
                      onCheckedChange={(checked) => updateAnnouncementBar({ enabled: checked })}
                    />
                  </div>

                  {customization.announcement_bar?.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Message</Label>
                        <Input
                          value={customization.announcement_bar?.text || ''}
                          onChange={(e) => updateAnnouncementBar({ text: e.target.value })}
                          placeholder="Free shipping on orders above Rs 999!"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Link Text (optional)</Label>
                          <Input
                            value={customization.announcement_bar?.link_text || ''}
                            onChange={(e) => updateAnnouncementBar({ link_text: e.target.value })}
                            placeholder="Shop Now"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Link URL (optional)</Label>
                          <Input
                            value={customization.announcement_bar?.link_url || ''}
                            onChange={(e) => updateAnnouncementBar({ link_url: e.target.value })}
                            placeholder="/products"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <ColorPicker
                          label="Background"
                          value={customization.announcement_bar?.bg_color || '#3B82F6'}
                          onChange={(v) => updateAnnouncementBar({ bg_color: v })}
                        />
                        <ColorPicker
                          label="Text Color"
                          value={customization.announcement_bar?.text_color || '#FFFFFF'}
                          onChange={(v) => updateAnnouncementBar({ text_color: v })}
                        />
                      </div>

                      {/* Preview */}
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div
                          className="rounded-lg text-center py-2 px-4 text-sm"
                          style={{
                            backgroundColor: customization.announcement_bar?.bg_color,
                            color: customization.announcement_bar?.text_color,
                          }}
                        >
                          {customization.announcement_bar?.text || 'Your announcement here'}
                          {customization.announcement_bar?.link_text && (
                            <span className="ml-2 underline font-medium">
                              {customization.announcement_bar.link_text}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custom CSS</CardTitle>
                  <CardDescription>
                    Add custom CSS rules to further customize your store. Use CSS variables like
                    var(--color-primary) for dynamic values.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={customization.custom_css || ''}
                    onChange={(e) => {
                      setCustomization(prev => ({ ...prev, custom_css: e.target.value }))
                      setHasChanges(true)
                    }}
                    placeholder={`.store-header {\n  box-shadow: 0 2px 8px rgba(0,0,0,0.1);\n}\n\n.product-card:hover {\n  transform: translateY(-2px);\n}`}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Available CSS variables: --color-primary, --color-secondary, --color-accent,
                    --color-background, --color-text, --font-heading, --font-body, --button-radius
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview Panel */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StorePreview customization={customization} storeName={store.name} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Spacer for sticky save bar */}
      <div className="h-20" />

      {/* Sticky Save Bar */}
      {hasChanges && (
        <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm py-4 border-t -mx-6 px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">You have unsaved changes</p>
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Color Picker Component ──────────────────────────────────────────
function ColorPicker({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-2 items-center">
        <div
          className="w-9 h-9 rounded-lg border border-border cursor-pointer shrink-0 transition-transform hover:scale-105"
          style={{ backgroundColor: value }}
          onClick={() => {
            const input = document.getElementById(`color-${label}`) as HTMLInputElement
            input?.click()
          }}
        />
        <input
          id={`color-${label}`}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v) || v === '') {
              onChange(v || '#000000')
            }
          }}
          className="w-28 font-mono text-sm"
        />
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

// ── Store Preview Component ─────────────────────────────────────────
function StorePreview({
  customization,
  storeName,
}: {
  customization: StoreCustomization
  storeName: string
}) {
  const c = customization.colors
  const t = customization.typography
  const l = customization.layout
  const ann = customization.announcement_bar

  return (
    <div className="rounded-lg overflow-hidden border border-border text-[10px]" style={{ backgroundColor: c.background }}>
      {/* Announcement Bar */}
      {ann?.enabled && ann.text && (
        <div className="text-center py-1 px-2 text-[9px]" style={{ backgroundColor: ann.bg_color, color: ann.text_color }}>
          {ann.text}
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center px-3 py-2 border-b"
        style={{
          backgroundColor: c.header_bg,
          color: c.header_text,
          borderColor: c.header_bg === '#FFFFFF' || c.header_bg === '#ffffff' ? '#e5e7eb' : 'transparent',
          justifyContent: l.header_style === 'centered' ? 'center' : 'space-between',
        }}
      >
        {l.header_style !== 'minimal' && (
          <span className="font-bold text-[11px]" style={{ fontFamily: `"${t.heading_font}", sans-serif` }}>
            {storeName}
          </span>
        )}
        {l.header_style === 'minimal' && (
          <span className="font-bold text-[11px] mx-auto" style={{ fontFamily: `"${t.heading_font}", sans-serif` }}>
            {storeName}
          </span>
        )}
        {l.header_style !== 'centered' && l.header_style !== 'minimal' && (
          <div className="flex gap-2 text-[9px]" style={{ color: c.header_text, opacity: 0.7 }}>
            <span>Shop</span>
            <span>About</span>
            <span>Cart</span>
          </div>
        )}
      </div>

      {l.header_style === 'centered' && (
        <div className="flex justify-center gap-3 py-1 text-[9px]" style={{ backgroundColor: c.header_bg, color: c.header_text, opacity: 0.7 }}>
          <span>Shop</span>
          <span>About</span>
          <span>Contact</span>
        </div>
      )}

      {/* Hero */}
      <div className="p-4 text-center" style={{ backgroundColor: c.background, color: c.text }}>
        <h3 className="font-bold text-sm mb-1" style={{ fontFamily: `"${t.heading_font}", sans-serif` }}>
          Welcome to {storeName}
        </h3>
        <p className="text-[9px] mb-2 opacity-70" style={{ fontFamily: `"${t.body_font}", sans-serif` }}>
          Discover our curated collection
        </p>
        <div
          className="inline-block px-3 py-1 text-[9px] font-medium"
          style={{
            backgroundColor: c.primary,
            color: '#fff',
            borderRadius: BUTTON_RADIUS_MAP[l.button_style],
          }}
        >
          Shop Now
        </div>
      </div>

      {/* Product Grid */}
      <div className="p-3" style={{ backgroundColor: c.background }}>
        <h4 className="font-semibold text-[10px] mb-2" style={{ color: c.text, fontFamily: `"${t.heading_font}", sans-serif` }}>
          Featured Products
        </h4>
        <div className={`grid gap-2 ${l.product_grid_columns === 2 ? 'grid-cols-2' : l.product_grid_columns === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {[1, 2, 3].slice(0, Math.min(3, l.product_grid_columns)).map((i) => (
            <div key={i} className={`rounded overflow-hidden ${l.product_card_style === 'overlay' ? 'relative' : ''}`}>
              <div
                className="aspect-square bg-gradient-to-br"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${c.primary}20, ${c.secondary}30)`,
                }}
              />
              {l.product_card_style !== 'overlay' && (
                <div className="p-1.5" style={{ color: c.text, fontFamily: `"${t.body_font}", sans-serif` }}>
                  <div className="font-medium text-[9px]">Product {i}</div>
                  {l.product_card_style === 'default' && (
                    <div className="text-[9px]" style={{ color: c.primary }}>Rs 999</div>
                  )}
                </div>
              )}
              {l.product_card_style === 'overlay' && (
                <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="font-medium text-[9px] text-white">Product {i}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2 text-center text-[9px]"
        style={{
          backgroundColor: c.footer_bg,
          color: c.footer_text,
          fontFamily: `"${t.body_font}", sans-serif`,
        }}
      >
        {storeName} &copy; 2026
      </div>
    </div>
  )
}

// ── Constants ───────────────────────────────────────────────────────
const FONT_PAIRINGS = [
  { heading: 'Playfair Display', body: 'Lato', style: 'Elegant', description: 'Sophisticated serif + clean sans for luxury brands' },
  { heading: 'Poppins', body: 'Inter', style: 'Modern', description: 'Geometric heading + neutral body for tech-forward stores' },
  { heading: 'Space Grotesk', body: 'DM Sans', style: 'Minimal', description: 'Contemporary pair for minimal, design-focused stores' },
  { heading: 'Montserrat', body: 'Open Sans', style: 'Professional', description: 'Bold heading + readable body for professional brands' },
  { heading: 'Nunito', body: 'Quicksand', style: 'Friendly', description: 'Rounded, approachable fonts for casual or kids brands' },
  { heading: 'Cormorant Garamond', body: 'Libre Baskerville', style: 'Classic', description: 'Timeless serif pair for traditional or artisan brands' },
  { heading: 'Raleway', body: 'Roboto', style: 'Clean', description: 'Thin elegant heading + versatile body for fashion stores' },
  { heading: 'Plus Jakarta Sans', body: 'Nunito Sans', style: 'Startup', description: 'Modern startup feel for DTC brands' },
]

const THEME_OPTIONS = [
  { id: 'modern-minimal', name: 'Modern Minimal', description: 'Clean lines, bold typography', icon: '◻' },
  { id: 'classic-elegant', name: 'Classic Elegant', description: 'Timeless, sophisticated design', icon: '◆' },
  { id: 'playful-bright', name: 'Playful Bright', description: 'Vibrant colors, rounded corners', icon: '◉' },
  { id: 'minimal-zen', name: 'Minimal Zen', description: 'White space, understated elegance', icon: '○' },
]

const HEADER_STYLES = [
  { value: 'default' as const, label: 'Default', icon: '☰' },
  { value: 'centered' as const, label: 'Centered', icon: '⬒' },
  { value: 'minimal' as const, label: 'Minimal', icon: '—' },
]

const BUTTON_STYLES = [
  { value: 'rounded' as const, label: 'Rounded' },
  { value: 'sharp' as const, label: 'Sharp' },
  { value: 'pill' as const, label: 'Pill' },
]

const PRODUCT_CARD_STYLES = [
  { value: 'default' as const, label: 'Default', icon: '▤', description: 'Image + details below' },
  { value: 'minimal' as const, label: 'Minimal', icon: '▢', description: 'Image + title only' },
  { value: 'overlay' as const, label: 'Overlay', icon: '▧', description: 'Text on image' },
]
