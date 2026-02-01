'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
  ExternalLink,
  Trash2,
  AlertTriangle
} from 'lucide-react'

interface DomainInfo {
  domain: string
  verified: boolean
  verifiedAt?: string
  dnsTarget: string
  sslStatus: string
  verificationToken?: string
}

interface DnsInstruction {
  type: string
  name: string
  value: string
  message: string
}

interface DomainResponse {
  success: boolean
  domain: DomainInfo | null
  subdomain: string
  instructions?: {
    txtRecord?: DnsInstruction
    dnsRecord?: DnsInstruction
  } | null
}

interface VerifyResponse {
  success: boolean
  verified: boolean
  step?: 'txt' | 'dns' | 'vercel'
  message?: string
  expected?: {
    type: string
    name: string
    value: string
  }
}

const domainSchema = z.object({
  domain: z.string()
    .min(4, 'Domain must be at least 4 characters')
    .max(255, 'Domain is too long')
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
      'Enter a valid domain (e.g., myshop.com or www.myshop.com)'
    )
})

type DomainFormData = z.infer<typeof domainSchema>

export default function DomainSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null)
  const [subdomain, setSubdomain] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [instructions, setInstructions] = useState<DomainResponse['instructions'] | null>(null)
  const [verificationStep, setVerificationStep] = useState<string | null>(null)

  const form = useForm<DomainFormData>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: '' }
  })

  useEffect(() => {
    fetchDomainStatus()
  }, [])

  const fetchDomainStatus = async () => {
    try {
      const response = await fetch('/api/dashboard/domain')
      if (response.ok) {
        const data: DomainResponse = await response.json()
        setDomainInfo(data.domain)
        setSubdomain(data.subdomain)
        if (data.instructions) {
          setInstructions(data.instructions)
        }
      }
    } catch (error) {
      console.error('Failed to fetch domain status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const onAddDomain = async (data: DomainFormData) => {
    setIsAdding(true)
    try {
      const response = await fetch('/api/dashboard/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add domain')
      }

      setDomainInfo(result.domain)
      setInstructions(result.instructions)
      form.reset()
      toast.success('Domain added! Configure your DNS to complete setup.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add domain')
    } finally {
      setIsAdding(false)
    }
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    setVerificationStep(null)
    try {
      const response = await fetch('/api/dashboard/domain/verify', {
        method: 'POST'
      })

      const result: VerifyResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Verification failed')
      }

      if (result.verified) {
        toast.success('Domain verified successfully!')
        setDomainInfo(prev => prev ? { ...prev, verified: true, sslStatus: 'issued' } : null)
        setInstructions(null)
        setVerificationStep(null)
      } else {
        // Show which step failed
        setVerificationStep(result.step || null)

        if (result.step === 'txt') {
          toast.error('TXT record not found. Please add the verification TXT record.')
        } else if (result.step === 'dns') {
          toast.error('DNS routing not configured. Please add the CNAME or A record.')
        } else if (result.step === 'vercel') {
          toast.error(result.message || 'Failed to add domain to hosting provider.')
        } else {
          toast.error(result.message || 'DNS not configured correctly')
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      const response = await fetch('/api/dashboard/domain', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove domain')
      }

      setDomainInfo(null)
      setInstructions(null)
      setShowRemoveDialog(false)
      toast.success('Domain removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove domain')
    } finally {
      setIsRemoving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (isLoading) {
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
          <h1 className="text-3xl font-bold">Domain Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your store's domain
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Current Subdomain */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Your StoreForge Subdomain
            </CardTitle>
            <CardDescription>
              This subdomain is always active and free
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Globe className="h-5 w-5 text-green-600" />
              <span className="font-mono text-green-800">{subdomain}</span>
              <a
                href={`https://${subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
              >
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Custom Domain */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Custom Domain
            </CardTitle>
            <CardDescription>
              Connect your own domain to your store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {domainInfo ? (
              <>
                {/* Domain Status */}
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  domainInfo.verified
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  {domainInfo.verified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span className={`font-mono ${domainInfo.verified ? 'text-green-800' : 'text-yellow-800'}`}>
                    {domainInfo.domain}
                  </span>
                  <span className={`ml-2 text-sm ${domainInfo.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                    {domainInfo.verified ? 'Verified' : 'Pending verification'}
                  </span>
                  {domainInfo.verified && (
                    <a
                      href={`https://${domainInfo.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto"
                    >
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>

                {/* DNS Instructions (if not verified) */}
                {!domainInfo.verified && (
                  <div className="space-y-4">
                    {/* Progress indicator */}
                    {(instructions?.txtRecord || instructions?.dnsRecord) && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`flex items-center gap-1 ${verificationStep === 'txt' ? 'text-yellow-600' : verificationStep === 'dns' || verificationStep === 'vercel' || !verificationStep ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {verificationStep === 'txt' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          <span>Ownership</span>
                        </div>
                        <div className="h-px w-4 bg-muted" />
                        <div className={`flex items-center gap-1 ${verificationStep === 'dns' ? 'text-yellow-600' : verificationStep === 'vercel' || !verificationStep ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                          {verificationStep === 'dns' ? (
                            <XCircle className="h-4 w-4" />
                          ) : verificationStep === 'vercel' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
                          <span>DNS</span>
                        </div>
                        <div className="h-px w-4 bg-muted" />
                        <div className={`flex items-center gap-1 ${verificationStep === 'vercel' ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                          {verificationStep === 'vercel' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
                          <span>SSL</span>
                        </div>
                      </div>
                    )}

                    {/* Step 1: TXT Record for Verification */}
                    {instructions?.txtRecord && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                        <p className="text-sm font-medium text-blue-800">Step 1: Verify Domain Ownership</p>
                        <p className="text-sm text-blue-600">
                          Add a TXT record to prove you own this domain:
                        </p>

                        <div className="grid gap-2">
                          <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                            <div>
                              <span className="text-xs text-muted-foreground">Type</span>
                              <p className="font-mono text-sm">{instructions.txtRecord.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                            <div className="flex-1">
                              <span className="text-xs text-muted-foreground">Name/Host</span>
                              <p className="font-mono text-sm">{instructions.txtRecord.name}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(instructions.txtRecord!.name)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-muted-foreground">Value</span>
                              <p className="font-mono text-sm truncate">{instructions.txtRecord.value}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(instructions.txtRecord!.value)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: CNAME/A Record for Routing */}
                    {instructions?.dnsRecord && (
                      <div className="p-4 bg-muted rounded-lg space-y-3">
                        <p className="text-sm font-medium">Step 2: Point Domain to StoreForge</p>
                        <p className="text-sm text-muted-foreground">
                          Add the following DNS record to route traffic:
                        </p>

                        <div className="grid gap-2">
                          <div className="flex items-center justify-between p-2 bg-background rounded border">
                            <div>
                              <span className="text-xs text-muted-foreground">Type</span>
                              <p className="font-mono text-sm">{instructions.dnsRecord.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-background rounded border">
                            <div>
                              <span className="text-xs text-muted-foreground">Name/Host</span>
                              <p className="font-mono text-sm">{instructions.dnsRecord.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-background rounded border">
                            <div className="flex-1">
                              <span className="text-xs text-muted-foreground">Value/Target</span>
                              <p className="font-mono text-sm">{instructions.dnsRecord.value}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(instructions.dnsRecord!.value)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fallback for old format */}
                    {!instructions?.txtRecord && !instructions?.dnsRecord && (
                      <div className="p-4 bg-muted rounded-lg space-y-3">
                        <p className="text-sm font-medium">DNS Configuration Required</p>
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between p-2 bg-background rounded border">
                            <div>
                              <span className="text-xs text-muted-foreground">Type</span>
                              <p className="font-mono text-sm">CNAME</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-background rounded border">
                            <div>
                              <span className="text-xs text-muted-foreground">Name/Host</span>
                              <p className="font-mono text-sm">
                                {domainInfo.domain.startsWith('www.') ? 'www' : '@'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-background rounded border">
                            <div className="flex-1">
                              <span className="text-xs text-muted-foreground">Value/Target</span>
                              <p className="font-mono text-sm">{domainInfo.dnsTarget}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(domainInfo.dnsTarget)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      DNS changes can take up to 48 hours to propagate, but usually complete within a few minutes.
                    </p>

                    <Button onClick={handleVerify} disabled={isVerifying} className="w-full">
                      {isVerifying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Verify Domain
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Remove Domain */}
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowRemoveDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Custom Domain
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Add Domain Form */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onAddDomain)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domain Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="myshop.com or www.myshop.com"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the domain you want to connect to your store
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isAdding}>
                      {isAdding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding Domain...
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Add Custom Domain
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Instructions */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">How it works</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Enter your domain name above</li>
                    <li>Add the DNS record to your domain provider (GoDaddy, Namecheap, etc.)</li>
                    <li>Click verify to confirm the setup</li>
                    <li>Your store will be accessible at your custom domain</li>
                  </ol>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Remove Confirmation */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Custom Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your custom domain? Your store will
              only be accessible at {subdomain} after removal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Domain'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
