# Agent Introduction Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cinematic full-page overlay that introduces the 5 AI agents (SENTINEL, FORGE, PULSE, PRISM, CIPHER) one by one when a merchant first visits the platform after creating their store.

**Architecture:** Full-page overlay rendered conditionally inside the platform layout (`src/app/(platform)/layout.tsx`). No new routes or API endpoints. Agent state updates use the existing `useUpdateAgentState()` hook. Completion tracked via localStorage keyed by storeId. CSS-only animations (no framer-motion).

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React icons, existing Supabase hooks

**Spec:** `docs/superpowers/specs/2026-03-23-agent-intro-onboarding-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/platform/onboarding/agent-intro-data.ts` | Create | Agent codenames, taglines, intros, display order |
| `src/components/platform/onboarding/agent-intro-card.tsx` | Create | Single agent intro card with icon, text, toggle, autonomy |
| `src/components/platform/onboarding/agent-team-summary.tsx` | Create | Final "Your AI Team is Ready" summary card |
| `src/components/platform/onboarding/agent-intro-overlay.tsx` | Create | Main overlay: state machine, card sequencing, transitions |
| `src/app/(platform)/layout.tsx` | Modify | Add localStorage check + conditionally render overlay |

---

### Task 1: Agent Intro Data Constants

**Files:**
- Create: `src/components/platform/onboarding/agent-intro-data.ts`

- [ ] **Step 1: Create the intro data file**

```typescript
// src/components/platform/onboarding/agent-intro-data.ts
import type { AgentType } from '@/lib/agents/types'

export interface AgentIntro {
  codename: string
  tagline: string
  intro: string
}

export const AGENT_INTRO_ORDER: AgentType[] = [
  'support',
  'sales',
  'analytics',
  'marketing',
  'technical',
]

export const AGENT_INTROS: Record<AgentType, AgentIntro> = {
  support: {
    codename: 'SENTINEL',
    tagline: 'Your customers, always heard',
    intro: 'I handle inquiries across chat, email, and WhatsApp — resolving issues before they escalate. Your customers get instant, human-quality responses 24/7.',
  },
  sales: {
    codename: 'FORGE',
    tagline: 'Turn browsers into buyers',
    intro: 'I recover abandoned carts, create targeted discounts, and optimize your checkout flow. Every visitor is a potential sale — I make sure fewer slip away.',
  },
  analytics: {
    codename: 'PULSE',
    tagline: "Your store's vital signs",
    intro: "I monitor traffic, revenue, and trends in real-time. When something spikes or drops, you'll know before it matters. Weekly reports, anomaly alerts, growth insights — all automatic.",
  },
  marketing: {
    codename: 'PRISM',
    tagline: 'Amplify your brand',
    intro: "I craft campaigns, manage your social presence, and find the channels that bring customers to your door. Give me a budget and a goal — I'll figure out the rest.",
  },
  technical: {
    codename: 'CIPHER',
    tagline: 'Silent guardian of your store',
    intro: "I optimize your SEO, fix performance issues, manage structured data, and keep your site healthy. You'll never think about technical debt — because I already handled it.",
  },
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/onboarding/agent-intro-data.ts
git commit -m "feat: add agent codenames and intro data constants"
```

---

### Task 2: Agent Intro Card Component

**Files:**
- Create: `src/components/platform/onboarding/agent-intro-card.tsx`
- Reference: `src/lib/agents/constants.ts` (AGENT_COLORS, AGENT_DISPLAY_NAMES, AUTONOMY_LEVELS)
- Reference: `src/components/platform/onboarding/agent-intro-data.ts`

- [ ] **Step 1: Create the agent intro card component**

The card displays: progress dots, agent icon with glow, codename, role, tagline, intro text, enable toggle, autonomy selector, and next/skip buttons.

```tsx
// src/components/platform/onboarding/agent-intro-card.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  Headphones,
  TrendingUp,
  BarChart3,
  Megaphone,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENT_COLORS, AGENT_DISPLAY_NAMES, AUTONOMY_LEVELS } from '@/lib/agents/constants'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'
import type { AgentIntro } from './agent-intro-data'

const AGENT_ICON_COMPONENTS: Record<AgentType, React.ComponentType<{ className?: string }>> = {
  support: Headphones,
  sales: TrendingUp,
  analytics: BarChart3,
  marketing: Megaphone,
  technical: Settings,
}

// Glow color values (raw hex for radial gradient — can't use Tailwind classes in CSS)
const AGENT_GLOW_COLORS: Record<AgentType, string> = {
  support: '59, 130, 246',    // blue-500
  sales: '16, 185, 129',      // emerald-500
  analytics: '245, 158, 11',  // amber-500
  marketing: '168, 85, 247',  // purple-500
  technical: '6, 182, 212',   // cyan-500
}

interface AgentIntroCardProps {
  agentType: AgentType
  introData: AgentIntro
  isEnabled: boolean
  autonomyLevel: AutonomyLevel
  onToggle: () => void
  onAutonomyChange: (level: AutonomyLevel) => void
  onNext: () => void
  onSkip: () => void
  stepIndex: number
  totalSteps: number
}

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
  const [showText, setShowText] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  const Icon = AGENT_ICON_COMPONENTS[agentType]
  const colors = AGENT_COLORS[agentType]
  const glowRgb = AGENT_GLOW_COLORS[agentType]
  const currentLevel = AUTONOMY_LEVELS[autonomyLevel]
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Stagger animations: text at 500ms, setup at 1500ms (or instant if reduced motion)
  useEffect(() => {
    if (reducedMotion) {
      setShowText(true)
      setShowSetup(true)
      return
    }
    const textTimer = setTimeout(() => setShowText(true), 500)
    const setupTimer = setTimeout(() => setShowSetup(true), 1500)
    return () => {
      clearTimeout(textTimer)
      clearTimeout(setupTimer)
    }
  }, [reducedMotion])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Meet ${introData.codename}, your ${AGENT_DISPLAY_NAMES[agentType]}`}
      className="flex min-h-screen flex-col items-center justify-center px-6 py-8 overflow-y-auto"
    >
      <div className="w-full max-w-[480px] space-y-6">
        {/* Progress dots + counter */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  i === stepIndex ? colors.dot : i < stepIndex ? 'bg-zinc-500' : 'bg-zinc-800'
                )}
              />
            ))}
          </div>
          <span className="font-mono text-xs text-zinc-500">
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>

        {/* Icon with glow */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl animate-[scaleIn_0.5s_ease-out]"
            style={{
              background: `radial-gradient(circle, rgba(${glowRgb}, 0.2) 0%, transparent 70%)`,
            }}
          >
            <div className={cn('flex h-14 w-14 items-center justify-center rounded-xl', colors.bg)}>
              <Icon className={cn('h-7 w-7', colors.text)} />
            </div>
          </div>

          {/* Codename + role */}
          <div className="text-center">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-zinc-100">
              {introData.codename}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {AGENT_DISPLAY_NAMES[agentType]}
            </p>
          </div>

          {/* Tagline */}
          <p className={cn('text-sm italic', colors.text)}>
            &ldquo;{introData.tagline}&rdquo;
          </p>
        </div>

        {/* Intro text — fades in */}
        <p
          className={cn(
            'text-center text-base leading-relaxed text-zinc-300 transition-opacity',
            reducedMotion ? '' : 'duration-1000',
            showText ? 'opacity-100' : 'opacity-0'
          )}
        >
          {introData.intro}
        </p>

        {/* Setup panel — slides up */}
        <div
          className={cn(
            'space-y-4 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 transition-all',
            reducedMotion ? '' : 'duration-500',
            showSetup ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">
              Activate {introData.codename}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              aria-label={`Enable ${introData.codename}`}
              onClick={onToggle}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400',
                isEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Autonomy selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Autonomy Level
            </p>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as AutonomyLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onAutonomyChange(level)}
                  aria-label={`Level ${level}: ${AUTONOMY_LEVELS[level].label}`}
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-sm font-medium transition-colors',
                    autonomyLevel === level
                      ? cn('border-transparent', colors.bg, colors.text)
                      : 'border-[var(--platform-border)] text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400">
              <span className="font-medium text-zinc-300">{currentLevel.label}</span>
              {' — '}
              {currentLevel.description}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            {stepIndex === totalSteps - 1 ? 'View Your Team' : 'Meet Next Agent'}
            <span aria-hidden="true">&rarr;</span>
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded px-2 py-1"
          >
            Skip this agent
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/onboarding/agent-intro-card.tsx
git commit -m "feat: add agent intro card component with animations"
```

---

### Task 3: Agent Team Summary Component

**Files:**
- Create: `src/components/platform/onboarding/agent-team-summary.tsx`
- Reference: `src/components/platform/onboarding/agent-intro-data.ts`
- Reference: `src/lib/agents/constants.ts`

- [ ] **Step 1: Create the team summary component**

```tsx
// src/components/platform/onboarding/agent-team-summary.tsx
'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENT_COLORS, AGENT_DISPLAY_NAMES, AUTONOMY_LEVELS } from '@/lib/agents/constants'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'
import { AGENT_INTRO_ORDER, AGENT_INTROS } from './agent-intro-data'

interface AgentTeamSummaryProps {
  agentStates: Record<AgentType, { enabled: boolean; autonomy: AutonomyLevel }>
  onComplete: () => void
}

export function AgentTeamSummary({ agentStates, onComplete }: AgentTeamSummaryProps) {
  const enabledCount = Object.values(agentStates).filter((s) => s.enabled).length

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your AI team summary"
      className="flex min-h-screen flex-col items-center justify-center px-6 py-8"
    >
      <div className="w-full max-w-[480px] space-y-8 animate-[scaleIn_0.4s_ease-out]">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-zinc-100">
            Your AI Team is Ready
          </h1>
          <p className="text-sm text-zinc-400">
            {enabledCount} of 5 agents activated
          </p>
        </div>

        {/* Agent roster */}
        <div className="space-y-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4">
          {AGENT_INTRO_ORDER.map((agentType) => {
            const state = agentStates[agentType]
            const intro = AGENT_INTROS[agentType]
            const colors = AGENT_COLORS[agentType]

            return (
              <div
                key={agentType}
                className="flex items-center justify-between rounded-lg px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      state.enabled ? colors.dot : 'bg-zinc-700'
                    )}
                  />
                  <div>
                    <span
                      className={cn(
                        'font-mono text-sm font-medium',
                        state.enabled ? 'text-zinc-100' : 'text-zinc-500'
                      )}
                    >
                      {intro.codename}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {AGENT_DISPLAY_NAMES[agentType]}
                    </span>
                  </div>
                </div>

                {state.enabled ? (
                  <span className={cn('font-mono text-xs', colors.text)}>
                    L{state.autonomy} {AUTONOMY_LEVELS[state.autonomy].label}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">Not active</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-zinc-500">
            You can change any of this anytime in Settings &rarr; Agent Configuration
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            Enter Command Center
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/onboarding/agent-team-summary.tsx
git commit -m "feat: add agent team summary component"
```

---

### Task 4: Agent Intro Overlay (State Machine + Transitions)

**Files:**
- Create: `src/components/platform/onboarding/agent-intro-overlay.tsx`
- Reference: All files from tasks 1-3
- Reference: `src/lib/hooks/use-agents.ts` (useUpdateAgentState)

- [ ] **Step 1: Create the overlay component**

This is the main orchestrator. It manages:
- Current card index (0-4 = agent cards, 5 = summary)
- Per-agent enabled/autonomy state
- Card transition animations (fade + scale)
- Persisting changes to DB via `useUpdateAgentState()`
- Calling `onComplete` when user finishes

```tsx
// src/components/platform/onboarding/agent-intro-overlay.tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useUpdateAgentState } from '@/lib/hooks/use-agents'
import { DEFAULT_AUTONOMY_LEVEL } from '@/lib/agents/constants'
import type { AgentType, AutonomyLevel } from '@/lib/agents/types'
import { AGENT_INTRO_ORDER, AGENT_INTROS } from './agent-intro-data'
import { AgentIntroCard } from './agent-intro-card'
import { AgentTeamSummary } from './agent-team-summary'

interface AgentIntroOverlayProps {
  storeId: string
  onComplete: () => void
}

type AgentSetup = Record<AgentType, { enabled: boolean; autonomy: AutonomyLevel }>

const TOTAL_AGENTS = AGENT_INTRO_ORDER.length

export function AgentIntroOverlay({ storeId, onComplete }: AgentIntroOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const { updateAgent } = useUpdateAgentState()
  const focusRef = useRef<HTMLDivElement>(null)

  const [agentStates, setAgentStates] = useState<AgentSetup>(() => {
    const initial: Partial<AgentSetup> = {}
    for (const type of AGENT_INTRO_ORDER) {
      initial[type] = { enabled: false, autonomy: DEFAULT_AUTONOMY_LEVEL }
    }
    return initial as AgentSetup
  })

  // Focus trap — focus the overlay on mount and on card change
  useEffect(() => {
    focusRef.current?.focus()
  }, [currentIndex])

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const advanceCard = useCallback(() => {
    if (isTransitioning) return

    if (reducedMotion) {
      setCurrentIndex((prev) => prev + 1)
      return
    }

    setIsTransitioning(true)
    // Wait for exit animation, then switch card
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      setIsTransitioning(false)
    }, 300)
  }, [isTransitioning, reducedMotion])

  const handleToggle = useCallback((agentType: AgentType) => {
    setAgentStates((prev) => {
      const newEnabled = !prev[agentType].enabled
      // Fire and forget — persist to DB
      updateAgent(storeId, agentType, { is_enabled: newEnabled })
      return {
        ...prev,
        [agentType]: { ...prev[agentType], enabled: newEnabled },
      }
    })
  }, [storeId, updateAgent])

  const handleAutonomyChange = useCallback((agentType: AgentType, level: AutonomyLevel) => {
    setAgentStates((prev) => {
      updateAgent(storeId, agentType, { autonomy_level: level })
      return {
        ...prev,
        [agentType]: { ...prev[agentType], autonomy: level },
      }
    })
  }, [storeId, updateAgent])

  const handleComplete = useCallback(() => {
    if (reducedMotion) {
      onComplete()
      return
    }
    setIsDismissing(true)
    setTimeout(onComplete, 500)
  }, [onComplete, reducedMotion])

  const showSummary = currentIndex >= TOTAL_AGENTS

  return (
    <div
      ref={focusRef}
      tabIndex={-1}
      className={`fixed inset-0 z-[60] bg-[var(--platform-bg)] transition-opacity ${
        reducedMotion ? '' : 'duration-500'
      } ${isDismissing ? 'opacity-0' : 'opacity-100'}`}
      style={{ outline: 'none' }}
    >
      {/* CSS keyframes */}
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className={`h-full transition-all ${reducedMotion ? '' : 'duration-300'} ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {showSummary ? (
          <AgentTeamSummary
            agentStates={agentStates}
            onComplete={handleComplete}
          />
        ) : (
          <AgentIntroCard
            key={AGENT_INTRO_ORDER[currentIndex]}
            agentType={AGENT_INTRO_ORDER[currentIndex]}
            introData={AGENT_INTROS[AGENT_INTRO_ORDER[currentIndex]]}
            isEnabled={agentStates[AGENT_INTRO_ORDER[currentIndex]].enabled}
            autonomyLevel={agentStates[AGENT_INTRO_ORDER[currentIndex]].autonomy}
            onToggle={() => handleToggle(AGENT_INTRO_ORDER[currentIndex])}
            onAutonomyChange={(level) => handleAutonomyChange(AGENT_INTRO_ORDER[currentIndex], level)}
            onNext={advanceCard}
            onSkip={advanceCard}
            stepIndex={currentIndex}
            totalSteps={TOTAL_AGENTS}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/onboarding/agent-intro-overlay.tsx
git commit -m "feat: add agent intro overlay with state machine and transitions"
```

---

### Task 5: Integrate Overlay into Platform Layout

**Files:**
- Modify: `src/app/(platform)/layout.tsx` (lines 1-102)

- [ ] **Step 1: Add the overlay import and localStorage state**

At the top of the file, add the import:

```tsx
import { AgentIntroOverlay } from '@/components/platform/onboarding/agent-intro-overlay'
```

After the existing state declarations (after line 19: `const [storeId, setStoreId] = useState<string | null>(null)`), add:

```tsx
const [showAgentIntro, setShowAgentIntro] = useState(false)
```

- [ ] **Step 2: Add localStorage check after storeId is set**

Inside the `fetchStoreId` function, after `setStoreId(data.storeId)` (line 29), add:

```tsx
// Check if user has completed the agent intro
const introKey = `agent-intro-${data.storeId}`
if (!localStorage.getItem(introKey)) {
  setShowAgentIntro(true)
}
```

- [ ] **Step 3: Add the overlay completion handler and render**

Add a handler function before the `if (authLoading)` check:

```tsx
const handleIntroComplete = useCallback(() => {
  if (storeId) {
    localStorage.setItem(`agent-intro-${storeId}`, 'completed')
  }
  setShowAgentIntro(false)
}, [storeId])
```

Add the `useCallback` import to the existing import line (line 4):

```tsx
import { useState, useEffect, useCallback } from 'react'
```

Then, inside the JSX return, right before the closing `</div>` of the root element (before line 100), add:

```tsx
{showAgentIntro && storeId && (
  <AgentIntroOverlay storeId={storeId} onComplete={handleIntroComplete} />
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Manual verification**

Run: `npm run dev`

1. Open the platform (`/platform`) — the agent intro overlay should appear
2. Meet each agent, toggle some on, set autonomy levels
3. Click "Enter Command Center" — overlay should fade away, command center visible
4. Refresh the page — overlay should NOT reappear (localStorage flag set)
5. Clear localStorage → refresh — overlay should reappear

- [ ] **Step 6: Commit**

```bash
git add src/app/(platform)/layout.tsx
git commit -m "feat: integrate agent intro overlay into platform layout"
```

---

### Task 6: Final Polish & Edge Cases

**Files:**
- Modify: `src/components/platform/onboarding/agent-intro-overlay.tsx`
- Modify: `src/components/platform/onboarding/agent-intro-card.tsx`

- [ ] **Step 1: Add keyboard Escape prevention**

In `agent-intro-overlay.tsx`, add an effect to prevent Escape from bubbling to the platform layout's Escape handler:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      // Do nothing — forward-only flow
    }
  }
  window.addEventListener('keydown', handleKeyDown, true) // capture phase
  return () => window.removeEventListener('keydown', handleKeyDown, true)
}, [])
```

- [ ] **Step 2: Add error handling for agent state updates**

In `agent-intro-overlay.tsx`, update the `handleToggle` function to handle errors gracefully. The `updateAgent` hook already handles errors internally. Add a toast import and error toast:

At the top of the file:
```tsx
import { toast } from 'sonner'
```

Update `handleToggle`:
```tsx
const handleToggle = useCallback((agentType: AgentType) => {
  setAgentStates((prev) => {
    const newEnabled = !prev[agentType].enabled
    updateAgent(storeId, agentType, { is_enabled: newEnabled }).catch(() => {
      toast.error('Failed to update agent. You can change this later in Settings.')
    })
    return {
      ...prev,
      [agentType]: { ...prev[agentType], enabled: newEnabled },
    }
  })
}, [storeId, updateAgent])
```

Do the same for `handleAutonomyChange`.

- [ ] **Step 3: Verify TypeScript compiles and test manually**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit all polish**

```bash
git add src/components/platform/onboarding/agent-intro-overlay.tsx src/components/platform/onboarding/agent-intro-card.tsx
git commit -m "feat: add keyboard handling and error handling to agent intro"
```
