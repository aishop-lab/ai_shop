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
  Smartphone,
  Key,
  Copy,
  Eye,
  EyeOff
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
  remainingBackupCodes: number
}

interface SetupData {
  qrCode: string
  backupCodes: string[]
}

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  // Fetch 2FA status on mount
  useEffect(() => {
    fetchStatus()
  }, [])

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
        throw new Error(data.error || 'Setup failed')
      }

      setSetupData({
        qrCode: data.qrCode,
        backupCodes: data.backupCodes
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start 2FA setup')
    } finally {
      setIsSettingUp(false)
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
        throw new Error(data.error || 'Verification failed')
      }

      toast.success('2FA enabled successfully!')
      setSetupData(null)
      setVerificationCode('')
      fetchStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }

    setIsDisabling(true)
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableCode })
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable')
      }

      toast.success('2FA disabled successfully')
      setShowDisableDialog(false)
      setDisableCode('')
      fetchStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disable 2FA')
    } finally {
      setIsDisabling(false)
    }
  }

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'))
      toast.success('Backup codes copied to clipboard')
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
              Add an extra layer of security to your account
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
                  onClick={() => setShowDisableDialog(true)}
                >
                  Disable
                </Button>
              ) : (
                <Button onClick={handleStartSetup} disabled={isSettingUp}>
                  {isSettingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
                  )}
                  Enable 2FA
                </Button>
              )}
            </div>

            {/* Backup codes info */}
            {status?.enabled && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {status.remainingBackupCodes} backup codes remaining
                </span>
              </div>
            )}

            {/* Setup Flow */}
            {setupData && (
              <div className="space-y-4 pt-4 border-t">
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Scan QR Code</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use Google Authenticator, Authy, or similar app
                  </p>
                  <div className="inline-block p-4 bg-white rounded-lg border">
                    {/* Using img instead of next/image for base64 data URLs */}
                    <img
                      src={setupData.qrCode}
                      alt="2FA QR Code"
                      width={200}
                      height={200}
                      className="mx-auto"
                    />
                  </div>
                </div>

                {/* Backup Codes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Backup Codes</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBackupCodes(!showBackupCodes)}
                      >
                        {showBackupCodes ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={copyBackupCodes}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Save these codes securely. Each can be used once if you lose access to your authenticator.
                  </p>
                  {showBackupCodes && (
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                      {setupData.backupCodes.map((code, index) => (
                        <div key={index} className="text-center">
                          {code}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verification */}
                <div className="space-y-2">
                  <Label htmlFor="code">Enter verification code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="font-mono text-center tracking-widest"
                    />
                    <Button onClick={handleVerify} disabled={isVerifying}>
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Verify'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            {!status?.enabled && !setupData && (
              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium">Why enable 2FA?</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Protects against password theft
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Prevents unauthorized access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Industry-standard TOTP security
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your authenticator code to confirm disabling 2FA.
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
                className="font-mono text-center tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={isDisabling}
            >
              {isDisabling ? (
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
