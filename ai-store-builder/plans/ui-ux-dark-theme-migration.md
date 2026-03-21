# UI/UX Dark Theme Migration Plan

> Migrating the entire merchant experience to the dark command center aesthetic (Linear/Vercel/Raycast inspired).
> Storefront (customer-facing) remains per-store themed — intentionally excluded from dark migration.

**Created:** 2026-03-21
**Status:** Phases 1-5 Complete, Phase 6 Pending

---

## Completed

### Phase 1: Auth Flow Redesign (DONE)
- [x] Auth layout — added `dark` class, `Bot` icon, `font-mono` branding, subtle dot grid + radial gradient background
- [x] Sign-in page — no changes needed (shadcn CSS variables auto-adapt to dark)
- [x] Sign-up page — fixed hardcoded `bg-blue-50`/`border-blue-200`/`text-blue-800` alert → `bg-blue-500/10`/`border-blue-500/30`/`text-blue-400`
- [x] Email confirm page — replaced ALL hardcoded grays with CSS variable classes, added `dark` class, updated branding
- [x] 2FA verify page — replaced `bg-gray-50` → `dark bg-background`, fixed hardcoded `bg-blue-100` → `bg-blue-500/15`
- [x] Fixed pre-existing route conflict: `/(dashboard)/onboarding` vs `/(platform)/onboarding` (renamed old to `_onboarding_old`)

---

## Phase 2: Dashboard Dark Mode

**Priority:** High — this is the daily merchant experience
**Goal:** Dashboard matches the platform command center dark aesthetic
**Approach:** Add `dark` class to dashboard layout. Since all dashboard pages use shadcn components with CSS variable-based styling, most will auto-adapt. Then audit each page for hardcoded colors.

### 2.1 Layout & Navigation
- [ ] `src/app/dashboard/layout.tsx` — Add `dark` class to root wrapper div
- [ ] `src/components/dashboard/sidebar.tsx` — Verify dark mode rendering. May need to update `bg-card border-r` to darker surface colors or ensure CSS variables produce the right dark shades
- [ ] `src/components/dashboard/navbar.tsx` — Verify `border-b bg-background` renders correctly in dark
- [ ] `src/components/dashboard/nav-section.tsx` — Check active state highlighting in dark mode

### 2.2 Main Dashboard Page
- [ ] `src/app/dashboard/page.tsx` — Audit for hardcoded colors in stats cards, welcome banner, onboarding checklist, quick actions
- [ ] Verify chart components render correctly on dark backgrounds

### 2.3 Product Pages
- [ ] `src/app/dashboard/products/page.tsx` — Check filter bar, grid/list views, product cards in dark
- [ ] `src/app/dashboard/products/new/page.tsx` — Verify ProductForm renders correctly
- [ ] `src/app/dashboard/products/[id]/page.tsx` — Same as above (edit mode)
- [ ] `src/components/products/product-form.tsx` — Large form component, audit for hardcoded colors in image uploader, AI suggestions, variant editor
- [ ] `src/components/products/image-uploader.tsx` — Check drag-drop zone styling
- [ ] `src/components/products/ai-suggestions.tsx` — Check confidence badge colors
- [ ] `src/components/products/variants-table.tsx` — Table rendering in dark

### 2.4 Order Pages
- [ ] `src/app/dashboard/orders/page.tsx` — Audit status badges, table rows, search bar
- [ ] `src/app/dashboard/orders/[orderId]/page.tsx` — Check timeline component, status badges, refund UI, 2-column layout

### 2.5 Other Dashboard Pages
- [ ] `src/app/dashboard/analytics/page.tsx` — Charts must render on dark background, check stat cards
- [ ] `src/app/dashboard/collections/page.tsx` — Collection cards with images in dark
- [ ] `src/app/dashboard/coupons/page.tsx` — Stats cards, data table
- [ ] `src/app/dashboard/reviews/page.tsx` — **Known issue:** uses `text-gray-600` instead of `text-muted-foreground` — fix this
- [ ] `src/app/dashboard/abandoned-carts/page.tsx` — Stats cards, cart item display
- [ ] `src/app/dashboard/migrate/page.tsx` — Multi-stage migration flow

### 2.6 Settings Pages
- [ ] `src/app/dashboard/settings/page.tsx` — Color picker, logo editor, danger zone
- [ ] `src/app/dashboard/settings/payments/page.tsx` — Credential forms, status indicators
- [ ] `src/app/dashboard/settings/notifications/page.tsx` — Toggle switches, tab UI
- [ ] `src/app/dashboard/settings/shipping-providers/page.tsx` — Provider config tabs
- [ ] `src/app/dashboard/settings/security/page.tsx` — 2FA settings
- [ ] `src/app/dashboard/settings/domain/page.tsx` — Domain configuration
- [ ] `src/app/dashboard/settings/policies/page.tsx` — Policy editor
- [ ] `src/app/dashboard/settings/data/page.tsx` — Data management

### 2.7 Dashboard Components Audit
- [ ] `src/components/dashboard/ai-bot/` — AI Bot panel, messages, input, confirmation — verify dark rendering
- [ ] `src/components/dashboard/notification-bell.tsx` — Notification dropdown styling

### Estimated Complexity
- Layout change: Low (add `dark` class)
- Component audit: Medium (15+ pages, each may have 0-5 hardcoded color fixes)
- Charts: Medium (may need chart color overrides for dark backgrounds)

---

## Phase 3: Admin Dashboard Dark Mode

**Priority:** Medium — used by platform admins only
**Goal:** Admin panel matches the dark aesthetic, especially the Agent Health page

### 3.1 Layout & Navigation
- [ ] `src/app/admin/layout.tsx` — Add `dark` class to root wrapper
- [ ] `src/components/admin/admin-sidebar.tsx` — Replace red active state (`bg-red-600 text-white`) with platform accent color (`bg-blue-600` or `bg-accent`)
- [ ] Mobile header admin badge styling

### 3.2 Admin Pages
- [ ] `src/app/admin/page.tsx` — Stats cards (blue, green, purple, red icons), revenue/signup charts, data tables
- [ ] `src/app/admin/stores/page.tsx` — Search bar, status tabs, bulk selection, data table with store logos
- [ ] `src/app/admin/agents/page.tsx` — **Most important**: Agent health dashboard should definitely be dark. Check health status colors (Healthy/Warning/Critical), LLM cost progress bars, error tables
- [ ] Any other admin sub-pages (sellers, customers, orders if they exist)

### 3.3 Admin Components
- [ ] `src/components/admin/` — Audit all admin-specific components for hardcoded colors

### Estimated Complexity
- Low-Medium (fewer pages than dashboard, same pattern of adding `dark` class + auditing)

---

## Phase 4: Landing Page Alignment (DONE)

**Priority:** Medium — sets first impression before sign-up
**Goal:** Marketing page sets the right visual expectation for the dark product experience

### 4.1 Landing Page
- [x] `src/app/(marketing)/page.tsx` — Dark aesthetic with visual polish:
  - Background: `bg-zinc-950` with radial glow effects (blue, purple, cyan)
  - Dot grid pattern overlay for depth
  - Hero badge ("5 AI Agents. One Command Center.")
  - Gradient text on hero heading (blue → cyan)
  - CTA buttons with blue glow shadows
  - Agent cards with per-color hover glow effects and bordered highlight boxes
  - Section labels (uppercase blue text) for visual rhythm
  - Comparison section with strikethrough on competitor prices
  - New final CTA section before footer
  - Nav/footer updated with Bot icon in blue square (matching auth flow)
  - Connector lines use gradient fade
- [x] `src/app/(marketing)/layout.tsx` — Updated wrapper to `bg-zinc-950`, updated metadata

### 4.2 Design Considerations
- [x] Landing page is more visually expressive (radial glows, dot grid, gradient text)
- [x] Agent cards preview command center aesthetic with hover glows
- [x] CTA buttons stand out with blue glow shadows
- [x] Footer updated with new icon treatment

### 4.3 Visual Continuity
- [x] Landing page (dark) → Sign-up (dark) → Onboarding (dark) → Dashboard (dark) = seamless

---

## Phase 5: Storefront Polish (DONE)

**Priority:** Lower — customer-facing, separate identity from merchant dashboard
**Goal:** Improve UX quality of customer-facing storefront (NOT a dark theme change — storefront keeps per-store theming)

### 5.1 Skeleton Loaders
- [x] Product listing page — `src/app/[storeSlug]/products/loading.tsx` with ProductGridSkeleton
- [x] Product detail page — `src/app/[storeSlug]/products/[id]/loading.tsx` with ProductDetailSkeleton
- [x] Cart page — CartPageSkeleton shown during `!isHydrated` state
- [x] Checkout page — CheckoutSkeleton shown during `!isHydrated` state
- [x] Created `src/components/store/skeletons.tsx` with 6 skeleton components

### 5.2 Search Implementation
- [x] Already implemented (Google Custom Search API) — search page, search bar, API route all functional

### 5.3 Wishlist Implementation
- [x] Already implemented (WishlistButton component with full API, wishlist page with CRUD)
- [x] Product card heart button wired to WishlistButton component (was a stub, now functional)

### 5.4 Checkout Refactor
- [x] Split `store-checkout-page.tsx` from 1189 → 624 lines (47% reduction)
- [x] Created `src/components/store/checkout/` directory with 5 sub-components:
  - `checkout-step-indicator.tsx` — Progress bar with step buttons
  - `checkout-contact-step.tsx` — Email, name, phone fields
  - `checkout-shipping-step.tsx` — Saved addresses, autocomplete, manual fields, delivery estimate
  - `checkout-payment-step.tsx` — Online/COD selection, order review
  - `checkout-order-summary.tsx` — Cart items sidebar (desktop sticky + mobile collapsible)
- [x] All sub-components are presentational with typed props interfaces
- [x] Main file retains all state, validation, payment processing (Razorpay/Stripe)

### 5.5 Product Detail Enhancements
- [x] Image lightbox/zoom — full-screen overlay with keyboard navigation (Escape, arrows), body scroll lock
- [x] Share button — Web Share API with clipboard fallback + toast notification
- [x] Product card secondary hover images already implemented (Image component with opacity transition)

### 5.6 Accessibility Pass
- [x] Product detail: ARIA labels on image nav arrows, thumbnails, quantity buttons, lightbox dialog
- [x] Product card: ARIA label on quick view button with product name
- [x] Cart page: `role="list"` + `aria-label="Cart items"`, labels on quantity/remove buttons
- [x] Mini cart: ARIA labels on remove buttons

---

## Phase 6: Cross-Cutting Polish

**Priority:** Ongoing — address alongside other phases
**Goal:** Consistency and quality across all pages

### 6.1 Loading States Audit (DONE)
- [x] Audited all 38 dashboard/platform pages — 92% have proper loading states
- [x] Standardized on `Loader2` icon with `animate-spin`
- [x] Fixed oversized spinner in order detail page (h-12 → h-8)
- [x] Improved reviews page loading state with spinner icon

### 6.2 Error States Audit (DONE)
- [x] Replaced 2 browser `alert()` calls with `toast.error()` in image-uploader.tsx
- [x] Sonner toast library confirmed as standard (100% consistent across 52 files)
- [x] No `window.alert` calls found

### 6.3 Empty States Audit (DONE)
- [x] Orders page — added ShoppingCart icon + contextual messaging
- [x] Reviews page — added MessageSquare icon + filter-aware messaging + Loader2 for loading state
- [x] 6 other pages already had good empty states (products, collections, coupons, returns, refunds, abandoned carts)

### 6.4 Toast Consistency (DONE)
- [x] All toast imports use Sonner consistently (30+ files)
- [x] Zero `alert()` calls remaining
- [x] Toast patterns: `toast.error()` (123 calls), `toast.success()` (54 calls) — all properly typed

### 6.5 Typography Audit (DONE)
- [x] Standardized all h1 headings to `text-2xl font-bold` across 14 dashboard pages
- [x] Geist Sans/Mono confirmed as standard font family (no system font fallbacks found)
- [x] No `font-sans`, `Arial`, `Helvetica` in component code

### 6.6 Animation Consistency (DONE)
- [x] Added `transition-colors` to 5 hover elements missing smooth transitions
- [x] Fixed inconsistent hover patterns (back links, table rows, product titles)
- [x] Standardized Loader2 sizes: h-8 w-8 for page-level, h-4 w-4 for buttons

---

## Execution Order

```
Phase 2 (Dashboard)  ━━━━━━━━━━━━━━━━━  HIGH IMPACT — do next
Phase 3 (Admin)      ━━━━━━━━━━━━━━━     MEDIUM — after Phase 2
Phase 4 (Landing)    ━━━━━━━━━━━         MEDIUM — quick win
Phase 5 (Storefront) ━━━━━━━━━━━━━━━━━  LOWER — new features needed
Phase 6 (Polish)     ━━━━━━━━━━━━━━━     ONGOING — alongside others
```

## Notes

- The `dark` class approach works because shadcn/ui CSS variables in `globals.css` already define a full dark palette under `.dark { ... }`
- Platform pages (`/(platform)`) already use a separate custom `--platform-*` variable system — dashboard will use the standard `.dark` shadcn variables instead to avoid duplicating the theme system
- Storefront pages use per-store CSS variables (`--color-primary`, `--font-heading`, etc.) via `dynamic-styles.ts` — these are intentionally independent
- Password strength component (`components/auth/password-strength.tsx`) uses hardcoded colors (`bg-red-500`, `text-red-600`, `bg-green-500`, `text-green-600`) for semantic meaning — these are acceptable and should NOT be changed to CSS variables since red=weak and green=strong are universal
