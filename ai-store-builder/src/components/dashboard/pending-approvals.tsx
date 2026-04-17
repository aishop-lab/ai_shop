'use client'

import { useState } from 'react'
import { Check, X, Bot } from 'lucide-react'

interface Approval {
  id: string
  agent_type: string
  action_type: string
  summary: string
  reasoning: string | null
  details: Record<string, unknown>
  priority: string
  expires_at: string | null
  created_at: string
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-red-500/30 bg-red-500/5',
  high: 'border-orange-500/30 bg-orange-500/5',
  normal: 'border-zinc-700 bg-zinc-900',
  low: 'border-zinc-800 bg-zinc-900/50',
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function PendingApprovals({
  approvals,
  onResolve,
}: {
  approvals: Approval[]
  onResolve: (id: string, action: 'approve' | 'reject') => Promise<void>
}) {
  const [resolving, setResolving] = useState<string | null>(null)

  if (approvals.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No pending approvals. Agents are running smoothly.</p>
      </div>
    )
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setResolving(id)
    try {
      await onResolve(id, action)
    } finally {
      setResolving(null)
    }
  }

  return (
    <div className="space-y-3">
      {approvals.map(approval => (
        <div
          key={approval.id}
          className={`p-4 rounded-lg border ${PRIORITY_STYLES[approval.priority] || PRIORITY_STYLES.normal}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400 uppercase">{approval.agent_type}</span>
                {approval.priority === 'urgent' && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Urgent</span>
                )}
                {approval.priority === 'high' && (
                  <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">High</span>
                )}
                <span className="text-xs text-zinc-600">{timeAgo(approval.created_at)}</span>
              </div>
              <p className="text-sm text-zinc-200 mb-1">{approval.summary}</p>
              {approval.reasoning && (
                <p className="text-xs text-zinc-500 leading-relaxed">{approval.reasoning}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleAction(approval.id, 'approve')}
                disabled={resolving === approval.id}
                className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAction(approval.id, 'reject')}
                disabled={resolving === approval.id}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
