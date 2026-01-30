'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  RefreshCw
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface TwoFactorStatus {
  enabled: boolean
  enabledAt: string | null
}

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [showVerifyDialog, setShowVerifyDialog] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [isDisabling, setIsDisabling] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [currentAction, setCurrentAction] = useState<'enable' | 'disable'>('enable')

  // Fetch 2FA status on mount
  useEffect(() => {
    fetchStatus()
  }, [])

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/auth/2fa/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartSetup = async () => {
    setIsSettingUp(true)
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST'
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining)
        }
        throw new Error(data.error || 'Setup failed')
      }

      toast.success('Verification code sent to your email')
      setCurrentAction('enable')
      setShowVerifyDialog(true)
      setCooldown(data.cooldownSeconds || 60)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start 2FA setup')
    } finally {
      setIsSettingUp(false)
    }
  }

  const handleStartDisable = async () => {
    setIsDisabling(true)
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST'
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining)
        }
        throw new Error(data.error || 'Failed to start disable process')
      }

      toast.success('Verification code sent to your email')
      setCurrentAction('disable')
      setShowDisableDialog(true)
      setCooldown(data.cooldownSeconds || 60)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start disable process')
    } finally {
      setIsDisabling(false)
    }
  }

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationCode, action: 'enable' })
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.attemptsRemaining !== undefined) {
          toast.error(`${data.error}. ${data.attemptsRemaining} attempts remaining.`)
        } else {
          throw new Error(data.error || 'Verification failed')
        }
        return
      }

      toast.success('2FA enabled successfully!')
      setShowVerifyDialog(false)
      setVerificationCode('')
      fetchStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDisableVerify = async () => {
    if (disableCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableCode, action: 'disable' })
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.attemptsRemaining !== undefined) {
          toast.error(`${data.error}. ${data.attemptsRemaining} attempts remaining.`)
        } else {
          throw new Error(data.error || 'Failed to disable')
        }
        return
      }

      toast.success('2FA disabled successfully')
      setShowDisableDialog(false)
      setDisableCode('')
      fetchStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disable 2FA')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async (action: 'enable' | 'disable') => {
    setIsResending(true)
    try {
      const endpoint = action === 'enable' ? '/api/auth/2fa/setup' : '/api/auth/2fa/disable'
      const response = await fetch(endpoint, { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining)
        }
        throw new Error(data.error || 'Failed to resend code')
      }

      toast.success('New verification code sent')
      setCooldown(data.cooldownSeconds || 60)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend code')
    } finally {
      setIsResending(false)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Security</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account security settings
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* 2FA Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security with email verification codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Status */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {status?.enabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">
                    2FA is {status?.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                  {status?.enabled && status.enabledAt && (
                    <p className="text-xs text-muted-foreground">
                      Enabled on {new Date(status.enabledAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {status?.enabled ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStartDisable}
                  disabled={isDisabling}
                >
                  {isDisabling ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Disable
                </Button>
              ) : (
                <Button onClick={handleStartSetup} disabled={isSettingUp}>
                  {isSettingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Enable 2FA
                </Button>
              )}
            </div>

            {/* How it works */}
            {!status?.enabled && (
              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium">How it works</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Receive a 6-digit code via email when signing in
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Codes expire after 10 minutes for security
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    No authenticator app required
                  </li>
                </ul>
              </div>
            )}

            {/* When enabled */}
            {status?.enabled && (
              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium">Security active</p>
                <p className="text-sm text-muted-foreground">
                  A verification code will be sent to your email each time you sign in.
                  This helps protect your account even if your password is compromised.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enable Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Verification Code</DialogTitle>
            <DialogDescription>
              We sent a 6-digit code to your email. Enter it below to enable 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verify-code">Verification Code</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="font-mono text-center tracking-widest text-lg"
                autoFocus
              />
            </div>
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResend('enable')}
                disabled={isResending || cooldown > 0}
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerify} disabled={isVerifying || verificationCode.length !== 6}>
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Enable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Verification Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter the verification code sent to your email to confirm disabling 2FA.
              This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Verification Code</Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                className="font-mono text-center tracking-widest text-lg"
                autoFocus
              />
            </div>
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResend('disable')}
                disabled={isResending || cooldown > 0}
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableVerify}
              disabled={isVerifying || disableCode.length !== 6}
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
