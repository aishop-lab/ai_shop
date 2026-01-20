'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface OnboardingProgressBarProps {
  currentStep: number
  totalSteps?: number
  className?: string
}

// Step names for display
const STEP_NAMES: Record<number, string> = {
  1: 'Store Name',
  2: 'Description',
  3: 'Category',
  4: 'Location',
  5: 'Logo',
  6: 'Brand Style',
  7: 'Colors',
  8: 'Contact',
  9: 'Business Info',
  10: 'Theme',
  11: 'Create Store'
}

// Map step IDs to sequential step numbers (accounting for conditional step 31)
function getSequentialStep(stepId: number): number {
  if (stepId === 31) return 3 // Manual category maps to step 3
  if (stepId > 3) {
    // Steps 4+ stay the same
    return stepId
  }
  return stepId
}

export function OnboardingProgressBar({
  currentStep,
  totalSteps = 11,
  className
}: OnboardingProgressBarProps) {
  const sequentialStep = getSequentialStep(currentStep)
  const completedSteps = sequentialStep - 1
  const progress = Math.min(100, Math.round((completedSteps / (totalSteps - 1)) * 100))

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress text */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Step {Math.min(sequentialStep, totalSteps)} of {totalSteps}
          {STEP_NAMES[sequentialStep] && (
            <span className="text-muted-foreground ml-1">
              · {STEP_NAMES[sequentialStep]}
            </span>
          )}
        </span>
        <span className="text-muted-foreground">{progress}% Complete</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

interface OnboardingProgressStepsProps {
  currentStep: number
  className?: string
}

export function OnboardingProgressSteps({ currentStep, className }: OnboardingProgressStepsProps) {
  const sequentialStep = getSequentialStep(currentStep)
  const mainSteps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {mainSteps.map((step, index) => {
        const isCompleted = step < sequentialStep
        const isCurrent = step === sequentialStep
        const isLast = index === mainSteps.length - 1

        return (
          <div key={step} className="flex items-center">
            {/* Step circle */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                isCompleted && 'bg-primary text-primary-foreground',
                isCurrent && 'bg-primary/20 text-primary ring-2 ring-primary',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                step
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'h-0.5 w-4 sm:w-6 lg:w-8 transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface OnboardingProgressCompactProps {
  currentStep: number
  totalSteps?: number
  className?: string
}

export function OnboardingProgressCompact({
  currentStep,
  totalSteps = 11,
  className
}: OnboardingProgressCompactProps) {
  const sequentialStep = getSequentialStep(currentStep)
  const progress = Math.min(100, Math.round(((sequentialStep - 1) / (totalSteps - 1)) * 100))

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Progress ring */}
      <div className="relative w-12 h-12">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${progress * 1.256} 125.6`}
            className="text-primary transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {progress}%
        </span>
      </div>

      {/* Step info */}
      <div className="text-sm">
        <p className="font-medium">
          {STEP_NAMES[sequentialStep] || `Step ${sequentialStep}`}
        </p>
        <p className="text-muted-foreground">
          Step {Math.min(sequentialStep, totalSteps)} of {totalSteps}
        </p>
      </div>
    </div>
  )
}
