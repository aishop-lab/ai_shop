# Agent Introduction Onboarding — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Author:** Claude + Manan

---

## Overview

When a merchant first enters the platform (`/platform`) after creating their store, a full-page cinematic overlay introduces the 5 AI agents one by one. Each agent has a codename, personality, and intro message. The merchant can enable each agent and set its autonomy level during the intro. After all agents are introduced, a summary card shows the team roster before revealing the command center underneath.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Trigger | First visit to `/platform` after store creation | Keeps store launch celebration separate; agent intro is its own focused experience |
| Format | One-at-a-time fullscreen cards (carousel) | Gives each agent their moment; feels premium |
| Personality | Codenames/titles (futuristic) | Fits the dark command-center aesthetic; avoids fake human names |
| Setup | Enable toggle + autonomy selector on each card | User configures agents as they meet them; no separate setup step |
| Transitions | User-controlled pacing, cinematic fade-in, forward-only, summary at end | Respects different reading speeds; polished feel |
| Architecture | Full-page overlay inside platform layout (not a separate route) | No redirect; "curtain lift" reveals command center underneath |
| State storage | localStorage keyed by storeId | UI-only concern; avoids DB migration; harmless if reset |

---

## Agent Codenames & Personalities

Agents are introduced in this order (most tangible first, most background last):

### 1. SENTINEL — Support Agent
- **Tagline:** "Your customers, always heard"
- **Color:** Blue (`blue-500`)
- **Icon:** Headphones
- **Intro:** "I handle inquiries across chat, email, and WhatsApp — resolving issues before they escalate. Your customers get instant, human-quality responses 24/7."

### 2. FORGE — Sales Agent
- **Tagline:** "Turn browsers into buyers"
- **Color:** Emerald (`emerald-500`)
- **Icon:** TrendingUp
- **Intro:** "I recover abandoned carts, create targeted discounts, and optimize your checkout flow. Every visitor is a potential sale — I make sure fewer slip away."

### 3. PULSE — Analytics Agent
- **Tagline:** "Your store's vital signs"
- **Color:** Amber (`amber-500`)
- **Icon:** BarChart3
- **Intro:** "I monitor traffic, revenue, and trends in real-time. When something spikes or drops, you'll know before it matters. Weekly reports, anomaly alerts, growth insights — all automatic."

### 4. PRISM — Marketing Agent
- **Tagline:** "Amplify your brand"
- **Color:** Purple (`purple-500`)
- **Icon:** Megaphone
- **Intro:** "I craft campaigns, manage your social presence, and find the channels that bring customers to your door. Give me a budget and a goal — I'll figure out the rest."

### 5. CIPHER — Technical Agent
- **Tagline:** "Silent guardian of your store"
- **Color:** Cyan (`cyan-500`)
- **Icon:** Settings
- **Intro:** "I optimize your SEO, fix performance issues, manage structured data, and keep your site healthy. You'll never think about technical debt — because I already handled it."

---

## Card Layout

Each agent intro card is a full-viewport overlay, centered content, max-width 480px:

```
┌─────────────────────────────────────────────────┐
│  ○ ○ ○ ○ ●                        1 / 5         │  Progress dots + counter
│                                                   │
│              ┌──────────────┐                     │
│              │   Agent Icon  │                     │  48px icon in agent color
│              │   (pulsing)   │                     │  with radial glow behind
│              └──────────────┘                     │
│                                                   │
│              SENTINEL                             │  font-mono, text-2xl, bold
│          Support Agent                            │  text-sm, text-zinc-400
│                                                   │
│   "Your customers, always heard"                  │  italic, agent color
│                                                   │
│   I handle inquiries across chat, email,          │  text-base, text-zinc-300
│   and WhatsApp — resolving issues before          │  Fades in smoothly (~1.5s)
│   they escalate...                                │
│                                                   │
│   ┌─────────────────────────────────────┐         │
│   │  Activate SENTINEL           [toggle]│         │  Enable toggle
│   │                                     │         │
│   │  Autonomy Level                     │         │
│   │  [ 1 ] [ 2 ] [●3 ] [ 4 ] [ 5 ]    │         │  Styled in agent color
│   │  Smart Auto — auto-executes low-    │         │
│   │  risk, approval for spend/refunds   │         │
│   └─────────────────────────────────────┘         │
│                                                   │
│              [ Meet Next Agent → ]                │  Primary button (white)
│              Skip this agent                      │  Muted text link
│                                                   │
└─────────────────────────────────────────────────┘
```

### Visual Details

- **Z-index:** `z-[60]` — above all other overlays (command palette is z-50, mobile nav is z-50)
- **Background:** `--platform-bg` (#0a0a0a) with a subtle radial gradient in the agent's color behind the icon (20% opacity, 200px radius)
- **Colors:** All agent colors reference `AGENT_COLORS[agentType]` from `constants.ts` — use `.text` for text, `.bg` for backgrounds, `.dot` for indicators
- **Icon entrance:** Scale animation from 0.8 → 1.0, gentle pulse
- **Text entrance:** Intro text fades in over ~1.5s (CSS opacity transition, not character-by-character)
- **Setup panel:** Slides up from below after text finishes animating (~0.3s delay)
- **Card transition:** Current card fades out (opacity 1→0) + scales down (scale 1→0.95), next card fades in (opacity 0→1) + scales up (scale 0.95→1). Duration: ~400ms

### Toggle & Autonomy Behavior

- Toggle defaults to OFF for all agents
- Autonomy selector is visible but visually muted when agent is disabled (still clickable — pre-configuring before enabling is allowed)
- Default autonomy: Level 3 (Smart Auto)
- Autonomy buttons styled using `AGENT_COLORS[agentType]` from `constants.ts` (uses `-400` text and `-500/10` bg variants)
- Each change uses the `useUpdateAgentState()` hook (updates via Supabase client directly, same as the rest of the platform)
- No new API endpoints — reuses existing agent state update infrastructure

### Button Behavior

- **"Meet Next Agent →"** — Advances to the next card. Current toggle/autonomy state is persisted (already saved on each change).
- **"Skip this agent"** — Same as "Meet Next Agent" but exists as a lighter visual option for users who don't want to configure. Functionally identical — included for UX clarity so users know they're not obligated to enable every agent.
- No confirmation needed — they can always change everything in Settings

### Accessibility

- Overlay has `role="dialog"` and `aria-modal="true"` with `aria-label="Meet your AI agents"`
- Focus is trapped within the overlay while visible (first focusable element receives focus on mount)
- `Tab` / `Shift+Tab` cycles through interactive elements within the current card
- `Escape` key does nothing (prevents accidental dismissal — forward-only flow)
- All animations respect `prefers-reduced-motion`: when enabled, transitions are instant (no scale/fade, just swap)
- Autonomy buttons have `aria-label` with level name (e.g., "Level 3: Smart Auto")

### Responsive Behavior

- Card content max-width 480px, centered horizontally and vertically
- On viewports shorter than the card content (< 640px height), the card becomes scrollable with `overflow-y: auto`
- On mobile (< 640px width), padding reduces and icon size drops to 40px
- Setup panel always remains in view — if content overflows, the "Meet Next Agent" button stays sticky at bottom

---

## Summary Card (6th card)

After all 5 agent cards, a final summary:

```
┌─────────────────────────────────────────────────┐
│                                                   │
│              ✓ Your AI Team is Ready              │  font-mono, text-2xl
│                                                   │
│   ┌─────────────────────────────────────┐         │
│   │  ● SENTINEL   Support    Enabled  L3│         │  Colored dot for enabled
│   │  ● FORGE      Sales      Enabled  L3│         │  Gray dot for skipped
│   │  ● PULSE      Analytics  Skipped    │         │
│   │  ● PRISM      Marketing  Enabled  L4│         │
│   │  ● CIPHER     Technical  Enabled  L3│         │
│   └─────────────────────────────────────┘         │
│                                                   │
│   You can change any of this anytime in           │
│   Settings → Agent Configuration                  │
│                                                   │
│         [ Enter Command Center → ]                │  Primary button
│                                                   │
└─────────────────────────────────────────────────┘
```

- Enabled agents show in their color with autonomy level number + label (e.g., "L3 Smart Auto")
- Skipped/disabled agents show in muted gray with "Not active" label
- "Enter Command Center" button fades out the overlay, revealing `/platform` underneath

---

## State Management

### Intro Completion Flag

- **Storage:** `localStorage` key: `agent-intro-{storeId}`
- **Value:** `"completed"` (set when user clicks "Enter Command Center")
- **Check location:** `src/app/(platform)/layout.tsx` — on mount, if storeId exists and flag is not set, render the overlay

### Agent State Updates

- Uses existing `useUpdateAgentState()` hook from `src/lib/hooks/use-agents.ts`
- The hook updates agent state via Supabase client directly (not an HTTP endpoint)
- Each toggle/autonomy change calls `updateAgent(storeId, agentType, { is_enabled, autonomy_level })`
- No new API endpoints needed

### Relationship to Existing Setup Checklist

- The `agent-setup-checklist.tsx` sidebar panel coexists with the intro overlay
- After the intro completes, the checklist reflects the agents already configured during the intro (they share the same DB state)
- The checklist remains available for users who want to revisit agent setup without going to Settings

### Platform Layout Integration

```
Platform Layout mount:
  1. Fetch storeId (existing logic)
  2. Check localStorage for `agent-intro-{storeId}`
  3. If not found → render <AgentIntroOverlay />
  4. If found → render command center normally

AgentIntroOverlay completion:
  1. Set localStorage `agent-intro-{storeId}` = "completed"
  2. Fade out overlay (400ms)
  3. Command center is already mounted underneath — becomes visible
```

---

## File Structure

```
src/components/platform/onboarding/
├── agent-intro-overlay.tsx      Main overlay: state machine, card sequencing, transitions
├── agent-intro-card.tsx         Individual agent card: icon, text, toggle, autonomy
├── agent-team-summary.tsx       Final "team ready" summary card
└── agent-intro-data.ts          Codenames, taglines, intros, display order constants
```

### Modifications to Existing Files

| File | Change |
|------|--------|
| `src/app/(platform)/layout.tsx` | Add localStorage check + conditionally render `<AgentIntroOverlay />` |
| `src/lib/agents/constants.ts` | Add `AGENT_CODENAMES` export (or put in `agent-intro-data.ts`) |

No new routes. No DB migrations. No new API endpoints.

---

## Component Specifications

### `agent-intro-data.ts`

Exports:
- `AGENT_INTRO_ORDER`: `['support', 'sales', 'analytics', 'marketing', 'technical']`
- `AGENT_INTROS`: Record<AgentType, { codename, tagline, intro }>

### `agent-intro-card.tsx`

Props:
- `agentType: AgentType`
- `introData: { codename, tagline, intro }`
- `isEnabled: boolean`
- `autonomyLevel: AutonomyLevel`
- `onToggle: () => void`
- `onAutonomyChange: (level: AutonomyLevel) => void`
- `onNext: () => void`
- `onSkip: () => void`
- `stepIndex: number`
- `totalSteps: number`

### `agent-intro-overlay.tsx`

State:
- `currentIndex: number` (0-5, where 5 = summary card)
- `agentStates: Record<AgentType, { enabled: boolean, autonomy: AutonomyLevel }>`
- `isVisible: boolean` (controls fade-out on completion)

Renders:
- AnimatePresence-style wrapper for card transitions (CSS transitions, no framer-motion dependency)
- Current card based on `currentIndex`
- Summary card when `currentIndex === 5`

### `agent-team-summary.tsx`

Props:
- `agentStates: Record<AgentType, { enabled: boolean, autonomy: AutonomyLevel }>`
- `onComplete: () => void`

---

## Animations (CSS-only, no external deps)

| Animation | Implementation |
|-----------|---------------|
| Icon entrance | `@keyframes scaleIn { from { transform: scale(0.8); opacity: 0 } to { transform: scale(1); opacity: 1 } }` 0.5s ease-out |
| Text fade-in | `opacity` transition, 1.5s ease-in, triggered by adding a class after mount |
| Setup panel slide-up | `transform: translateY(20px) → translateY(0)` + `opacity: 0 → 1`, 0.4s, 1.5s delay |
| Card exit | `opacity: 1 → 0` + `scale(1) → scale(0.95)`, 0.3s |
| Card enter | `opacity: 0 → 1` + `scale(0.95) → scale(1)`, 0.4s |
| Glow pulse | `@keyframes glowPulse` on the radial gradient background, subtle 3s loop |
| Summary reveal | Same fade-in as card enter |
| Overlay dismiss | `opacity: 1 → 0`, 0.5s, then unmount |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User refreshes mid-intro | Overlay restarts from agent 1 (localStorage flag not set until completion) |
| User navigates away mid-intro | Same — restarts next time they visit `/platform` |
| All agents skipped | Summary shows all as "Skipped"; still enters command center normally |
| API call to update agent fails | Toast error, agent state reverts visually; user can retry or skip |
| storeId not yet loaded | Don't render overlay until storeId is available (show loading spinner) |
| User clears localStorage | Will see the intro again — harmless, agents already configured in DB |
