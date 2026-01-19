'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: number
  label: string
  description?: string
}

const STEPS: Step[] = [
  { id: 1, label: 'Store Name', description: 'Name your business' },
  { id: 2, label: 'Description', description: 'Tell us about it' },
  { id: 3, label: 'Category', description: 'Business type' },
  { id: 4, label: 'Location', description: 'Where you sell' },
  { id: 5, label: 'Logo', description: 'Brand identity' },
  { id: 6, label: 'Brand Vibe', description: 'Your style' },
  { id: 7, label: 'Colors', description: 'Pick your palette' },
  { id: 8, label: 'Contact', description: 'How to reach you' },
  { id: 9, label: 'Tax Info', description: 'GSTIN (optional)' },
  { id: 10, label: 'Ready!', description: 'Launch your store' },
]

interface ProgressSidebarProps {
  currentStep: number
  className?: string
}

function getDisplayStep(step: number): number {
  // Map step 31 (manual category) to step 3
  if (step === 31) return 3
  // Steps 1-3 stay the same
  if (step <= 3) return step
  // Steps 4-10 are displayed as-is (they come after category confirmation)
  return step
}

export function ProgressSidebar({ currentStep, className }: ProgressSidebarProps) {
  const displayStep = getDisplayStep(currentStep)

  return (
    <div className={cn('w-64 bg-muted/30 p-6 rounded-lg', className)}>
      <h2 className="text-lg font-semibold mb-6">Setup Progress</h2>

      <div className="space-y-1">
        {STEPS.map((step, index) => {
          const isCompleted = displayStep > step.id
          const isCurrent = displayStep === step.id
          const isPending = displayStep < step.id

          return (
            <div key={step.id} className="relative">
              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'absolute left-4 top-8 w-0.5 h-6',
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                />
              )}

              <div className={cn(
                'flex items-start gap-3 p-2 rounded-md transition-colors',
                isCurrent && 'bg-primary/10'
              )}>
                {/* Step indicator */}
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'border-primary text-primary bg-background',
                  isPending && 'border-muted-foreground/30 text-muted-foreground/50 bg-background'
                )}>
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>

                {/* Step content */}
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-sm font-medium',
                    isPending && 'text-muted-foreground/50'
                  )}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className={cn(
                      'text-xs',
                      isPending ? 'text-muted-foreground/40' : 'text-muted-foreground'
                    )}>
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress percentage */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(((displayStep - 1) / 10) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((displayStep - 1) / 10) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
