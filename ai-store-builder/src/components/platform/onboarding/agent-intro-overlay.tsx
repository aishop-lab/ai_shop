'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'
import { DEFAULT_AUTONOMY_LEVEL } from '@/lib/agents/constants'
import { useAgentStates, useUpdateAgentState } from '@/lib/hooks/use-agents'
import { AGENT_INTRO_ORDER, AGENT_INTROS } from './agent-intro-data'
import { AgentIntroCard } from './agent-intro-card'
import { AgentTeamSummary } from './agent-team-summary'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AgentLocalState = {
  enabled: boolean
  autonomy: AutonomyLevel
}

type AllAgentStates = Record<AgentType, AgentLocalState>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildInitialStates(): AllAgentStates {
  return Object.fromEntries(
    AGENT_INTRO_ORDER.map((agentType) => [
      agentType,
      { enabled: false, autonomy: DEFAULT_AUTONOMY_LEVEL },
    ])
  ) as AllAgentStates
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface AgentIntroOverlayProps {
  storeId: string
  onComplete: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AgentIntroOverlay({ storeId, onComplete }: AgentIntroOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [agentStates, setAgentStates] = useState<AllAgentStates>(buildInitialStates)
  const [isDismissing, setIsDismissing] = useState(false)

  // Card-level animation: track which "slot" is animating in/out
  const [cardVisible, setCardVisible] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const { agents } = useAgentStates(storeId)
  const { updateAgent } = useUpdateAgentState()

  // Detect prefers-reduced-motion once
  const reducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  // ── Focus trap: focus overlay on mount and on card change ──────────────────
  useEffect(() => {
    overlayRef.current?.focus()
  }, [currentIndex])

  // ── Prevent Escape key from bubbling (capture phase) ──────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [])

  // ── Advance card ───────────────────────────────────────────────────────────
  const advance = () => {
    if (isTransitioning) return

    if (reducedMotion.current) {
      setCurrentIndex((prev) => prev + 1)
      return
    }

    // 300ms exit, then swap, then 400ms enter
    setIsTransitioning(true)
    setCardVisible(false)

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      setCardVisible(true)
      setIsTransitioning(false)
    }, 300)
  }

  // ── Go back to previous card ──────────────────────────────────────────────
  const goBack = () => {
    if (isTransitioning || currentIndex === 0) return

    if (reducedMotion.current) {
      setCurrentIndex((prev) => prev - 1)
      return
    }

    // Same fade-out/fade-in animation as advance
    setIsTransitioning(true)
    setCardVisible(false)

    setTimeout(() => {
      setCurrentIndex((prev) => prev - 1)
      setCardVisible(true)
      setIsTransitioning(false)
    }, 300)
  }

  // ── Toggle agent enabled ───────────────────────────────────────────────────
  const handleToggle = (agentType: AgentType, enabled: boolean) => {
    setAgentStates((prev) => ({
      ...prev,
      [agentType]: { ...prev[agentType], enabled },
    }))

    const agentRow = agents.find((a) => a.agent_type === agentType)
    if (agentRow) {
      updateAgent(agentRow.id, { is_enabled: enabled }).catch(() => {
        toast.error(`Failed to update ${agentType} agent`)
      })
    }
  }

  // ── Change autonomy level ──────────────────────────────────────────────────
  const handleAutonomyChange = (agentType: AgentType, level: AutonomyLevel) => {
    // Auto-enable the agent when the user picks any autonomy level
    setAgentStates((prev) => ({
      ...prev,
      [agentType]: { ...prev[agentType], autonomy: level, enabled: true },
    }))

    const agentRow = agents.find((a) => a.agent_type === agentType)
    if (agentRow) {
      updateAgent(agentRow.id, { autonomy_level: level, is_enabled: true }).catch(() => {
        toast.error(`Failed to update ${agentType} autonomy`)
      })
    }
  }

  // ── Complete (Enter Command Center) ────────────────────────────────────────
  const handleComplete = () => {
    if (reducedMotion.current) {
      onComplete()
      return
    }

    setIsDismissing(true)
    setTimeout(() => {
      onComplete()
    }, 500)
  }

  // ── Derive current state ───────────────────────────────────────────────────
  const isSummary = currentIndex >= AGENT_INTRO_ORDER.length
  const currentAgentType = isSummary ? null : AGENT_INTRO_ORDER[currentIndex]

  // ── Transition classes ─────────────────────────────────────────────────────
  const cardTransitionClass = reducedMotion.current
    ? ''
    : cardVisible
    ? 'animate-[scaleIn_0.4s_ease-out]'
    : 'opacity-0 scale-95 transition-all duration-300'

  const overlayTransitionClass = isDismissing
    ? 'opacity-0 transition-opacity duration-500'
    : 'opacity-100'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Keyframe definition */}
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        ref={overlayRef}
        tabIndex={-1}
        className={`fixed inset-0 z-[60] bg-[var(--platform-bg)] overflow-y-auto outline-none ${overlayTransitionClass}`}
        aria-live="polite"
      >
        <div className={cardTransitionClass}>
          {isSummary ? (
            <AgentTeamSummary
              agentStates={agentStates}
              onComplete={handleComplete}
            />
          ) : currentAgentType !== null ? (
            <AgentIntroCard
              agentType={currentAgentType}
              introData={AGENT_INTROS[currentAgentType]}
              isEnabled={agentStates[currentAgentType].enabled}
              autonomyLevel={agentStates[currentAgentType].autonomy}
              onToggle={(enabled) => handleToggle(currentAgentType, enabled)}
              onAutonomyChange={(level) => handleAutonomyChange(currentAgentType, level)}
              onNext={advance}
              onSkip={advance}
              onBack={goBack}
              canGoBack={currentIndex > 0}
              stepIndex={currentIndex}
              totalSteps={AGENT_INTRO_ORDER.length}
            />
          ) : null}
        </div>
      </div>
    </>
  )
}
