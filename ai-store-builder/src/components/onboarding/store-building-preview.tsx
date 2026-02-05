'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Check, Loader2, Store, Palette, Settings, Globe, Sparkles } from 'lucide-react'
import type { StoreData, StoreBlueprint } from '@/lib/types/onboarding'

interface BuildStep {
  id: string
  label: string
  icon: React.ReactNode
  status: 'pending' | 'building' | 'complete'
}

interface StoreBuildingPreviewProps {
  storeData: Partial<StoreData>
  onBuildComplete: (slug: string) => void
  onError: (error: string) => void
}

export function StoreBuildingPreview({ storeData, onBuildComplete, onError }: StoreBuildingPreviewProps) {
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([
    { id: 'identity', label: 'Setting up store identity', icon: <Store className="h-4 w-4" />, status: 'pending' },
    { id: 'branding', label: 'Applying brand colors & typography', icon: <Palette className="h-4 w-4" />, status: 'pending' },
    { id: 'settings', label: 'Configuring store settings', icon: <Settings className="h-4 w-4" />, status: 'pending' },
    { id: 'region', label: 'Setting up regional preferences', icon: <Globe className="h-4 w-4" />, status: 'pending' },
    { id: 'finalize', label: 'Finalizing your store', icon: <Sparkles className="h-4 w-4" />, status: 'pending' },
  ])
  const [, setCurrentStepIndex] = useState(0)
  const [blueprint, setBlueprint] = useState<StoreBlueprint | null>(null)
  const [isBuilding, setIsBuilding] = useState(true)

  // Simulate build progress and actually build the store
  useEffect(() => {
    let isMounted = true
    
    const buildStore = async () => {
      // Step through each build phase with visual feedback
      for (let i = 0; i < buildSteps.length; i++) {
        if (!isMounted) return
        
        // Mark current step as building
        setBuildSteps(prev => prev.map((step, idx) => ({
          ...step,
          status: idx === i ? 'building' : idx < i ? 'complete' : 'pending'
        })))
        setCurrentStepIndex(i)
        
        // Wait for visual effect (except for last step which triggers API)
        if (i < buildSteps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800))
        }
      }
      
      // Actually call the API to generate blueprint
      try {
        console.log('Sending store data to generate-blueprint:', storeData)
        
        const response = await fetch('/api/onboarding/generate-blueprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(storeData)
        })
        
        const data = await response.json()
        console.log('Generate blueprint response:', data)
        
        if (!isMounted) return
        
        if (data.success) {
          // Mark all steps complete
          setBuildSteps(prev => prev.map(step => ({ ...step, status: 'complete' })))
          setBlueprint(data.blueprint)
          setIsBuilding(false)

          // Complete onboarding (activate store)
          const completeResponse = await fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ store_id: data.store_id })
          })
          
          const completeData = await completeResponse.json()
          console.log('Complete onboarding response:', completeData)

          // Wait a moment to show completion, then redirect to the store
          setTimeout(() => {
            if (isMounted) {
              onBuildComplete(data.slug)
            }
          }, 1500)
        } else {
          // Provide more helpful error messages
          let errorMsg = data.error || 'Failed to create store'
          if (data.details) {
            console.error('Store creation details:', data.details)
            // Show the actual validation errors
            if (Array.isArray(data.details)) {
              errorMsg = data.details.join(', ')
            } else if (typeof data.details === 'string') {
              if (data.details.includes('column')) {
                errorMsg = 'Database configuration needed. Please contact support.'
              } else {
                errorMsg = data.details
              }
            }
          }
          console.error('Blueprint generation error:', errorMsg)
          onError(errorMsg)
        }
      } catch (err) {
        console.error('Blueprint generation exception:', err)
        if (isMounted) {
          onError('Something went wrong while creating your store')
        }
      }
    }
    
    buildStore()
    
    return () => {
      isMounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getVibeGradient = (vibe: string) => {
    const gradients: Record<string, string> = {
      modern: 'from-slate-900 to-blue-900',
      classic: 'from-amber-900 to-stone-900',
      playful: 'from-pink-500 to-purple-600',
      minimal: 'from-zinc-800 to-zinc-900'
    }
    return gradients[vibe] || gradients.modern
  }

  return (
    <div className="w-full space-y-6">
      {/* Live Store Preview */}
      <Card className="overflow-hidden">
        <div className={`bg-gradient-to-br ${getVibeGradient(storeData.brand_vibe || 'modern')} p-8 text-white`}>
          <div className="flex items-center gap-4 mb-4">
            {storeData.logo_url ? (
              <Image 
                src={storeData.logo_url} 
                alt="Store logo" 
                width={64}
                height={64}
                className="h-16 w-16 rounded-lg object-cover bg-white/10"
              />
            ) : (
              <div 
                className="h-16 w-16 rounded-lg flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: storeData.primary_color || '#3B82F6' }}
              >
                {storeData.business_name?.charAt(0) || 'S'}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{storeData.business_name || 'Your Store'}</h2>
              <p className="text-white/70 text-sm">{storeData.slug}.storeforge.site</p>
            </div>
          </div>
          
          <p className="text-white/80 mb-4">{storeData.description}</p>
          
          <div className="flex flex-wrap gap-2">
            {storeData.business_category?.map((cat, i) => (
              <span 
                key={i}
                className="px-3 py-1 rounded-full text-xs bg-white/20"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
        
        {/* Store Preview Body */}
        <div className="p-6 bg-background">
          <div className="grid grid-cols-3 gap-4">
            {/* Placeholder product cards */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div 
                  className="aspect-square rounded-lg animate-pulse"
                  style={{ backgroundColor: `${storeData.primary_color}20` || '#3B82F620' }}
                />
                <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
                <div className="h-3 rounded bg-muted animate-pulse w-1/2" />
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Products will appear here after you add them
          </p>
        </div>
      </Card>

      {/* Build Progress Steps */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          {isBuilding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Building your store...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 text-green-500" />
              Store created successfully!
            </>
          )}
        </h3>
        
        <div className="space-y-3">
          {buildSteps.map((step) => (
            <div 
              key={step.id}
              className={`flex items-center gap-3 transition-all ${
                step.status === 'pending' ? 'opacity-50' : ''
              }`}
            >
              <div className={`
                h-8 w-8 rounded-full flex items-center justify-center transition-all
                ${step.status === 'complete' ? 'bg-green-500 text-white' : ''}
                ${step.status === 'building' ? 'bg-primary text-primary-foreground' : ''}
                ${step.status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {step.status === 'complete' ? (
                  <Check className="h-4 w-4" />
                ) : step.status === 'building' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  step.icon
                )}
              </div>
              <span className={step.status === 'complete' ? 'text-green-600' : ''}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Blueprint Summary (shown after completion) */}
      {!isBuilding && blueprint && (
        <Card className="p-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <h3 className="font-semibold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Your Store Blueprint
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Store Name</p>
              <p className="font-medium">{blueprint.identity.business_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">URL</p>
              <p className="font-medium">{blueprint.identity.slug}.storeforge.site</p>
            </div>
            <div>
              <p className="text-muted-foreground">Theme</p>
              <p className="font-medium capitalize">{blueprint.theme.vibe}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Currency</p>
              <p className="font-medium">{blueprint.location.currency}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Primary Color</p>
              <div className="flex items-center gap-2">
                <div 
                  className="h-4 w-4 rounded" 
                  style={{ backgroundColor: blueprint.branding.colors.primary }}
                />
                <span className="font-medium">{blueprint.branding.colors.primary}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Fonts</p>
              <p className="font-medium">{blueprint.branding.typography.heading_font}</p>
            </div>
          </div>
          
          <p className="text-center text-sm text-green-600 dark:text-green-400 mt-4">
            Redirecting to your dashboard...
          </p>
        </Card>
      )}
    </div>
  )
}
