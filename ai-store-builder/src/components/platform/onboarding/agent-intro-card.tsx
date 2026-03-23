'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Headphones,
  TrendingUp,
  BarChart3,
  Megaphone,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENT_COLORS, AGENT_DISPLAY_NAMES, AUTONOMY_LEVELS } from '@/lib/agents/constants'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'
import type { AgentIntro } from './agent-intro-data'

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------
const AGENT_ICONS: Record<AgentType, LucideIcon> = {
  support: Headphones,
  sales: TrendingUp,
  analytics: BarChart3,
  marketing: Megaphone,
  technical: Settings,
}

// ---------------------------------------------------------------------------
// Glow colours (used in inline style for radial-gradient — can't be Tailwind)
// ---------------------------------------------------------------------------
const AGENT_GLOW_RGB: Record<AgentType, string> = {
  support: '59, 130, 246',    // blue-500
  sales: '16, 185, 129',      // emerald-500
  analytics: '245, 158, 11',  // amber-500
  marketing: '168, 85, 247',  // purple-500
  technical: '6, 182, 212',   // cyan-500
}

// ---------------------------------------------------------------------------
// Toggle active-track colour per agent type — explicit classes for Tailwind
// purge safety (no runtime string manipulation).
// ---------------------------------------------------------------------------
const AGENT_TOGGLE_BG: Record<AgentType, string> = {
  support: 'bg-blue-500',
  sales: 'bg-emerald-500',
  analytics: 'bg-amber-500',
  marketing: 'bg-purple-500',
  technical: 'bg-cyan-500',
}

// ---------------------------------------------------------------------------
// Toggle switch (accessible, minimal)
// ---------------------------------------------------------------------------
function Toggle({
  checked,
  onChange,
  agentType,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  agentType: AgentType
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        checked ? AGENT_TOGGLE_BG[agentType] : 'bg-zinc-700'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface AgentIntroCardProps {
  agentType: AgentType
  introData: AgentIntro
  isEnabled: boolean
  autonomyLevel: AutonomyLevel
  onToggle: (enabled: boolean) => void
  onAutonomyChange: (level: AutonomyLevel) => void
  onNext: () => void
  onSkip: () => void
  stepIndex: number   // 0-based
  totalSteps: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AgentIntroCard({
  agentType,
  introData,
  isEnabled,
  autonomyLevel,
  onToggle,
  onAutonomyChange,
  onNext,
  onSkip,
  stepIndex,
  totalSteps,
}: AgentIntroCardProps) {
  const colors = AGENT_COLORS[agentType]
  const Icon = AGENT_ICONS[agentType]
  const glowRgb = AGENT_GLOW_RGB[agentType]
  const displayName = AGENT_DISPLAY_NAMES[agentType]
  const isLast = stepIndex === totalSteps - 1

  // Detect prefers-reduced-motion once on mount
  const reducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  const [introVisible, setIntroVisible] = useState(reducedMotion.current)
  const [setupVisible, setSetupVisible] = useState(reducedMotion.current)

  useEffect(() => {
    if (reducedMotion.current) return

    const introTimer = setTimeout(() => setIntroVisible(true), 500)
    const setupTimer = setTimeout(() => setSetupVisible(true), 1500)

    return () => {
      clearTimeout(introTimer)
      clearTimeout(setupTimer)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Meet ${introData.codename} — ${displayName}`}
      className="min-h-screen overflow-y-auto flex items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-[480px] flex flex-col gap-8">

        {/* ── Progress dots ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i < stepIndex
                    ? cn('w-2', colors.dot)
                    : i === stepIndex
                    ? cn('w-4', colors.dot)
                    : 'w-2 bg-zinc-800'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-zinc-500 font-mono tabular-nums">
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>

        {/* ── Agent icon with glow ── */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            {/* Radial glow layer */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full blur-2xl scale-150 opacity-40"
              style={{
                background: `radial-gradient(circle, rgba(${glowRgb}, 0.6) 0%, transparent 70%)`,
                width: 96,
                height: 96,
              }}
            />
            {/* Icon container */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-center w-12 h-12 rounded-2xl',
                colors.bg,
                'border',
                colors.border
              )}
            >
              <Icon className={cn('w-6 h-6', colors.text)} aria-hidden="true" />
            </div>
          </div>

          {/* ── Identity ── */}
          <div className="text-center flex flex-col gap-1">
            <h2 className="font-mono text-2xl font-bold tracking-widest text-white">
              {introData.codename}
            </h2>
            <p className="text-sm text-zinc-400">{displayName}</p>
            <p className={cn('text-sm italic mt-1', colors.text)}>
              &ldquo;{introData.tagline}&rdquo;
            </p>
          </div>
        </div>

        {/* ── Intro text (fades in) ── */}
        <p
          className={cn(
            'text-sm leading-relaxed text-zinc-300 text-center transition-opacity duration-1000',
            introVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          {introData.intro}
        </p>

        {/* ── Setup panel (slides up) ── */}
        <div
          className={cn(
            'rounded-xl border p-5 flex flex-col gap-5 transition-all duration-500',
            'border-[var(--platform-border)] bg-[var(--platform-surface)]',
            setupVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6 pointer-events-none'
          )}
        >
          {/* Enable toggle row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Enable {displayName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isEnabled ? 'Agent will run after setup' : 'Agent will stay paused'}
              </p>
            </div>
            <Toggle
              checked={isEnabled}
              onChange={onToggle}
              agentType={agentType}
            />
          </div>

          {/* Autonomy level selector — always visible, muted when disabled */}
          <div className={cn('flex flex-col gap-3 transition-opacity', !isEnabled && 'opacity-50')}>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Autonomy Level
              </p>
              <div className="flex gap-1.5">
                {([1, 2, 3, 4, 5] as AutonomyLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => onAutonomyChange(level)}
                    aria-pressed={autonomyLevel === level}
                    aria-label={`Level ${level}: ${AUTONOMY_LEVELS[level].label}`}
                    className={cn(
                      'flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border',
                      autonomyLevel === level
                        ? cn(colors.bg, colors.text, colors.border)
                        : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:text-zinc-300 hover:bg-zinc-700/50'
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed min-h-[2.5rem]">
                <span className={cn('font-semibold', colors.text)}>
                  {AUTONOMY_LEVELS[autonomyLevel].label}
                </span>
                {' — '}
                {AUTONOMY_LEVELS[autonomyLevel].description}
              </div>
            </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onNext}
            className="w-full py-3 px-6 rounded-xl bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 active:bg-zinc-200 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {isLast ? 'View Your Team' : 'Meet Next Agent →'}
          </button>
          <button
            onClick={onSkip}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors duration-150 focus:outline-none focus-visible:underline"
          >
            Skip this agent
          </button>
        </div>

      </div>
    </div>
  )
}
