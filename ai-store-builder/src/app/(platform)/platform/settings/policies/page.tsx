'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  FileText,
  Save,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Policy {
  content: string
  updated_at: string | null
}

interface Policies {
  returns: Policy
  privacy: Policy
  terms: Policy
  shipping: Policy
}

type PolicyKey = keyof Policies

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLICY_TABS: { key: PolicyKey; label: string; shortLabel: string; description: string }[] = [
  {
    key: 'returns',
    label: 'Return & Refund Policy',
    shortLabel: 'Returns',
    description: 'Define your return window, conditions, and refund process',
  },
  {
    key: 'privacy',
    label: 'Privacy Policy',
    shortLabel: 'Privacy',
    description: 'Explain how you collect, use, and protect customer data',
  },
  {
    key: 'terms',
    label: 'Terms of Service',
    shortLabel: 'Terms',
    description: 'Set the legal terms for using your store',
  },
  {
    key: 'shipping',
    label: 'Shipping Policy',
    shortLabel: 'Shipping',
    description: 'Describe shipping rates, delivery times, and tracking',
  },
]

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const sectionCls =
  'rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-4'

const textareaCls =
  'w-full rounded border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-3 text-sm text-[var(--platform-text-primary)] placeholder:text-[var(--platform-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--platform-accent)] min-h-[300px] resize-y font-mono'

// ---------------------------------------------------------------------------
// Toast Component
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onClose,
}: {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/40 bg-red-500/10 text-red-400',
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
// Page Component
// ---------------------------------------------------------------------------

export default function PoliciesSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<PolicyKey>('returns')
  const [policies, setPolicies] = useState<Policies | null>(null)
  const [editedContent, setEditedContent] = useState<Record<PolicyKey, string>>({
    returns: '',
    privacy: '',
    terms: '',
    shipping: '',
  })
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type })
    },
    []
  )

  const clearToast = useCallback(() => setToast(null), [])

  // -------------------------------------------------------------------------
  // Fetch policies
  // -------------------------------------------------------------------------

  useEffect(() => {
    async function fetchPolicies() {
      try {
        const response = await fetch('/api/stores/policies')
        if (response.ok) {
          const data = await response.json()
          setPolicies(data.policies)
          setEditedContent({
            returns: data.policies?.returns?.content || '',
            privacy: data.policies?.privacy?.content || '',
            terms: data.policies?.terms?.content || '',
            shipping: data.policies?.shipping?.content || '',
          })
        } else {
          showToast('Failed to load policies', 'error')
        }
      } catch (error) {
        console.error('Failed to fetch policies:', error)
        showToast('Failed to load policies', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchPolicies()
  }, [showToast])

  // -------------------------------------------------------------------------
  // Save single policy
  // -------------------------------------------------------------------------

  const handleSave = async (policyType: PolicyKey) => {
    setSaving(true)
    try {
      const response = await fetch('/api/stores/policies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: policyType,
          content: editedContent[policyType],
        }),
      })

      if (response.ok) {
        // Update local state with new timestamp
        setPolicies((prev) =>
          prev
            ? {
                ...prev,
                [policyType]: {
                  content: editedContent[policyType],
                  updated_at: new Date().toISOString(),
                },
              }
            : prev
        )
        showToast('Policy saved successfully')
      } else {
        showToast('Failed to save policy', 'error')
      }
    } catch (error) {
      console.error('Failed to save policy:', error)
      showToast('Failed to save policy', 'error')
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Regenerate all policies (AI)
  // -------------------------------------------------------------------------

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const response = await fetch('/api/stores/policies/regenerate', {
        method: 'POST',
      })

      if (response.ok) {
        showToast('Policies regenerated successfully')
        // Re-fetch to get the new content
        const refetch = await fetch('/api/stores/policies')
        if (refetch.ok) {
          const data = await refetch.json()
          setPolicies(data.policies)
          setEditedContent({
            returns: data.policies?.returns?.content || '',
            privacy: data.policies?.privacy?.content || '',
            terms: data.policies?.terms?.content || '',
            shipping: data.policies?.shipping?.content || '',
          })
        }
      } else {
        showToast('Failed to regenerate policies', 'error')
      }
    } catch (error) {
      console.error('Failed to regenerate policies:', error)
      showToast('Failed to regenerate policies', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const activePolicy = POLICY_TABS.find((t) => t.key === activeTab)!
  const hasContent = editedContent[activeTab].trim().length > 0
  const lastUpdated = policies?.[activeTab]?.updated_at

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--platform-text-muted)]" />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Main Render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/platform/settings/store"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--platform-text-muted)] transition-colors hover:text-[var(--platform-text-secondary)]"
        >
          <ArrowLeft className="h-3 w-3" /> Store Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-lg font-semibold text-[var(--platform-text-primary)]">
              Legal Policies
            </h1>
            <p className="text-sm text-[var(--platform-text-secondary)]">
              Manage your store&apos;s legal documents and policies
            </p>
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className={cn(
              'inline-flex items-center gap-2 rounded border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-1.5 text-xs font-medium text-[var(--platform-text-secondary)] transition-colors',
              regenerating
                ? 'cursor-not-allowed opacity-60'
                : 'hover:border-[var(--platform-border-hover)] hover:text-[var(--platform-text-primary)]'
            )}
          >
            {regenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI Regenerate All
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-300">Legal Disclaimer</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              These policies are auto-generated templates. We recommend consulting a lawyer
              before making major changes, especially for complex business requirements.
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-[var(--platform-border)]">
        <nav className="-mb-px flex gap-0" aria-label="Policy tabs">
          {POLICY_TABS.map((tab) => {
            const isActive = activeTab === tab.key
            const tabHasContent = (editedContent[tab.key] || '').trim().length > 0
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'text-[var(--platform-accent)]'
                    : 'text-[var(--platform-text-muted)] hover:text-[var(--platform-text-secondary)]'
                )}
              >
                <span className="flex items-center gap-1.5">
                  {tab.shortLabel}
                  {tabHasContent && (
                    <span
                      className={cn(
                        'inline-block h-1.5 w-1.5 rounded-full',
                        isActive ? 'bg-[var(--platform-accent)]' : 'bg-emerald-500/60'
                      )}
                    />
                  )}
                </span>
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--platform-accent)]" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Policy editor */}
      <div className={sectionCls}>
        {/* Policy header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded bg-[var(--platform-accent)]/10 p-1.5">
              <FileText className="h-4 w-4 text-[var(--platform-accent)]" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-[var(--platform-text-primary)]">
                {activePolicy.label}
              </h2>
              <p className="text-xs text-[var(--platform-text-muted)] mt-0.5">
                {activePolicy.description}
              </p>
            </div>
          </div>
          {lastUpdated && (
            <span className="shrink-0 text-[10px] text-[var(--platform-text-muted)]">
              Updated {new Date(lastUpdated).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={editedContent[activeTab]}
          onChange={(e) =>
            setEditedContent((prev) => ({ ...prev, [activeTab]: e.target.value }))
          }
          placeholder="Enter policy content (HTML supported)..."
          className={textareaCls}
        />

        {/* Footer: character count + save */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--platform-text-muted)]">
            {hasContent
              ? `${editedContent[activeTab].length.toLocaleString()} characters`
              : 'No content yet'}
          </span>
          <button
            type="button"
            onClick={() => handleSave(activeTab)}
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-2 rounded bg-[var(--platform-accent)] px-4 py-2 text-xs font-medium text-white transition-colors',
              saving
                ? 'cursor-not-allowed opacity-60'
                : 'hover:bg-[var(--platform-accent-hover)]'
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save {activePolicy.shortLabel} Policy
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
