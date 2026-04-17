'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Megaphone, RefreshCw, MessageSquare, Mail, Send, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/contexts/auth-context'
import { format } from 'date-fns'

interface Campaign {
  id: string
  name: string
  channel: 'whatsapp' | 'email'
  status: string
  target_count: number
  sent_count: number
  delivered_count: number
  read_count: number
  failed_count: number
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

interface CampaignsResponse {
  campaigns: Campaign[]
  total: number
  page: number
  totalPages: number
  statusCounts: Record<string, number>
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-zinc-700 text-zinc-300' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-900/50 text-blue-400' },
  sending: { label: 'Sending', className: 'bg-yellow-900/50 text-yellow-400' },
  sent: { label: 'Sent', className: 'bg-emerald-900/50 text-emerald-400' },
  paused: { label: 'Paused', className: 'bg-orange-900/50 text-orange-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-900/50 text-red-400' },
}

export default function MarketingPage() {
  const { profile } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [storeId, setStoreId] = useState<string | null>(null)

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

  const fetchCampaigns = useCallback(async () => {
    if (!storeId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        store_id: storeId,
        page: String(page),
        limit: '20',
      })

      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/dashboard/campaigns?${params}`)
      const data: CampaignsResponse = await response.json()

      setCampaigns(data.campaigns || [])
      setTotalPages(data.totalPages || 1)
      setStatusCounts(data.statusCounts || {})
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setLoading(false)
    }
  }, [storeId, statusFilter, page])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const response = await fetch(`/api/dashboard/campaigns/${campaignId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchCampaigns()
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Marketing Campaigns</h1>
          <p className="text-muted-foreground">Create and manage WhatsApp & Email campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCampaigns} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/dashboard/marketing/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all">
            All {statusCounts.all ? `(${statusCounts.all})` : ''}
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts {statusCounts.draft ? `(${statusCounts.draft})` : ''}
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled {statusCounts.scheduled ? `(${statusCounts.scheduled})` : ''}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent {statusCounts.sent ? `(${statusCounts.sent})` : ''}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Campaign List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-lg">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {statusFilter !== 'all'
              ? `No ${statusFilter} campaigns found`
              : 'Create your first WhatsApp or Email campaign to reach your customers'}
          </p>
          <Link href="/dashboard/marketing/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const badge = STATUS_BADGES[campaign.status] || STATUS_BADGES.draft

            return (
              <Link
                key={campaign.id}
                href={`/dashboard/marketing/${campaign.id}`}
                className="block bg-card border rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Channel Icon */}
                    <div className={`mt-0.5 p-2 rounded-lg ${
                      campaign.channel === 'whatsapp'
                        ? 'bg-emerald-900/30 text-emerald-400'
                        : 'bg-blue-900/30 text-blue-400'
                    }`}>
                      {campaign.channel === 'whatsapp' ? (
                        <MessageSquare className="h-5 w-5" />
                      ) : (
                        <Mail className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="capitalize">{campaign.channel}</span>

                        {campaign.status === 'sent' && (
                          <>
                            <span className="flex items-center gap-1">
                              <Send className="h-3 w-3" />
                              {campaign.sent_count} sent
                            </span>
                            {campaign.delivered_count > 0 && (
                              <span>{campaign.delivered_count} delivered</span>
                            )}
                            {campaign.failed_count > 0 && (
                              <span className="text-red-400">{campaign.failed_count} failed</span>
                            )}
                          </>
                        )}

                        {campaign.scheduled_at && campaign.status === 'scheduled' && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Scheduled for {format(new Date(campaign.scheduled_at), 'MMM dd, yyyy h:mm a')}
                          </span>
                        )}

                        <span>
                          Created {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {campaign.status === 'draft' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDelete(campaign.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
