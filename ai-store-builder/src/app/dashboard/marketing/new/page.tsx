'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Mail,
  Users,
  Send,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/contexts/auth-context'

type Channel = 'whatsapp' | 'email'
type Segment = 'all' | 'active' | 'at_risk' | 'churned' | 'new'

const SEGMENTS: { value: Segment; label: string; description: string }[] = [
  { value: 'all', label: 'All Customers', description: 'Every opted-in customer' },
  { value: 'active', label: 'Active', description: 'Ordered in the last 30 days' },
  { value: 'at_risk', label: 'At Risk', description: 'Last order 30-90 days ago' },
  { value: 'churned', label: 'Churned', description: 'No orders in 90+ days' },
  { value: 'new', label: 'New Customers', description: '0-1 orders placed' },
]

const WHATSAPP_TEMPLATES = [
  { value: 'marketing_campaign', label: 'General Marketing', description: 'General promotional message' },
  { value: 'product_launch', label: 'Product Launch', description: 'Announce a new product' },
  { value: 'sale_announcement', label: 'Sale Announcement', description: 'Promote a sale or discount' },
  { value: 'abandoned_cart', label: 'Cart Reminder', description: 'Remind about abandoned carts' },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [step, setStep] = useState(1)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [channel, setChannel] = useState<Channel>('whatsapp')
  const [name, setName] = useState('')
  const [segment, setSegment] = useState<Segment>('all')
  const [templateName, setTemplateName] = useState('marketing_campaign')
  const [subject, setSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')

  // Audience estimate
  const [estimate, setEstimate] = useState<number | null>(null)
  const [loadingEstimate, setLoadingEstimate] = useState(false)

  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await fetch('/api/dashboard/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.store?.id) {
            setStoreId(data.store.id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch store:', error)
      }
    }
    fetchStore()
  }, [])

  // Fetch audience estimate when channel or segment changes (on step 2+)
  useEffect(() => {
    if (!storeId || step < 2) return

    async function fetchEstimate() {
      setLoadingEstimate(true)
      try {
        const params = new URLSearchParams({
          store_id: storeId!,
          channel,
          segment,
        })
        const response = await fetch(`/api/dashboard/campaigns/estimate?${params}`)
        if (response.ok) {
          const data = await response.json()
          setEstimate(data.estimate)
        }
      } catch (error) {
        console.error('Failed to fetch estimate:', error)
      } finally {
        setLoadingEstimate(false)
      }
    }
    fetchEstimate()
  }, [storeId, channel, segment, step])

  const handleCreate = async () => {
    if (!storeId || !name) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/dashboard/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          name,
          channel,
          segment_filters: { segment },
          template_name: channel === 'whatsapp' ? templateName : null,
          subject: channel === 'email' ? subject : null,
          content: {
            template_params: {},
            body: messageBody || null,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/dashboard/marketing/${data.campaign.id}`)
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to create campaign')
      }
    } catch (error) {
      console.error('Failed to create campaign:', error)
      alert('Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  const canGoNext = () => {
    if (step === 1) return true // channel selection always has a default
    if (step === 2) return name.trim().length > 0
    return true
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/marketing">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Campaign</h1>
          <p className="text-muted-foreground text-sm">Step {step} of 3</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Choose Channel */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Choose Channel</h2>
          <p className="text-sm text-muted-foreground">
            Select how you want to reach your customers
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                channel === 'whatsapp'
                  ? 'border-emerald-500 bg-emerald-900/10'
                  : 'border-zinc-800 hover:border-zinc-600 bg-card'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-900/30 text-emerald-400">
                  <MessageSquare className="h-6 w-6" />
                </div>
                {channel === 'whatsapp' && (
                  <Check className="h-5 w-5 text-emerald-400 ml-auto" />
                )}
              </div>
              <h3 className="font-semibold mb-1">WhatsApp</h3>
              <p className="text-xs text-muted-foreground">
                Send template messages via WhatsApp Business API. High open rates, instant delivery.
              </p>
            </button>

            {/* Email */}
            <button
              type="button"
              onClick={() => setChannel('email')}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                channel === 'email'
                  ? 'border-blue-500 bg-blue-900/10'
                  : 'border-zinc-800 hover:border-zinc-600 bg-card'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-900/30 text-blue-400">
                  <Mail className="h-6 w-6" />
                </div>
                {channel === 'email' && (
                  <Check className="h-5 w-5 text-blue-400 ml-auto" />
                )}
              </div>
              <h3 className="font-semibold mb-1">Email</h3>
              <p className="text-xs text-muted-foreground">
                Send marketing emails via Resend. Rich formatting, detailed analytics.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Name + Segment + Template */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Campaign Details</h2>
            <p className="text-sm text-muted-foreground">
              Name your campaign and choose your audience
            </p>
          </div>

          {/* Campaign Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Campaign Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Sale Announcement"
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          {/* Segment Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Target Audience</label>
            <div className="space-y-2">
              {SEGMENTS.map((seg) => (
                <button
                  key={seg.value}
                  type="button"
                  onClick={() => setSegment(seg.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    segment === seg.value
                      ? 'border-primary bg-primary/5'
                      : 'border-zinc-800 hover:border-zinc-600 bg-card'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    segment === seg.value ? 'border-primary' : 'border-zinc-600'
                  }`}>
                    {segment === seg.value && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{seg.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{seg.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Reach */}
          <div className="flex items-center gap-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Estimated reach:</span>
            {loadingEstimate ? (
              <span className="text-sm text-muted-foreground">calculating...</span>
            ) : (
              <span className="text-sm font-semibold">
                {estimate !== null ? `${estimate} customer${estimate !== 1 ? 's' : ''}` : '--'}
              </span>
            )}
          </div>

          {/* Template Selection (WhatsApp) */}
          {channel === 'whatsapp' && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Message Template</label>
              <div className="space-y-2">
                {WHATSAPP_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.value}
                    type="button"
                    onClick={() => setTemplateName(tmpl.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      templateName === tmpl.value
                        ? 'border-emerald-500 bg-emerald-900/10'
                        : 'border-zinc-800 hover:border-zinc-600 bg-card'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      templateName === tmpl.value ? 'border-emerald-500' : 'border-zinc-600'
                    }`}>
                      {templateName === tmpl.value && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{tmpl.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{tmpl.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject (Email) */}
          {channel === 'email' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Don't miss our Summer Sale!"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Review & Create</h2>
            <p className="text-sm text-muted-foreground">
              Review your campaign before creating it
            </p>
          </div>

          <div className="bg-card border border-zinc-800 rounded-lg divide-y divide-zinc-800">
            {/* Channel */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Channel</span>
              <div className="flex items-center gap-2">
                {channel === 'whatsapp' ? (
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Mail className="h-4 w-4 text-blue-400" />
                )}
                <span className="text-sm font-medium capitalize">{channel}</span>
              </div>
            </div>

            {/* Campaign Name */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Campaign Name</span>
              <span className="text-sm font-medium">{name}</span>
            </div>

            {/* Segment */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Target Segment</span>
              <span className="text-sm font-medium">
                {SEGMENTS.find((s) => s.value === segment)?.label || 'All'}
              </span>
            </div>

            {/* Template / Subject */}
            {channel === 'whatsapp' ? (
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Template</span>
                <span className="text-sm font-medium">
                  {WHATSAPP_TEMPLATES.find((t) => t.value === templateName)?.label || templateName}
                </span>
              </div>
            ) : (
              subject && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-muted-foreground">Subject</span>
                  <span className="text-sm font-medium">{subject}</span>
                </div>
              )
            )}

            {/* Estimated Reach */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Estimated Reach</span>
              <span className="text-sm font-semibold">
                {loadingEstimate ? 'calculating...' : `${estimate ?? 0} customers`}
              </span>
            </div>
          </div>

          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-xs text-muted-foreground">
              The campaign will be created as a <strong>draft</strong>. You can send it from
              the campaign detail page after reviewing.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => {
            if (step === 1) {
              router.push('/dashboard/marketing')
            } else {
              setStep(step - 1)
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canGoNext()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
