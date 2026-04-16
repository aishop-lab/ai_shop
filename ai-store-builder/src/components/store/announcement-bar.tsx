'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import type { AnnouncementBar as AnnouncementBarConfig } from '@/lib/types/customization'

interface AnnouncementBarProps {
  config?: AnnouncementBarConfig
}

export function AnnouncementBar({ config }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false)

  if (!config?.enabled || !config.text || dismissed) {
    return null
  }

  return (
    <div
      className="relative flex items-center justify-center px-4 py-2 text-sm font-medium"
      style={{
        backgroundColor: config.bg_color || '#3B82F6',
        color: config.text_color || '#FFFFFF',
      }}
    >
      <span>{config.text}</span>
      {config.link_text && config.link_url && (
        <Link
          href={config.link_url}
          className="ml-2 underline font-semibold hover:opacity-80 transition-opacity"
        >
          {config.link_text}
        </Link>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
