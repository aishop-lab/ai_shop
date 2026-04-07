'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/contexts/customer-context'
import { useStore } from '@/lib/contexts/store-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Star,
  TrendingUp,
  Gift,
  History,
  Loader2,
  Trophy,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

interface LoyaltyProgram {
  name: string
  description: string | null
  points_per_currency_unit: number
  min_redemption_points: number
  redemption_value_per_point: number
  tiers: TierConfig[]
}

interface TierConfig {
  name: string
  min_points: number
  multiplier: number
  benefits: string[]
}

interface LoyaltyPoints {
  balance: number
  lifetime_earned: number
  lifetime_redeemed: number
  tier: string
}

interface NextTier {
  name: string
  min_points: number
  points_needed: number
}

interface LoyaltyTransaction {
  id: string
  type: 'earn' | 'redeem' | 'bonus' | 'expire' | 'adjust'
  points: number
  description: string | null
  reference_type: string | null
  created_at: string
}

const typeColors: Record<string, string> = {
  earn: 'bg-green-100 text-green-800',
  bonus: 'bg-purple-100 text-purple-800',
  redeem: 'bg-blue-100 text-blue-800',
  expire: 'bg-red-100 text-red-800',
  adjust: 'bg-yellow-100 text-yellow-800',
}

const typeLabels: Record<string, string> = {
  earn: 'Earned',
  bonus: 'Bonus',
  redeem: 'Redeemed',
  expire: 'Expired',
  adjust: 'Adjustment',
}

export default function LoyaltyPage() {
  const params = useParams()
  const router = useRouter()
  const storeSlug = params.storeSlug as string
  const { customer, isLoading: customerLoading, isAuthenticated } = useCustomer()
  const { formatPrice } = useStore()

  const [program, setProgram] = useState<LoyaltyProgram | null>(null)
  const [points, setPoints] = useState<LoyaltyPoints | null>(null)
  const [nextTier, setNextTier] = useState<NextTier | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [noProgram, setNoProgram] = useState(false)

  useEffect(() => {
    if (!customerLoading && !isAuthenticated) {
      router.push(`/${storeSlug}/account/login?redirect=/${storeSlug}/account/loyalty`)
    }
  }, [customerLoading, isAuthenticated, router, storeSlug])

  useEffect(() => {
    async function fetchLoyalty() {
      if (!isAuthenticated) return

      setIsLoading(true)
      try {
        const response = await fetch('/api/customer/loyalty')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            if (!data.program) {
              setNoProgram(true)
            } else {
              setProgram(data.program)
              setPoints(data.points)
              setNextTier(data.next_tier)
              setTransactions(data.transactions || [])
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch loyalty data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLoyalty()
  }, [isAuthenticated])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (customerLoading || !isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (noProgram) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${storeSlug}/account`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Loyalty Rewards</h1>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No rewards program yet</h3>
            <p className="text-muted-foreground mb-4">
              This store does not have a loyalty program at the moment. Check back later!
            </p>
            <Link href={`/${storeSlug}`}>
              <Button>Continue Shopping</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate tier progress
  const currentTierConfig = program?.tiers?.find((t) => t.name === points?.tier)
  const tierProgress = nextTier
    ? Math.min(
        100,
        Math.round(
          ((points?.lifetime_earned ?? 0) / nextTier.min_points) * 100
        )
      )
    : 100 // Already at max tier

  // Redemption value of current balance
  const balanceValue = (points?.balance ?? 0) * (program?.redemption_value_per_point ?? 0)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${storeSlug}/account`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{program?.name || 'Loyalty Rewards'}</h1>
          {program?.description && (
            <p className="text-muted-foreground">{program.description}</p>
          )}
        </div>
      </div>

      {/* Points Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Coins className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(points?.balance ?? 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Available Points</p>
                {balanceValue > 0 && (
                  <p className="text-xs text-green-600">
                    Worth {formatPrice(balanceValue)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(points?.lifetime_earned ?? 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Lifetime Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Trophy className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold capitalize">{points?.tier ?? 'base'}</p>
                <p className="text-sm text-muted-foreground">Current Tier</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      {program?.tiers && program.tiers.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Tier Progress</CardTitle>
            <CardDescription>
              {nextTier
                ? `${nextTier.points_needed.toLocaleString()} more points to reach ${nextTier.name}`
                : 'You have reached the highest tier!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={tierProgress} className="h-3 mb-4" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{(points?.lifetime_earned ?? 0).toLocaleString()} pts earned</span>
              {nextTier && <span>{nextTier.min_points.toLocaleString()} pts needed</span>}
            </div>

            {/* Tier Benefits */}
            {currentTierConfig?.benefits && currentTierConfig.benefits.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Your Tier Benefits</p>
                <ul className="space-y-1">
                  {currentTierConfig.benefits.map((benefit, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <Gift className="h-3 w-3 text-primary flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* All tiers overview */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-3">All Tiers</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {program.tiers
                  .sort((a, b) => a.min_points - b.min_points)
                  .map((tier) => (
                    <div
                      key={tier.name}
                      className={`p-3 rounded-lg border text-center ${
                        tier.name === points?.tier
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <p className="font-medium text-sm capitalize">{tier.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tier.min_points.toLocaleString()} pts
                      </p>
                      <p className="text-xs text-primary">{tier.multiplier}x points</p>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How to Earn & Redeem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              How to Earn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-medium text-green-600 mt-0.5">+</span>
                <span>
                  Earn{' '}
                  <span className="font-semibold">
                    {program?.points_per_currency_unit ?? 1} point
                    {(program?.points_per_currency_unit ?? 1) !== 1 ? 's' : ''}
                  </span>{' '}
                  for every {formatPrice(1)} spent
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-green-600 mt-0.5">+</span>
                <span>Bonus points on special promotions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-green-600 mt-0.5">+</span>
                <span>Referral rewards for inviting friends</span>
              </li>
              {currentTierConfig && currentTierConfig.multiplier > 1 && (
                <li className="flex items-start gap-2">
                  <span className="font-medium text-purple-600 mt-0.5">*</span>
                  <span>
                    Your <span className="font-semibold capitalize">{currentTierConfig.name}</span>{' '}
                    tier gives you <span className="font-semibold">{currentTierConfig.multiplier}x</span>{' '}
                    points on all purchases
                  </span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-600" />
              How to Redeem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-medium text-blue-600 mt-0.5">1</span>
                <span>
                  Minimum{' '}
                  <span className="font-semibold">
                    {(program?.min_redemption_points ?? 100).toLocaleString()} points
                  </span>{' '}
                  required to redeem
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-blue-600 mt-0.5">2</span>
                <span>
                  Each point is worth{' '}
                  <span className="font-semibold">
                    {formatPrice(program?.redemption_value_per_point ?? 0.25)}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-blue-600 mt-0.5">3</span>
                <span>Apply your points as a discount at checkout</span>
              </li>
            </ul>
            {(points?.balance ?? 0) >= (program?.min_redemption_points ?? 100) && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg text-center">
                <p className="text-sm text-green-700 font-medium">
                  You can redeem up to {formatPrice(balanceValue)} in discounts!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your points transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-8 text-center">
              <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start shopping to earn your first points!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-full ${
                        tx.points > 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {tx.points > 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {tx.description || typeLabels[tx.type] || tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        tx.points > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.points > 0 ? '+' : ''}
                      {tx.points.toLocaleString()}
                    </span>
                    <Badge variant="outline" className={typeColors[tx.type] || ''}>
                      {typeLabels[tx.type] || tx.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
