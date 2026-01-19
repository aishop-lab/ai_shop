'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

interface StoreInfo {
  slug: string
  name: string
  status?: string
  created_at?: string
}

interface StateResponse {
  success: boolean
  user_id?: string
  stores?: StoreInfo[]
  profile?: {
    onboarding_completed: boolean
    onboarding_current_step: number
  }
  error?: string
}

interface ResetResponse {
  success: boolean
  message?: string
  deletedStores?: StoreInfo[]
  error?: string
}

export default function ResetPage() {
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<StateResponse | null>(null)
  const [resetResult, setResetResult] = useState<ResetResponse | null>(null)

  const checkState = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/reset')
      const data = await res.json()
      setState(data)
      setResetResult(null)
    } catch (error) {
      setState({ success: false, error: String(error) })
    }
    setLoading(false)
  }

  const resetOnboarding = async () => {
    if (!confirm('Are you sure? This will DELETE all your stores and products!')) {
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/reset', { method: 'POST' })
      const data = await res.json()
      setResetResult(data)
      // Refresh state
      await checkState()
    } catch (error) {
      setResetResult({ success: false, error: String(error) })
    }
    setLoading(false)
  }

  return (
    <div className="container max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reset Onboarding
          </CardTitle>
          <CardDescription>
            Use this to fix "store slug already taken" errors by deleting existing stores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Check State Button */}
          <div className="flex gap-2">
            <Button onClick={checkState} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Check Current State
            </Button>
            
            <Button onClick={resetOnboarding} disabled={loading} variant="destructive">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Reset & Delete Stores
            </Button>
          </div>

          {/* Current State Display */}
          {state && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <h3 className="font-semibold mb-2">Current State</h3>
              
              {state.success ? (
                <div className="space-y-2 text-sm">
                  <p><strong>User ID:</strong> {state.user_id}</p>
                  <p><strong>Stores:</strong> {state.stores?.length || 0}</p>
                  
                  {state.stores && state.stores.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Existing Stores:</p>
                      <ul className="list-disc list-inside ml-2">
                        {state.stores.map((store, i) => (
                          <li key={i}>
                            <strong>{store.name}</strong> ({store.slug}) - {store.status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {state.profile && (
                    <div className="mt-2">
                      <p><strong>Onboarding completed:</strong> {state.profile.onboarding_completed ? 'Yes' : 'No'}</p>
                      <p><strong>Current step:</strong> {state.profile.onboarding_current_step}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {state.error}
                </div>
              )}
            </div>
          )}

          {/* Reset Result Display */}
          {resetResult && (
            <div className={`mt-4 p-4 rounded-lg ${resetResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <div className="flex items-center gap-2">
                {resetResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="font-semibold">
                  {resetResult.success ? 'Reset Successful!' : 'Reset Failed'}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {resetResult.message || resetResult.error}
              </p>
              
              {resetResult.deletedStores && resetResult.deletedStores.length > 0 && (
                <div className="mt-2 text-sm">
                  <p>Deleted stores:</p>
                  <ul className="list-disc list-inside ml-2">
                    {resetResult.deletedStores.map((store, i) => (
                      <li key={i}>{store.name} ({store.slug})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
            <p className="font-semibold">⚠️ Warning</p>
            <p className="mt-1">
              Clicking "Reset & Delete Stores" will permanently delete all your stores and products.
              After reset, go to <a href="/onboarding" className="underline">/onboarding</a> to create a new store.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
