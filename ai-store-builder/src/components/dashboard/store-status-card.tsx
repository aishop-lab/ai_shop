'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Settings } from 'lucide-react'

interface StoreStatusCardProps {
  store: {
    id: string
    name: string
    slug: string
    status: string
    logo_url: string | null
  }
}

export function StoreStatusCard({ store }: StoreStatusCardProps) {
  const isLive = store.status === 'active'

  return (
    <Card className="border-muted">
      <CardContent className="flex items-center gap-4 py-4">
        {/* Store Logo */}
        {store.logo_url ? (
          <Image
            src={store.logo_url}
            alt={store.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">
            {store.name.charAt(0)}
          </div>
        )}

        {/* Store Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{store.name}</h3>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center gap-1.5 ${
                isLive ? 'text-green-600' : 'text-yellow-600'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              {isLive ? 'Live' : 'Draft'}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground truncate">/{store.slug}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href={`/${store.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5">
              View
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
