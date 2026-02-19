'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Info,
} from 'lucide-react'
import type { RazorpayCredentialStatus, StripeCredentialStatus } from '@/lib/types/store'

export default function PaymentsSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState<RazorpayCredentialStatus | null>(null)

  // Form state (Razorpay)
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')

  // Visibility toggles (Razorpay)
  const [showKeySecret, setShowKeySecret] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)

  // Stripe state
  const [stripeStatus, setStripeStatus] = useState<StripeCredentialStatus | null>(null)
  const [stripeSaving, setStripeSaving] = useState(false)
  const [stripeDeleting, setStripeDeleting] = useState(false)
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [stripeSecretKey, setStripeSecretKey] = useState('')
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('')
  const [showStripeSecretKey, setShowStripeSecretKey] = useState(false)
  const [showStripeWebhookSecret, setShowStripeWebhookSecret] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const [razorpayRes, stripeRes] = await Promise.all([
        fetch('/api/dashboard/settings/razorpay'),
        fetch('/api/dashboard/settings/stripe'),
      ])

      if (razorpayRes.ok) {
        const data = await razorpayRes.json()
        setStatus(data.status)
        if (data.status?.key_id) {
          setKeyId(data.status.key_id)
        }
      }

      if (stripeRes.ok) {
        const data = await stripeRes.json()
        setStripeStatus(data.status)
        if (data.status?.publishable_key) {
          setStripePublishableKey(data.status.publishable_key)
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment settings:', error)
      toast.error('Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!keyId || !keySecret) {
      toast.error('Key ID and Key Secret are required')
      return
    }

    // Basic validation for Razorpay key format
    if (!keyId.match(/^rzp_(test|live)_[a-zA-Z0-9]+$/)) {
      toast.error('Invalid Key ID format. Should start with rzp_test_ or rzp_live_')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/dashboard/settings/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: keyId,
          key_secret: keySecret,
          webhook_secret: webhookSecret || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Razorpay credentials saved and verified')
        // Clear sensitive fields after save
        setKeySecret('')
        setWebhookSecret('')
        // Refresh status
        await fetchStatus()
      } else {
        toast.error(data.error || data.details || 'Failed to save credentials')
      }
    } catch (error) {
      console.error('Failed to save credentials:', error)
      toast.error('Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const response = await fetch('/api/dashboard/settings/razorpay', {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Razorpay credentials removed. Using platform credentials.')
        setKeyId('')
        setKeySecret('')
        setWebhookSecret('')
        await fetchStatus()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove credentials')
      }
    } catch (error) {
      console.error('Failed to remove credentials:', error)
      toast.error('Failed to remove credentials')
    } finally {
      setDeleting(false)
    }
  }

  // Stripe handlers
  async function handleStripeSave() {
    if (!stripePublishableKey || !stripeSecretKey) {
      toast.error('Publishable Key and Secret Key are required')
      return
    }

    if (!stripePublishableKey.match(/^pk_(test|live)_[a-zA-Z0-9]+$/)) {
      toast.error('Invalid Publishable Key format. Should start with pk_test_ or pk_live_')
      return
    }

    if (!stripeSecretKey.match(/^sk_(test|live)_[a-zA-Z0-9]+$/)) {
      toast.error('Invalid Secret Key format. Should start with sk_test_ or sk_live_')
      return
    }

    setStripeSaving(true)
    try {
      const response = await fetch('/api/dashboard/settings/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishable_key: stripePublishableKey,
          secret_key: stripeSecretKey,
          webhook_secret: stripeWebhookSecret || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Stripe credentials saved and verified')
        setStripeSecretKey('')
        setStripeWebhookSecret('')
        await fetchStatus()
      } else {
        toast.error(data.error || data.details || 'Failed to save Stripe credentials')
      }
    } catch (error) {
      console.error('Failed to save Stripe credentials:', error)
      toast.error('Failed to save Stripe credentials')
    } finally {
      setStripeSaving(false)
    }
  }

  async function handleStripeDelete() {
    setStripeDeleting(true)
    try {
      const response = await fetch('/api/dashboard/settings/stripe', {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Stripe credentials removed. Using platform credentials.')
        setStripePublishableKey('')
        setStripeSecretKey('')
        setStripeWebhookSecret('')
        await fetchStatus()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove Stripe credentials')
      }
    } catch (error) {
      console.error('Failed to remove Stripe credentials:', error)
      toast.error('Failed to remove Stripe credentials')
    } finally {
      setStripeDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Payment Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your Razorpay account for direct payment settlement
          </p>
        </div>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Current Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {status?.configured && status?.verified ? (
              <>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Custom Credentials Active
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Payments are settled directly to your Razorpay account
                </span>
              </>
            ) : (
              <>
                <Badge variant="secondary">
                  <Info className="h-3 w-3 mr-1" />
                  Using Platform Credentials
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Payments are processed through StoreForge
                </span>
              </>
            )}
          </div>

          {status?.verified && status?.verified_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Verified on {new Date(status.verified_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Benefits */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Why configure your own Razorpay account?</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Payments are settled directly to your bank account</li>
            <li>Full control over your payment dashboard and reports</li>
            <li>Direct access to Razorpay support for payment issues</li>
            <li>No platform fees on payment processing</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Credentials Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Razorpay Credentials
          </CardTitle>
          <CardDescription>
            Enter your Razorpay API credentials. They will be encrypted before storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key ID */}
          <div className="space-y-2">
            <Label htmlFor="key_id">Key ID *</Label>
            <Input
              id="key_id"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_live_xxxxxxxxxxxxxxxx"
            />
            <p className="text-xs text-muted-foreground">
              Found in Razorpay Dashboard → Settings → API Keys
            </p>
          </div>

          {/* Key Secret */}
          <div className="space-y-2">
            <Label htmlFor="key_secret">Key Secret *</Label>
            <div className="relative">
              <Input
                id="key_secret"
                type={showKeySecret ? 'text' : 'password'}
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder={status?.configured ? '••••••••••••' : 'Enter your Key Secret'}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowKeySecret(!showKeySecret)}
              >
                {showKeySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Generated once when you create API keys. Keep it secure.
            </p>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-2">
            <Label htmlFor="webhook_secret">Webhook Secret (Optional)</Label>
            <div className="relative">
              <Input
                id="webhook_secret"
                type={showWebhookSecret ? 'text' : 'password'}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={status?.webhook_secret_masked || 'Enter your Webhook Secret'}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Required for payment webhooks. Found in Dashboard → Webhooks → Setup
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving || !keyId || !keySecret}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save & Verify
            </Button>

            {status?.configured && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Credentials
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Razorpay Credentials?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your store will use platform credentials for payment processing.
                      Any pending orders will still be processed with the current credentials.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="https://razorpay.com/docs/api/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Razorpay API Documentation
          </a>
          <a
            href="https://dashboard.razorpay.com/app/website-app-settings/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Razorpay Dashboard - API Keys
          </a>
          <a
            href="https://razorpay.com/docs/webhooks/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Razorpay Webhooks Setup Guide
          </a>

          <div className="pt-4 border-t mt-4">
            <h4 className="font-medium text-sm mb-2">Webhook URL for your account:</h4>
            <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
              https://storeforge.site/api/webhooks/razorpay
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Add this URL in your Razorpay webhook settings to receive payment notifications.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ===== Stripe Section ===== */}
      <div className="pt-6 border-t mt-6">
        <h2 className="text-2xl font-bold mb-1">Stripe</h2>
        <p className="text-muted-foreground text-sm mb-6">
          For international payments (USD, EUR, GBP). Used automatically when your store currency is non-INR.
        </p>
      </div>

      {/* Stripe Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Stripe Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {stripeStatus?.configured && stripeStatus?.verified ? (
              <>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Custom Credentials Active
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Payments are settled directly to your Stripe account
                </span>
              </>
            ) : (
              <>
                <Badge variant="secondary">
                  <Info className="h-3 w-3 mr-1" />
                  Using Platform Credentials
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Payments are processed through StoreForge
                </span>
              </>
            )}
          </div>

          {stripeStatus?.verified && stripeStatus?.verified_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Verified on {new Date(stripeStatus.verified_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stripe Credentials Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Credentials
          </CardTitle>
          <CardDescription>
            Enter your Stripe API credentials. They will be encrypted before storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Publishable Key */}
          <div className="space-y-2">
            <Label htmlFor="stripe_pk">Publishable Key *</Label>
            <Input
              id="stripe_pk"
              value={stripePublishableKey}
              onChange={(e) => setStripePublishableKey(e.target.value)}
              placeholder="pk_live_xxxxxxxxxxxxxxxx"
            />
            <p className="text-xs text-muted-foreground">
              Found in Stripe Dashboard → Developers → API Keys
            </p>
          </div>

          {/* Secret Key */}
          <div className="space-y-2">
            <Label htmlFor="stripe_sk">Secret Key *</Label>
            <div className="relative">
              <Input
                id="stripe_sk"
                type={showStripeSecretKey ? 'text' : 'password'}
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                placeholder={stripeStatus?.configured ? '••••••••••••' : 'sk_live_xxxxxxxxxxxxxxxx'}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowStripeSecretKey(!showStripeSecretKey)}
              >
                {showStripeSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-2">
            <Label htmlFor="stripe_wh">Webhook Secret (Optional)</Label>
            <div className="relative">
              <Input
                id="stripe_wh"
                type={showStripeWebhookSecret ? 'text' : 'password'}
                value={stripeWebhookSecret}
                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                placeholder={stripeStatus?.webhook_secret_masked || 'whsec_xxxxxxxxxxxxxxxx'}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowStripeWebhookSecret(!showStripeWebhookSecret)}
              >
                {showStripeWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Found in Stripe Dashboard → Developers → Webhooks
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleStripeSave} disabled={stripeSaving || !stripePublishableKey || !stripeSecretKey}>
              {stripeSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save & Verify
            </Button>

            {stripeStatus?.configured && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Credentials
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Stripe Credentials?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your store will use platform credentials for Stripe payment processing.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleStripeDelete}
                      disabled={stripeDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {stripeDeleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stripe Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe Help</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="https://stripe.com/docs/api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Stripe API Documentation
          </a>
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Stripe Dashboard - API Keys
          </a>

          <div className="pt-4 border-t mt-4">
            <h4 className="font-medium text-sm mb-2">Webhook URL for Stripe:</h4>
            <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
              https://storeforge.site/api/webhooks/stripe
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Add this URL in your Stripe webhook settings. Subscribe to: checkout.session.completed, checkout.session.expired, charge.refunded
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Security Note:</strong> All secrets are encrypted
          with AES-256-GCM before storage. We never store or transmit these values in plaintext.
        </AlertDescription>
      </Alert>
    </div>
  )
}
