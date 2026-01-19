'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  BarChart3,
  Tag,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/lib/hooks/use-toast'

interface MarketingPixels {
  facebook_pixel_id: string | null
  google_analytics_id: string | null
  google_ads_conversion_id: string | null
  google_ads_conversion_label: string | null
}

export default function MarketingSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pixels, setPixels] = useState<MarketingPixels>({
    facebook_pixel_id: '',
    google_analytics_id: '',
    google_ads_conversion_id: '',
    google_ads_conversion_label: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/dashboard/settings/marketing')
      if (!response.ok) throw new Error('Failed to fetch settings')

      const data = await response.json()
      setPixels({
        facebook_pixel_id: data.marketing_pixels?.facebook_pixel_id || '',
        google_analytics_id: data.marketing_pixels?.google_analytics_id || '',
        google_ads_conversion_id: data.marketing_pixels?.google_ads_conversion_id || '',
        google_ads_conversion_label: data.marketing_pixels?.google_ads_conversion_label || ''
      })
    } catch (error) {
      console.error('Failed to fetch marketing settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load marketing settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/dashboard/settings/marketing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketing_pixels: {
            facebook_pixel_id: pixels.facebook_pixel_id || null,
            google_analytics_id: pixels.google_analytics_id || null,
            google_ads_conversion_id: pixels.google_ads_conversion_id || null,
            google_ads_conversion_label: pixels.google_ads_conversion_label || null
          }
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      toast({
        title: 'Settings saved',
        description: 'Marketing pixels have been updated successfully'
      })
    } catch (error) {
      console.error('Failed to save marketing settings:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof MarketingPixels, value: string) => {
    setPixels(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/settings')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Marketing & Analytics</h1>
          <p className="text-muted-foreground">
            Connect tracking pixels to measure your ad performance
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <div className="flex gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">Why add tracking pixels?</p>
            <p className="mt-1 text-blue-700 dark:text-blue-300">
              Track visitors from your ads, measure conversions, and optimize your ROAS (Return on Ad Spend).
              Events like page views, add to cart, and purchases are automatically tracked.
            </p>
          </div>
        </div>
      </div>

      {/* Facebook Pixel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <CardTitle>Facebook Pixel</CardTitle>
          </div>
          <CardDescription>
            Track visitors from Facebook and Instagram ads. Required for running Meta ads effectively.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fb_pixel">Pixel ID</Label>
            <Input
              id="fb_pixel"
              placeholder="123456789012345"
              value={pixels.facebook_pixel_id || ''}
              onChange={(e) => handleChange('facebook_pixel_id', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              15-16 digit number found in Facebook Events Manager
            </p>
          </div>
          <Link
            href="https://business.facebook.com/events_manager"
            target="_blank"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Find my Pixel ID
            <ExternalLink className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      {/* Google Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#F9AB00]" />
            <CardTitle>Google Analytics 4</CardTitle>
          </div>
          <CardDescription>
            Track website traffic, user behavior, and e-commerce conversions with Google Analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ga_id">Measurement ID</Label>
            <Input
              id="ga_id"
              placeholder="G-XXXXXXXXXX"
              value={pixels.google_analytics_id || ''}
              onChange={(e) => handleChange('google_analytics_id', e.target.value.toUpperCase())}
            />
            <p className="text-xs text-muted-foreground">
              Starts with G- followed by 10 characters
            </p>
          </div>
          <Link
            href="https://analytics.google.com/"
            target="_blank"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Go to Google Analytics
            <ExternalLink className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      {/* Google Ads Conversion */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#4285F4]" />
            <CardTitle>Google Ads Conversion Tracking</CardTitle>
          </div>
          <CardDescription>
            Track purchases from Google Ads campaigns to measure conversion value and optimize bidding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gads_id">Conversion ID</Label>
            <Input
              id="gads_id"
              placeholder="AW-123456789"
              value={pixels.google_ads_conversion_id || ''}
              onChange={(e) => handleChange('google_ads_conversion_id', e.target.value.toUpperCase())}
            />
            <p className="text-xs text-muted-foreground">
              Starts with AW- followed by numbers
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gads_label">Conversion Label</Label>
            <Input
              id="gads_label"
              placeholder="AbC1DeFgHiJ2KlMnO3"
              value={pixels.google_ads_conversion_label || ''}
              onChange={(e) => handleChange('google_ads_conversion_label', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Found in Google Ads conversion tracking setup
            </p>
          </div>
          <Link
            href="https://ads.google.com/"
            target="_blank"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Go to Google Ads
            <ExternalLink className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}
