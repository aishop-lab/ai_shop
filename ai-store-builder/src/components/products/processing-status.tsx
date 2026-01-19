'use client'

import { Check, Loader2, X, SkipForward } from 'lucide-react'

interface ProcessingStage {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'skipped' | 'failed'
  message?: string
  duration?: number
}

interface ProcessingStatusProps {
  stages: ProcessingStage[]
  showTimings?: boolean
}

export function ProcessingStatus({ stages, showTimings = false }: ProcessingStatusProps) {
  const getStatusIcon = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed':
        return (
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )
      case 'skipped':
        return (
          <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
            <SkipForward className="w-3 h-3 text-white" />
          </div>
        )
      case 'failed':
        return (
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </div>
        )
    }
  }

  const getStatusColor = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-400'
      case 'processing':
        return 'text-blue-600 font-medium'
      case 'completed':
        return 'text-green-600'
      case 'skipped':
        return 'text-gray-500'
      case 'failed':
        return 'text-red-600'
    }
  }

  // Calculate overall progress
  const completedOrSkipped = stages.filter(s => s.status === 'completed' || s.status === 'skipped').length
  const progress = Math.round((completedOrSkipped / stages.length) * 100)

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage list */}
      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 py-1.5 px-2 rounded transition-colors ${
              stage.status === 'processing' ? 'bg-blue-50 dark:bg-blue-950/30' : ''
            }`}
          >
            {getStatusIcon(stage.status)}
            <div className="flex-1 min-w-0">
              <span className={`text-sm ${getStatusColor(stage.status)}`}>
                {stage.name}
              </span>
              {stage.message && (
                <span className="text-xs text-gray-500 ml-2">
                  {stage.message}
                </span>
              )}
            </div>
            {showTimings && stage.duration && (
              <span className="text-xs text-gray-400">
                {stage.duration}ms
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Simplified inline version for compact display
export function ProcessingStatusInline({ stages }: ProcessingStatusProps) {
  const currentStage = stages.find(s => s.status === 'processing')
  const completedCount = stages.filter(s => s.status === 'completed').length
  const totalCount = stages.length

  if (!currentStage && completedCount === totalCount) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <Check className="w-4 h-4" />
        <span className="text-sm">Processing complete!</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      <span className="text-sm text-blue-600">
        {currentStage?.name || 'Processing...'}
      </span>
      <span className="text-xs text-gray-400">
        ({completedCount}/{totalCount})
      </span>
    </div>
  )
}
