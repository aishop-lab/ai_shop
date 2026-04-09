'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Globe,
  Loader2,
  ExternalLink,
  Copy,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)]'

const sectionCls =
  'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4'

const sectionTitleCls =
  'text-sm font-medium text-[var(--platform-text-primary)] flex items-center gap-2'

// ---------------------------------------------------------------------------
// Toast Component
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onClose,
}: {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/40 bg-red-500/10 text-red-400',
    info: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        className={cn(
          'rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg backdrop-blur-sm',
          colors[type]
        )}
      >
        {message}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Verification Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  label,
  status,
}: {
  label: string
  status: 'done' | 'failed' | 'pending'
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs',
        status === 'done' && 'text-emerald-400',
        status === 'failed' && 'text-amber-400',
        status === 'pending' && 'text-[var(--platform-text-muted)]'
      )}
    >
      {status === 'done' && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === 'failed' && <XCircle className="h-3.5 w-3.5" />}
      {status === 'pending' && (
        <span className="flex h-3.5 w-3.5 items-center justify-center">
          <span className="h-2 w-2 rounded-full border border-[var(--platform-text-muted)]" />
        </span>
      )}
      {label}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DNS Record Row
// ---------------------------------------------------------------------------

function DnsRow({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string
  value: string
  onCopy?: () => void
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-[var(--platform-text-muted)]">
          {label}
        </span>
        <p
          className={cn(
            'truncate text-sm text-[var(--platform-text-primary)]',
            mono && 'font-mono'
          )}
        >
          {value}
        </p>
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="ml-2 shrink-0 rounded p-1.5 text-[var(--platform-text-muted)] transition-colors hover:bg-[var(--platform-surface-hover)] hover:text-[var(--platform-text-secondary)]"
          title="Copy to clipboard"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Domain Validation
// ---------------------------------------------------------------------------

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

function validateDomain(value: string): string | null {
  if (!value) return 'Domain is required'
  if (value.length < 4) return 'Domain must be at least 4 characters'
  if (value.length > 255) return 'Domain is too long'
  if (!DOMAIN_REGEX.test(value)) return 'Enter a valid domain (e.g., myshop.com or www.myshop.com)'
  return null
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function DomainSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null)
  const [subdomain, setSubdomain] = useState('')
  const [instructions, setInstructions] = useState<DomainResponse['instructions'] | null>(null)
  const [verificationStep, setVerificationStep] = useState<string | null>(null)

  const [domainInput, setDomainInput] = useState('')
  const [domainError, setDomainError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type })
    },
    []
  )

  const clearToast = useCallback(() => setToast(null), [])

  // ---------------------------------------------------------------------------
  // Fetch current domain
  // ---------------------------------------------------------------------------

  const fetchDomainStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/domain')
      if (res.ok) {
        const data: DomainResponse = await res.json()
        setDomainInfo(data.domain)
        setSubdomain(data.subdomain)
        if (data.instructions) {
          setInstructions(data.instructions)
        }
      }
    } catch (error) {
      console.error('Failed to fetch domain status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDomainStatus()
  }, [fetchDomainStatus])

  // ---------------------------------------------------------------------------
  // Add domain
  // ---------------------------------------------------------------------------

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()

    const err = validateDomain(domainInput)
    if (err) {
      setDomainError(err)
      return
    }
    setDomainError(null)
    setIsAdding(true)

    try {
      const res = await fetch('/api/dashboard/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.toLowerCase() }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to add domain')
      }

      setDomainInfo(result.domain)
      setInstructions(result.instructions)
      setDomainInput('')
      showToast('Domain added! Configure your DNS to complete setup.')
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to add domain',
        'error'
      )
    } finally {
      setIsAdding(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Verify domain
  // ---------------------------------------------------------------------------

  const handleVerify = async () => {
    setIsVerifying(true)
    setVerificationStep(null)

    try {
      const res = await fetch('/api/dashboard/domain/verify', {
        method: 'POST',
      })

      const result: VerifyResponse = await res.json()

      if (!res.ok) {
        throw new Error(result.message || 'Verification failed')
      }

      if (result.verified) {
        showToast('Domain verified successfully!')
        setDomainInfo((prev) =>
          prev ? { ...prev, verified: true, sslStatus: 'issued' } : null
        )
        setInstructions(null)
        setVerificationStep(null)
      } else {
        setVerificationStep(result.step || null)

        if (result.step === 'txt') {
          showToast('TXT record not found. Please add the verification TXT record.', 'error')
        } else if (result.step === 'dns') {
          showToast('DNS routing not configured. Please add the CNAME or A record.', 'error')
        } else if (result.step === 'vercel') {
          showToast(result.message || 'Failed to add domain to hosting provider.', 'error')
        } else {
          showToast(result.message || 'DNS not configured correctly', 'error')
        }
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Verification failed',
        'error'
      )
    } finally {
      setIsVerifying(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Remove domain
  // ---------------------------------------------------------------------------

  const handleRemove = async () => {
    setIsRemoving(true)

    try {
      const res = await fetch('/api/dashboard/domain', { method: 'DELETE' })

      if (!res.ok) {
        throw new Error('Failed to remove domain')
      }

      setDomainInfo(null)
      setInstructions(null)
      setShowRemoveConfirm(false)
      setVerificationStep(null)
      showToast('Domain removed')
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to remove domain',
        'error'
      )
    } finally {
      setIsRemoving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Copy helper
  // ---------------------------------------------------------------------------

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard', 'info')
  }

  // ---------------------------------------------------------------------------
  // Derive verification step statuses for the indicator
  // ---------------------------------------------------------------------------

  function stepStatus(step: 'ownership' | 'dns' | 'ssl'): 'done' | 'failed' | 'pending' {
    if (!verificationStep) return 'pending'
    if (step === 'ownership') return verificationStep === 'txt' ? 'failed' : 'done'
    if (step === 'dns') {
      if (verificationStep === 'txt') return 'pending'
      return verificationStep === 'dns' ? 'failed' : 'done'
    }
    // ssl
    if (verificationStep === 'txt' || verificationStep === 'dns') return 'pending'
    return verificationStep === 'vercel' ? 'failed' : 'done'
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--platform-text-muted)]" />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/platform/settings/store"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Store Settings
        </Link>
        <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
          Domain Settings
        </h1>
        <p className="text-sm text-[var(--platform-text-secondary)]">
          Configure how customers reach your store
        </p>
      </div>

      {/* Current subdomain */}
      <div className={sectionCls}>
        <div className={sectionTitleCls}>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          StoreForge Subdomain
        </div>
        <p className="text-xs text-[var(--platform-text-muted)]">
          This subdomain is always active and free
        </p>
        <div className="flex items-center gap-3 rounded border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <Globe className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="min-w-0 flex-1 truncate font-mono text-sm text-emerald-300">
            {subdomain}
          </span>
          <a
            href={`https://${subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10"
            title="Open store"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Custom domain */}
      <div className={sectionCls}>
        <div className={sectionTitleCls}>
          <Globe className="h-4 w-4" />
          Custom Domain
        </div>
        <p className="text-xs text-[var(--platform-text-muted)]">
          Connect your own domain to your store
        </p>

        {domainInfo ? (
          <div className="space-y-5">
            {/* Domain status badge */}
            <div
              className={cn(
                'flex items-center gap-3 rounded border px-4 py-3',
                domainInfo.verified
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-amber-500/20 bg-amber-500/5'
              )}
            >
              {domainInfo.verified ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              ) : (
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              )}
              <span
                className={cn(
                  'min-w-0 flex-1 truncate font-mono text-sm',
                  domainInfo.verified ? 'text-emerald-300' : 'text-amber-300'
                )}
              >
                {domainInfo.domain}
              </span>
              <span
                className={cn(
                  'shrink-0 text-xs font-medium',
                  domainInfo.verified ? 'text-emerald-400' : 'text-amber-400'
                )}
              >
                {domainInfo.verified ? 'Verified' : 'Pending verification'}
              </span>
              {domainInfo.verified && (
                <a
                  href={`https://${domainInfo.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10"
                  title="Open domain"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* DNS instructions (not verified) */}
            {!domainInfo.verified && (
              <div className="space-y-5">
                {/* Step progress */}
                {(instructions?.txtRecord || instructions?.dnsRecord) && verificationStep && (
                  <div className="flex items-center gap-3">
                    <StepIndicator label="Ownership" status={stepStatus('ownership')} />
                    <span className="h-px w-3 bg-[var(--platform-border)]" />
                    <StepIndicator label="DNS" status={stepStatus('dns')} />
                    <span className="h-px w-3 bg-[var(--platform-border)]" />
                    <StepIndicator label="SSL" status={stepStatus('ssl')} />
                  </div>
                )}

                {/* Step 1: TXT record */}
                {instructions?.txtRecord && (
                  <div className="space-y-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                    <p className="text-xs font-medium text-blue-300">
                      Step 1 -- Verify Domain Ownership
                    </p>
                    <p className="text-xs text-blue-400/80">
                      Add a TXT record to prove you own this domain:
                    </p>
                    <div className="space-y-2">
                      <DnsRow label="Type" value={instructions.txtRecord.type} mono />
                      <DnsRow
                        label="Name / Host"
                        value={instructions.txtRecord.name}
                        mono
                        onCopy={() => copyToClipboard(instructions.txtRecord!.name)}
                      />
                      <DnsRow
                        label="Value"
                        value={instructions.txtRecord.value}
                        mono
                        onCopy={() => copyToClipboard(instructions.txtRecord!.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: CNAME / A record */}
                {instructions?.dnsRecord && (
                  <div className="space-y-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4">
                    <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                      Step 2 -- Point Domain to StoreForge
                    </p>
                    <p className="text-xs text-[var(--platform-text-muted)]">
                      Add the following DNS record to route traffic:
                    </p>
                    <div className="space-y-2">
                      <DnsRow label="Type" value={instructions.dnsRecord.type} mono />
                      <DnsRow label="Name / Host" value={instructions.dnsRecord.name} mono />
                      <DnsRow
                        label="Value / Target"
                        value={instructions.dnsRecord.value}
                        mono
                        onCopy={() => copyToClipboard(instructions.dnsRecord!.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Fallback for old format */}
                {!instructions?.txtRecord && !instructions?.dnsRecord && (
                  <div className="space-y-3 rounded-lg border border-[var(--platform-border)] bg-[var(--platform-bg)] p-4">
                    <p className="text-xs font-medium text-[var(--platform-text-primary)]">
                      DNS Configuration Required
                    </p>
                    <div className="space-y-2">
                      <DnsRow label="Type" value="CNAME" mono />
                      <DnsRow
                        label="Name / Host"
                        value={domainInfo.domain.startsWith('www.') ? 'www' : '@'}
                        mono
                      />
                      <DnsRow
                        label="Value / Target"
                        value={domainInfo.dnsTarget}
                        mono
                        onCopy={() => copyToClipboard(domainInfo.dnsTarget)}
                      />
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-[var(--platform-text-muted)]">
                  DNS changes can take up to 48 hours to propagate, but usually complete within a
                  few minutes.
                </p>

                {/* Verify button */}
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded border border-[var(--platform-accent)] px-4 py-2.5 text-xs font-medium text-[var(--platform-accent)] transition-colors hover:bg-[var(--platform-accent)]/10',
                    isVerifying && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Verify Domain
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Remove domain */}
            <div className="border-t border-[var(--platform-border)] pt-4">
              {showRemoveConfirm ? (
                <div className="space-y-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-red-300">Remove Custom Domain</p>
                      <p className="text-xs text-red-400/80">
                        Your store will only be accessible at{' '}
                        <span className="font-mono">{subdomain}</span> after removal.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={isRemoving}
                      className={cn(
                        'rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20',
                        isRemoving && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {isRemoving ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Removing...
                        </span>
                      ) : (
                        'Confirm Remove'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRemoveConfirm(false)}
                      className="rounded border border-[var(--platform-border)] px-3 py-1.5 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors hover:bg-[var(--platform-surface-hover)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="flex items-center gap-2 rounded border border-[var(--platform-border)] px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Custom Domain
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Add domain form */}
            <form onSubmit={handleAddDomain} className="space-y-3">
              <div>
                <label
                  htmlFor="domain-input"
                  className="mb-1.5 block text-xs font-medium text-[var(--platform-text-secondary)]"
                >
                  Domain Name
                </label>
                <input
                  id="domain-input"
                  type="text"
                  value={domainInput}
                  onChange={(e) => {
                    setDomainInput(e.target.value)
                    if (domainError) setDomainError(null)
                  }}
                  placeholder="myshop.com or www.myshop.com"
                  className={cn(
                    inputCls,
                    domainError && 'border-red-500/50 focus:ring-red-500/50'
                  )}
                />
                {domainError ? (
                  <p className="mt-1 text-[10px] text-red-400">{domainError}</p>
                ) : (
                  <p className="mt-1 text-[10px] text-[var(--platform-text-muted)]">
                    Enter the domain you want to connect to your store
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className={cn(
                  'flex items-center gap-2 rounded border border-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-[var(--platform-accent)] transition-colors hover:bg-[var(--platform-accent)]/10',
                  isAdding && 'cursor-not-allowed opacity-50'
                )}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Adding Domain...
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    Add Custom Domain
                  </>
                )}
              </button>
            </form>

            {/* How it works */}
            <div className="border-t border-[var(--platform-border)] pt-4">
              <p className="mb-2 text-xs font-medium text-[var(--platform-text-primary)]">
                How it works
              </p>
              <ol className="list-inside list-decimal space-y-1.5 text-xs text-[var(--platform-text-muted)]">
                <li>Enter your domain name above</li>
                <li>
                  Add the DNS records at your domain provider (GoDaddy, Namecheap, Cloudflare, etc.)
                </li>
                <li>Click verify to confirm the setup</li>
                <li>Your store will be accessible at your custom domain</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Info callout */}
      <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-5 py-4">
        <p className="text-xs text-[var(--platform-text-muted)]">
          Custom domains use SSL certificates provisioned automatically via Vercel. Once verified,
          your store is accessible over HTTPS at your domain with no additional configuration.
        </p>
      </div>
    </div>
  )
}
