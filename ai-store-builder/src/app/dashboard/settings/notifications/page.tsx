'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Check,
  X,
  Loader2,
  ExternalLink,
  AlertCircle,
  Trash2,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface CredentialStatus {
  configured: boolean
  verified: boolean
  verified_at: string | null
  notifications_enabled: boolean
  using_platform_credentials: boolean
}

interface EmailStatus extends CredentialStatus {
  from_email: string | null
  from_name: string | null
  api_key_masked: string | null
}

interface WhatsAppStatus extends CredentialStatus {
  whatsapp_number: string | null
  sender_id: string | null
  auth_key_masked: string | null
}

interface NotificationSettings {
  order_confirmation_email: boolean
  order_confirmation_whatsapp: boolean
  shipping_update_email: boolean
  shipping_update_whatsapp: boolean
  delivery_confirmation_email: boolean
  delivery_confirmation_whatsapp: boolean
  abandoned_cart_email: boolean
  abandoned_cart_whatsapp: boolean
  low_stock_alert_email: boolean
}

export default function NotificationsSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Email state
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
  const [emailCredentials, setEmailCredentials] = useState({
    api_key: '',
    from_email: '',
    from_name: '',
  })
  const [skipEmailValidation, setSkipEmailValidation] = useState(false)

  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null)
  const [whatsappCredentials, setWhatsappCredentials] = useState({
    auth_key: '',
    whatsapp_number: '',
    sender_id: '',
  })

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    order_confirmation_email: true,
    order_confirmation_whatsapp: true,
    shipping_update_email: true,
    shipping_update_whatsapp: true,
    delivery_confirmation_email: true,
    delivery_confirmation_whatsapp: true,
    abandoned_cart_email: true,
    abandoned_cart_whatsapp: false,
    low_stock_alert_email: true,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const [emailRes, whatsappRes] = await Promise.all([
        fetch('/api/dashboard/settings/email'),
        fetch('/api/dashboard/settings/whatsapp'),
      ])

      if (emailRes.ok) {
        const data = await emailRes.json()
        setEmailStatus(data.status)
        if (data.notification_settings) {
          setNotificationSettings(prev => ({ ...prev, ...data.notification_settings }))
        }
      }

      if (whatsappRes.ok) {
        const data = await whatsappRes.json()
        setWhatsappStatus(data.status)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const saveEmailCredentials = async () => {
    if (!emailCredentials.api_key || !emailCredentials.from_email) {
      toast.error('API Key and From Email are required')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/dashboard/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...emailCredentials,
          skip_validation: skipEmailValidation,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Email credentials saved successfully')
        setEmailCredentials({ api_key: '', from_email: '', from_name: '' })
        fetchSettings()
      } else {
        toast.error(data.error || 'Failed to save credentials')
      }
    } catch (error) {
      toast.error('Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const saveWhatsAppCredentials = async () => {
    if (!whatsappCredentials.auth_key || !whatsappCredentials.whatsapp_number) {
      toast.error('Auth Key and WhatsApp Number are required')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/dashboard/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappCredentials),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('WhatsApp credentials saved successfully')
        setWhatsappCredentials({ auth_key: '', whatsapp_number: '', sender_id: '' })
        fetchSettings()
      } else {
        toast.error(data.error || 'Failed to save credentials')
      }
    } catch (error) {
      toast.error('Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const removeEmailCredentials = async () => {
    if (!confirm('Are you sure you want to remove your email credentials? Your store will use platform credentials.')) return

    try {
      const response = await fetch('/api/dashboard/settings/email', { method: 'DELETE' })
      if (response.ok) {
        toast.success('Email credentials removed')
        fetchSettings()
      } else {
        toast.error('Failed to remove credentials')
      }
    } catch (error) {
      toast.error('Failed to remove credentials')
    }
  }

  const removeWhatsAppCredentials = async () => {
    if (!confirm('Are you sure you want to remove your WhatsApp credentials? Your store will use platform credentials.')) return

    try {
      const response = await fetch('/api/dashboard/settings/whatsapp', { method: 'DELETE' })
      if (response.ok) {
        toast.success('WhatsApp credentials removed')
        fetchSettings()
      } else {
        toast.error('Failed to remove credentials')
      }
    } catch (error) {
      toast.error('Failed to remove credentials')
    }
  }

  const updateNotificationSetting = async (key: keyof NotificationSettings, value: boolean) => {
    try {
      // Update local state
      setNotificationSettings(prev => ({ ...prev, [key]: value }))

      // Determine which API to call based on the setting type
      const isEmailSetting = key.includes('email')
      const endpoint = isEmailSetting ? '/api/dashboard/settings/email' : '/api/dashboard/settings/whatsapp'

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_settings: { [key]: value },
        }),
      })

      if (!response.ok) {
        // Revert on failure
        setNotificationSettings(prev => ({ ...prev, [key]: !value }))
        toast.error('Failed to update setting')
      }
    } catch (error) {
      // Revert on failure
      setNotificationSettings(prev => ({ ...prev, [key]: !value }))
      toast.error('Failed to update setting')
    }
  }

  const toggleNotificationsEnabled = async (type: 'email' | 'whatsapp', enabled: boolean) => {
    try {
      const endpoint = type === 'email' ? '/api/dashboard/settings/email' : '/api/dashboard/settings/whatsapp'

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications_enabled: enabled }),
      })

      if (response.ok) {
        fetchSettings()
        toast.success(`${type === 'email' ? 'Email' : 'WhatsApp'} notifications ${enabled ? 'enabled' : 'disabled'}`)
      } else {
        toast.error('Failed to update setting')
      }
    } catch (error) {
      toast.error('Failed to update setting')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure email and WhatsApp notifications for your store
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Custom Notification Services</p>
              <p className="text-sm text-blue-700 mt-1">
                Connect your own Resend (email) and MSG91 (WhatsApp) accounts for branded notifications.
                If not configured, your store will use platform credentials.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email (Resend)
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            WhatsApp (MSG91)
          </TabsTrigger>
        </TabsList>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          {/* Email Credentials Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resend Credentials</span>
                {emailStatus?.configured && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Connect your Resend account to send branded emails from your domain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailStatus?.configured ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">From Email:</span>
                      <span className="text-sm font-medium">{emailStatus.from_email}</span>
                    </div>
                    {emailStatus.from_name && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">From Name:</span>
                        <span className="text-sm font-medium">{emailStatus.from_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">API Key:</span>
                      <span className="text-sm font-mono">{emailStatus.api_key_masked}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Email Notifications</Label>
                      <p className="text-xs text-gray-500">Send transactional emails to customers</p>
                    </div>
                    <Switch
                      checked={emailStatus.notifications_enabled}
                      onCheckedChange={(checked) => toggleNotificationsEnabled('email', checked)}
                    />
                  </div>
                  <Button variant="outline" className="text-red-600" onClick={removeEmailCredentials}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Credentials
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="re_xxxxxxxxxxxx"
                      value={emailCredentials.api_key}
                      onChange={(e) => setEmailCredentials(prev => ({ ...prev, api_key: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>From Email</Label>
                    <Input
                      type="email"
                      placeholder="orders@yourstore.com"
                      value={emailCredentials.from_email}
                      onChange={(e) => setEmailCredentials(prev => ({ ...prev, from_email: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Must be a verified domain in Resend</p>
                  </div>
                  <div>
                    <Label>From Name (optional)</Label>
                    <Input
                      placeholder="Your Store Name"
                      value={emailCredentials.from_name}
                      onChange={(e) => setEmailCredentials(prev => ({ ...prev, from_name: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Switch checked={skipEmailValidation} onCheckedChange={setSkipEmailValidation} />
                    <div>
                      <Label>Skip validation</Label>
                      <p className="text-xs text-gray-500">Save without verifying credentials</p>
                    </div>
                  </div>
                  <Button onClick={saveEmailCredentials} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Connect Resend
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Setup Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Go to{' '}
                    <a
                      href="https://resend.com/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      resend.com/signup
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and create an account
                  </li>
                  <li>Add and verify your domain under <strong>Domains</strong> section</li>
                  <li>
                    Create an API key at{' '}
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      resend.com/api-keys
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Copy the API key and enter it above</li>
                  <li>Use an email address from your verified domain</li>
                </ol>
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg mt-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-xs">
                    Free tier: 100 emails/day. For higher volume, upgrade your Resend plan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          {/* WhatsApp Credentials Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>MSG91 Credentials</span>
                {whatsappStatus?.configured && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Connect your MSG91 account to send WhatsApp notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {whatsappStatus?.configured ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">WhatsApp Number:</span>
                      <span className="text-sm font-medium">{whatsappStatus.whatsapp_number}</span>
                    </div>
                    {whatsappStatus.sender_id && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Sender ID:</span>
                        <span className="text-sm font-medium">{whatsappStatus.sender_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Auth Key:</span>
                      <span className="text-sm font-mono">{whatsappStatus.auth_key_masked}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable WhatsApp Notifications</Label>
                      <p className="text-xs text-gray-500">Send order updates via WhatsApp</p>
                    </div>
                    <Switch
                      checked={whatsappStatus.notifications_enabled}
                      onCheckedChange={(checked) => toggleNotificationsEnabled('whatsapp', checked)}
                    />
                  </div>
                  <Button variant="outline" className="text-red-600" onClick={removeWhatsAppCredentials}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Credentials
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Auth Key</Label>
                    <Input
                      type="password"
                      placeholder="Your MSG91 Auth Key"
                      value={whatsappCredentials.auth_key}
                      onChange={(e) => setWhatsappCredentials(prev => ({ ...prev, auth_key: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>WhatsApp Number</Label>
                    <Input
                      placeholder="91xxxxxxxxxx"
                      value={whatsappCredentials.whatsapp_number}
                      onChange={(e) => setWhatsappCredentials(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Your MSG91 integrated WhatsApp number</p>
                  </div>
                  <div>
                    <Label>Sender ID (optional)</Label>
                    <Input
                      placeholder="STOREX"
                      value={whatsappCredentials.sender_id}
                      onChange={(e) => setWhatsappCredentials(prev => ({ ...prev, sender_id: e.target.value }))}
                    />
                  </div>
                  <Button onClick={saveWhatsAppCredentials} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Connect MSG91
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp Setup Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Go to{' '}
                    <a
                      href="https://msg91.com/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      msg91.com/signup
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and create an account
                  </li>
                  <li>Apply for WhatsApp Business API under <strong>WhatsApp</strong> section</li>
                  <li>Complete business verification (may take 1-3 days)</li>
                  <li>Create message templates and get them approved by WhatsApp</li>
                  <li>
                    Find your Auth Key at{' '}
                    <a
                      href="https://control.msg91.com/app/settings/api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      control.msg91.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Copy your integrated WhatsApp number from the dashboard</li>
                </ol>
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg mt-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-xs">
                    WhatsApp templates must be pre-approved. Contact MSG91 support if you need custom templates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications to send via email and WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { key: 'order_confirmation', label: 'Order Confirmation', description: 'When a new order is placed' },
              { key: 'shipping_update', label: 'Shipping Updates', description: 'When order is shipped or out for delivery' },
              { key: 'delivery_confirmation', label: 'Delivery Confirmation', description: 'When order is delivered' },
              { key: 'abandoned_cart', label: 'Abandoned Cart', description: 'Reminder for abandoned carts' },
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <Switch
                      checked={notificationSettings[`${key}_email` as keyof NotificationSettings]}
                      onCheckedChange={(checked) =>
                        updateNotificationSetting(`${key}_email` as keyof NotificationSettings, checked)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <Switch
                      checked={notificationSettings[`${key}_whatsapp` as keyof NotificationSettings]}
                      onCheckedChange={(checked) =>
                        updateNotificationSetting(`${key}_whatsapp` as keyof NotificationSettings, checked)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Low stock (email only) */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Low Stock Alerts</p>
                <p className="text-sm text-gray-500">Alert when products are running low</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <Switch
                  checked={notificationSettings.low_stock_alert_email}
                  onCheckedChange={(checked) =>
                    updateNotificationSetting('low_stock_alert_email', checked)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
