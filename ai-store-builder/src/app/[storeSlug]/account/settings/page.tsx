'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCustomer } from '@/lib/contexts/customer-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  User,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  Bell
} from 'lucide-react'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number').optional().or(z.literal('')),
  marketingConsent: z.boolean().optional()
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function CustomerSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string
  const { customer, isLoading: customerLoading, isAuthenticated, refreshCustomer, logout } = useCustomer()

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [profileUpdated, setProfileUpdated] = useState(false)

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    orderUpdates: true,
    shippingNotifications: true,
    promotionalEmails: false,
    cartReminders: true
  })

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      marketingConsent: false
    }
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  useEffect(() => {
    if (!customerLoading && !isAuthenticated) {
      router.push(`/${storeSlug}/account/login?redirect=/${storeSlug}/account/settings`)
    }
  }, [customerLoading, isAuthenticated, router, storeSlug])

  // Populate form when customer data loads
  useEffect(() => {
    if (customer) {
      profileForm.reset({
        fullName: customer.full_name || '',
        phone: customer.phone || '',
        marketingConsent: false // We don't have this in the customer context currently
      })
    }
  }, [customer, profileForm])

  // Load notification preferences from localStorage
  useEffect(() => {
    if (customer?.id) {
      try {
        const stored = localStorage.getItem(`notif-prefs-${customer.id}`)
        if (stored) {
          setNotifPrefs(JSON.parse(stored))
        }
      } catch {
        // Ignore parse errors, use defaults
      }
    }
  }, [customer?.id])

  const updateNotifPref = (key: keyof typeof notifPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value }
    setNotifPrefs(updated)
    if (customer?.id) {
      try {
        localStorage.setItem(`notif-prefs-${customer.id}`, JSON.stringify(updated))
      } catch {
        // Ignore storage errors
      }
    }
    toast.success('Notification preference updated')
  }

  const onUpdateProfile = async (data: ProfileFormData) => {
    setIsUpdatingProfile(true)
    setProfileUpdated(false)
    try {
      const response = await fetch('/api/customer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile')
      }

      await refreshCustomer()
      setProfileUpdated(true)
      toast.success('Profile updated successfully')

      // Clear success indicator after 3 seconds
      setTimeout(() => setProfileUpdated(false), 3000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onChangePassword = async (data: PasswordFormData) => {
    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/customer/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password')
      }

      toast.success('Password changed successfully. Please sign in again.')
      passwordForm.reset()

      // Log out and redirect to login
      await logout()
      router.push(`/${storeSlug}/account/login`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (customerLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!customer) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${storeSlug}/account`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile and security</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
              {profileUpdated && (
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              )}
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Email</FormLabel>
                  <Input value={customer.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <FormField
                  control={profileForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="marketingConsent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Receive marketing emails
                        </FormLabel>
                        <FormDescription>
                          Get updates about new products, offers, and promotions
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? 'text' : 'password'}
                            placeholder="Enter current password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Enter new password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Must be at least 8 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button type="submit" variant="outline" disabled={isChangingPassword}>
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    You will be signed out after changing your password
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose which notifications you would like to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-order-updates">Order updates</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about order confirmations and status changes
                </p>
              </div>
              <Switch
                id="notif-order-updates"
                checked={notifPrefs.orderUpdates}
                onCheckedChange={(checked) => updateNotifPref('orderUpdates', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-shipping">Shipping notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive updates when your order is shipped or delivered
                </p>
              </div>
              <Switch
                id="notif-shipping"
                checked={notifPrefs.shippingNotifications}
                onCheckedChange={(checked) => updateNotifPref('shippingNotifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-promo">Promotional emails</Label>
                <p className="text-xs text-muted-foreground">
                  Receive offers, discounts, and product recommendations
                </p>
              </div>
              <Switch
                id="notif-promo"
                checked={notifPrefs.promotionalEmails}
                onCheckedChange={(checked) => updateNotifPref('promotionalEmails', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-cart">Cart reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Get reminded about items left in your cart
                </p>
              </div>
              <Switch
                id="notif-cart"
                checked={notifPrefs.cartReminders}
                onCheckedChange={(checked) => updateNotifPref('cartReminders', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
