'use client'

import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CheckoutStep {
  key: string
  label: string
  icon: LucideIcon
}

interface CheckoutStepIndicatorProps {
  steps: CheckoutStep[]
  currentStepIndex: number
  onStepClick: (stepKey: string) => void
}

export default function CheckoutStepIndicator({
  steps,
  currentStepIndex,
  onStepClick,
}: CheckoutStepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-md">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex

          return (
            <div key={step.key} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (isCompleted) {
                    onStepClick(step.key)
                  }
                }}
                disabled={!isCompleted}
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                  isCurrent
                    ? 'bg-[var(--color-primary)] text-white'
                    : isCompleted
                    ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
              </button>

              {index < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-12 h-0.5 mx-1 ${
                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
