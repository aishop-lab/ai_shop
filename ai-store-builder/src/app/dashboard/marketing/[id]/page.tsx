'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Mail,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/contexts/auth-context'
import { format } from 'date-fns'

interface Campaign {
  id: string
  name: string
  channel: 'whatsapp' | 'email'
  status: string
  segment_filters: Record<string, unknown>
  template_name: string | null
  subject: string | null
  content: Record<string, unknown>
  target_count: number
  sent_count: number
  delivered_count: number
  read_count: number
  clicked_count: number
  failed_count: number
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

interface CampaignMessage {
  id: string
  customer_id: string
  channel: string
  recipient: string
  status: string
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  failed_at: string | null
  error_message: string | null
  external_message_id: string | null
  created_at: string
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-zinc-700 text-zinc-300' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-900/50 text-blue-400' },
  sending: { label: 'Sending', className: 'bg-yellow-900/50 text-yellow-400' },
  sent: { label: 'Sent', className: 'bg-emerald-900/50 text-emerald-400' },
  paused: { label: 'Paused', className: 'bg-orange-900/50 text-orange-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-900/50 text-red-400' },
}

const MSG_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'text-zinc-400' },
  sent: { label: 'Sent', className: 'text-blue-400' },
  delivered: { label: 'Delivered', className: 'text-emerald-400' },
  read: { label: 'Read', className: 'text-emerald-300' },
  failed: { label: 'Failed', className: 'text-red-400' },
  bounced: { label: 'Bounced', className: 'text-orange-400' },
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useAuth()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [messages, setMessages] = useState<CampaignMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/campaigns/${id}`)
      if (response.ok) {
        const data = await response.json()
        setCampaign(data.campaign)
        setMessages(data.messages || [])
      } else {
        router.push('/dashboard/marketing')
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  // Auto-refresh while sending
  useEffect(() => {
    if (campaign?.status === 'sending') {
      const interval = setInterval(fetchCampaign, 5000)
      return () => clearInterval(interval)
    }
  }, [campaign?.status, fetchCampaign])

  const handleSend = async () => {
    if (!confirm('Are you sure you want to send this campaign? This action cannot be undone.')) return

    setSending(true)
    try {
      const response = await fetch(`/api/dashboard/campaigns/${id}/send`, {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok) {
        fetchCampaign()
      } else {
        alert(data.error || 'Failed to send campaign')
      }
    } catch (error) {
      console.error('Failed to send campaign:', error)
      alert('Failed to send campaign')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this campaign? This cannot be undone.')) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/dashboard/campaigns/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/dashboard/marketing')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete campaign')
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  const badge = STATUS_BADGES[campaign.status] || STATUS_BADGES.draft
  const canSend = ['draft', 'scheduled'].includes(campaign.status)
  const canDelete = campaign.status !== 'sending'
  const segmentLabel = (campaign.segment_filters as { segment?: string })?.segment || 'all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/marketing">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {campaign.channel === 'whatsapp' ? (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  WhatsApp
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-blue-400" />
                  Email
                </span>
              )}
              <span>Created {format(new Date(campaign.created_at), 'MMM dd, yyyy h:mm a')}</span>
              {campaign.template_name && (
                <span>Template: {campaign.template_name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-400 hover:text-red-300 hover:border-red-800"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          {canSend && (
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Targeted</span>
          </div>
          <p className="text-2xl font-bold">{campaign.target_count}</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <Send className="h-4 w-4" />
            <span className="text-xs font-medium">Sent</span>
          </div>
          <p className="text-2xl font-bold">{campaign.sent_count}</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Delivered</span>
          </div>
          <p className="text-2xl font-bold">{campaign.delivered_count}</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <XCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Failed</span>
          </div>
          <p className="text-2xl font-bold">{campaign.failed_count}</p>
        </div>
      </div>

      {/* Additional Stats Row */}
      {(campaign.read_count > 0 || campaign.clicked_count > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-300 mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">Read</span>
            </div>
            <p className="text-2xl font-bold">{campaign.read_count}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Clicked</span>
            </div>
            <p className="text-2xl font-bold">{campaign.clicked_count}</p>
          </div>
        </div>
      )}

      {/* Campaign Info */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Campaign Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Segment:</span>{' '}
            <span className="font-medium capitalize">{segmentLabel.replace('_', ' ')}</span>
          </div>
          {campaign.started_at && (
            <div>
              <span className="text-muted-foreground">Started:</span>{' '}
              <span className="font-medium">{format(new Date(campaign.started_at), 'MMM dd, yyyy h:mm a')}</span>
            </div>
          )}
          {campaign.completed_at && (
            <div>
              <span className="text-muted-foreground">Completed:</span>{' '}
              <span className="font-medium">{format(new Date(campaign.completed_at), 'MMM dd, yyyy h:mm a')}</span>
            </div>
          )}
          {campaign.scheduled_at && campaign.status === 'scheduled' && (
            <div>
              <span className="text-muted-foreground">Scheduled for:</span>{' '}
              <span className="font-medium">{format(new Date(campaign.scheduled_at), 'MMM dd, yyyy h:mm a')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sending indicator */}
      {campaign.status === 'sending' && (
        <div className="flex items-center gap-3 p-4 bg-yellow-900/20 border border-yellow-800/30 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400" />
          <span className="text-sm text-yellow-400 font-medium">
            Campaign is currently sending... This page will auto-refresh.
          </span>
        </div>
      )}

      {/* Message Log */}
      {messages.length > 0 && (
        <div className="bg-card border rounded-lg">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">Message Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    Sent At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {messages.map((msg) => {
                  const msgBadge = MSG_STATUS_BADGES[msg.status] || MSG_STATUS_BADGES.pending

                  return (
                    <tr key={msg.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono">
                        {msg.recipient}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${msgBadge.className}`}>
                          {msgBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {msg.sent_at
                          ? format(new Date(msg.sent_at), 'MMM dd, h:mm a')
                          : msg.failed_at
                            ? format(new Date(msg.failed_at), 'MMM dd, h:mm a')
                            : '--'}
                      </td>
                      <td className="px-4 py-3 text-xs text-red-400 hidden lg:table-cell max-w-xs truncate">
                        {msg.error_message || '--'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty message log */}
      {campaign.status !== 'draft' && campaign.status !== 'scheduled' && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg">
          <Clock className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No messages sent yet</p>
        </div>
      )}
    </div>
  )
}
