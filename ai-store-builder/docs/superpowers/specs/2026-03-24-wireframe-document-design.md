# Design Spec: High-Fidelity Wireframe Document

**Date:** 2026-03-24
**Type:** Interactive HTML document
**Output:** Single self-contained HTML file (`wireframes.html`) in project root

---

## Goal

Create a single self-contained HTML file that serves as a high-fidelity, pixel-accurate visual map of every screen in the AI Store Builder platform (excluding storefront pages). The document replicates the actual UI: exact colors, fonts, sizes, placements, buttons, and interactions — serving as both a user journey walkthrough and a page-by-page reference.

---

## Scope

### Included (~60 screens)

**Auth (6 pages):**
- Sign In, Sign Up, Reset Password, Update Password, 2FA Verification, Auth Confirmation

**Marketing (1 page):**
- Landing page (full sections: hero, agent showcase, how-it-works, pricing, CTA, footer)

**Onboarding (4 steps + Agent Intro):**
- Step 1: Store Basics (name, description, category)
- Step 2: Brand & Theme (logo, theme picker, color picker)
- Step 3: First Product (image upload)
- Step 4: Store Live
- Agent Intro Overlay (5 agent cards + team summary)

**Platform / Command Center (10 pages):**
- Command Center home (agent cards, activity feed, approval summary, quick stats)
- Analytics (metrics, charts, top products, agent insights)
- Approvals queue (filter, batch actions, keyboard shortcuts, approval cards)
- Orders (table, detail slide-over panel)
- Products (table with images, inventory indicators)
- Agent Detail (timeline/chat tabs, metrics sidebar, autonomy config)
- Settings hub (6 linked cards)
- Settings > Agent Configuration (per-agent cards with autonomy levels, config dropdowns)
- Settings > Agent Memory (memory cards with confidence bars)
- Settings > Connected Accounts (OAuth connection cards)

**Legacy Dashboard (24+ pages):**
- Dashboard Home (stats, charts, getting started checklist, quick actions)
- Analytics (stats, revenue chart, top products, recent orders)
- Products List (grid/list toggle, filters, pagination)
- Product Create (ProductForm: images, AI extraction, variants, description generator)
- Product Edit (same form, edit mode with status toggle, delete)
- Collections List, Create, Edit
- Coupons List, Create, Edit
- Orders List, Order Detail (items, shipping, payment, refund, timeline)
- Abandoned Carts (stats, search, recovery emails)
- Store Migration (Shopify/Etsy multi-state flow)
- Reports (GST/sales/product reports with export)
- Refunds (stats, table)
- Returns & RTO (stats, tips)
- Reviews Moderation (pending/approved/rejected tabs)
- Settings main page (store info, branding, shipping, checkout, etc.)
- Settings > Payments (Razorpay + Stripe)
- Settings > Shipping (flat rate, zones, weight-based)
- Settings > Shipping Providers (multi-provider, setup guides)
- Settings > Notifications (Resend + MSG91)
- Settings > Security (2FA)
- Settings > Domain (subdomain + custom domain DNS)
- Settings > Policies (configure + edit mode)
- Settings > Marketing (tracking pixels)
- Settings > Data Export

**Admin (9 pages):**
- Overview (stats, charts, tables)
- Stores List + Store Detail
- Sellers List
- Customers List
- Orders List
- Products List
- Analytics (period-based, charts)
- Agent Health Dashboard (metrics, errors, LLM costs)

### Excluded
- All `[storeSlug]/*` customer-facing storefront pages (~28 pages)
- API routes (no visual representation)
- Loading/error/not-found boundary pages (noted as state variants within parent pages)

### Modals & Overlays (documented within parent pages)
- Rebuild Store Dialog (Settings)
- Refund Modal (Order Detail)
- Welcome Modal (post-onboarding)
- Bulk Upload Modal (Products)
- Image Compression Dialog (ProductForm)
- Shipping Pickup/Tracking Dialogs (Order Detail)
- Add Provider Dialog (Shipping Providers)
- Enable/Disable 2FA Dialogs (Security)
- Remove Domain Dialog (Domain)
- Remove Credentials Dialogs (Payments)
- Delete confirmation dialogs (Admin pages)
- AI Bot Panel (floating trigger + slide-out panel)
- Command Palette (Cmd+K overlay)
- Notification Popover (bell icon)
- User Dropdown Menu (sidebar footer)
- Product Card Actions Dropdown

---

## Document Structure

### Navigation

**Top bar** (fixed, always visible):
- Left: "StoreForge Wireframes" title
- Center: Two tab buttons — "Flow View" / "Atlas View"
- Right: Search input (filters Atlas View in real-time)

### Flow View

Five interactive journey maps rendered as connected node diagrams:

1. **New Merchant Journey**
   Landing → Sign Up → Email Verify → Sign In → 2FA (optional) → Onboarding Step 1-4 → Agent Intro (5 cards) → Team Summary → Command Center

2. **Auth Flows**
   Sign In ↔ Sign Up, Sign In → 2FA → Platform, Forgot Password → Reset → Update → Sign In

3. **Merchant: Platform Operations**
   Command Center → Agent Detail / Approvals / Analytics / Orders / Products / Settings (with sub-routes)

4. **Merchant: Legacy Dashboard**
   Dashboard Home → Products / Orders / Collections / Coupons / Abandoned Carts / Reports / Refunds / Returns / Reviews / Migration / Settings (each with sub-pages)

5. **Platform Admin**
   Admin Overview → Stores / Sellers / Customers / Orders / Products / Analytics / Agent Health

Each node is a rounded rectangle showing page name and route. Clicking a node scrolls to its wireframe panel in Atlas View.

### Atlas View

Collapsible tree sidebar (left, 240px wide) + wireframe panel (right, remaining width).

**Tree structure:**
```
▾ Auth
  Sign In
  Sign Up
  Reset Password
  Update Password
  2FA Verification
  Auth Confirmation
▾ Marketing
  Landing Page
▾ Onboarding
  Step 1: Store Basics
  Step 2: Brand & Theme
  Step 3: First Product
  Step 4: Store Live
  Agent Intro Overlay
▾ Platform
  Command Center
  Analytics
  Approvals
  Orders
  Products
  Agent Detail
  ▾ Settings
    Hub
    Agent Configuration
    Agent Memory
    Connected Accounts
▾ Dashboard
  Home
  Analytics
  ▾ Products
    List
    Create/Edit (ProductForm)
  ▾ Collections
    List
    Create/Edit
  ▾ Coupons
    List
    Create/Edit
  Orders List
  Order Detail
  Abandoned Carts
  Migration
  Reports
  Refunds
  Returns & RTO
  Reviews
  ▾ Settings
    Main
    Payments
    Shipping
    Shipping Providers
    Notifications
    Security
    Domain
    Policies
    Marketing
    Data Export
▾ Admin
  Overview
  Stores List
  Store Detail
  Sellers
  Customers
  Orders
  Products
  Analytics
  Agent Health
```

Clicking a tree item loads the wireframe panel on the right.

---

## Wireframe Panel Specification

Each page's panel contains:

### 1. Page Header
- Page title (h2, bold)
- Route path (monospace, muted text)
- Persona tag (Merchant / Admin / Visitor)
- State tabs if applicable: Default | Loading | Empty | Error

### 2. High-Fidelity Mockup
A `div` container styled to look exactly like the real page:
- Correct background colors (zinc-950 for dark pages, platform variables for agent pages)
- Real sidebar + header chrome around the content (matching exact layout dimensions)
- All cards, tables, forms, buttons rendered with exact shadcn styling
- Real text content (labels, placeholders, descriptions as they appear in code)
- Agent accent colors (blue/emerald/amber/purple/cyan)
- Geist Sans for UI text, Geist Mono for codenames/metrics/routes

### 3. Overlays Section
Below each mockup, expandable sections for modals/dialogs triggered from that page:
- Click "Show [Modal Name]" → modal renders as overlay on top of the mockup
- Each modal shows: trigger description, all form fields, buttons, validation states

### 4. Navigation Map
Small section showing: "Links to: [page1], [page2], ..." and "Linked from: [page3], ..."

---

## Design System (Embedded in HTML)

The HTML file embeds a CSS section replicating the exact design tokens:

### Colors (Dark Theme — all pages use dark mode)
```
--background: oklch(0.145 0 0)          /* #242424 - page bg */
--foreground: oklch(0.985 0 0)          /* #fafafa - primary text */
--card: oklch(0.205 0 0)               /* #333333 - card bg */
--card-foreground: oklch(0.985 0 0)    /* #fafafa */
--muted: oklch(0.269 0 0)             /* #444444 */
--muted-foreground: oklch(0.708 0 0)   /* #b3b3b3 */
--border: oklch(1 0 0 / 10%)           /* white 10% */
--input: oklch(1 0 0 / 15%)           /* white 15% */
--destructive: oklch(0.704 0.191 22.216)  /* red */
--primary: oklch(0.922 0 0)           /* #ebebeb */
--primary-foreground: oklch(0.205 0 0) /* #333333 */
```

### Platform Theme (Agent pages)
```
--platform-bg: oklch(0.098 0 0)        /* #0a0a0a */
--platform-surface: oklch(0.13 0 0)    /* #1a1a1a */
--platform-border: oklch(0.2 0 0)      /* #2a2a2a */
--platform-text-primary: oklch(0.95 0 0)
--platform-text-secondary: oklch(0.65 0 0)
--platform-text-muted: oklch(0.45 0 0)
```

### Agent Colors
| Agent | Color | Hex |
|-------|-------|-----|
| Support (SENTINEL) | Blue | #3b82f6 |
| Sales (FORGE) | Emerald | #10b981 |
| Analytics (PULSE) | Amber | #f59e0b |
| Marketing (PRISM) | Purple | #a855f7 |
| Technical (CIPHER) | Cyan | #06b6d4 |

### Typography
- Sans: `"Geist Sans", system-ui, -apple-system, sans-serif`
- Mono: `"Geist Mono", "SF Mono", Menlo, monospace`
- Base size: 14px (text-sm)
- Headings: font-semibold
- Labels: text-sm font-medium
- Muted text: text-xs or text-sm with muted-foreground

### Layout Dimensions
| Element | Width | Height |
|---------|-------|--------|
| Dashboard sidebar | 256px (w-64) | Full height |
| Platform sidebar | 224px (w-56) | Full height |
| Admin sidebar | 256px (w-64) | Full height |
| Dashboard navbar | Full width | 64px (h-16) |
| Platform top bar | Full width | 56px (h-14) |
| Auth container | 450px max | Auto |
| Cards | Full width | Auto, rounded-xl, border, py-6 |
| Dialog | 512px max (max-w-lg) | Auto |

### Component Styles
- **Buttons:** h-9 px-4, rounded-md, font-medium text-sm
- **Inputs:** h-9, rounded-md, border, bg-transparent, px-3
- **Badges:** rounded-full, px-2 py-0.5, text-xs font-medium
- **Cards:** rounded-xl, border, shadow-sm, gap-6
- **Tabs:** h-10, rounded-md, bg-muted
- **Tables:** text-sm, hover:bg-muted/50 rows, border-b
- **Switch:** h-5 w-9, rounded-full

---

## Technical Implementation

### File Structure
Single HTML file with embedded CSS and JavaScript. No external dependencies except Google Fonts (Geist).

### Approximate Size
~20,000-30,000 lines. ~60 page mockups × ~300-500 lines each + CSS + JS navigation logic.

### Key JavaScript Features
- Tab switching (Flow View ↔ Atlas View)
- Tree navigation with collapse/expand
- Search filtering (Atlas View)
- Flow node click → scroll to wireframe
- Modal toggle buttons
- State tab switching (Default/Loading/Empty/Error)
- Smooth scroll to anchors
- URL hash navigation (#page-name)

### Font Loading
```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```
Fallback to system fonts if offline.

---

## Planned/Missing Features (Amber Highlight)

Elements that exist in the PRD vision but are not fully built will be marked with:
- Amber dashed border
- "PLANNED" badge in top-right corner
- Tooltip explaining what's missing

Based on codebase exploration, candidates include:
- Agent chat functionality (exists but may be incomplete)
- Some agent configuration options
- Marketing connections (Google Analytics marked "Coming Soon")

---

## Build Approach

The HTML file will be built in phases, one section at a time:

1. **Foundation** — HTML structure, CSS design system, navigation JS, flow diagrams
2. **Auth & Marketing** — 7 pages (sign-in, sign-up, reset, update, 2fa, confirm, landing)
3. **Onboarding** — 4 steps + agent intro overlay (5 cards + summary)
4. **Platform** — 10 pages (command center, analytics, approvals, orders, products, agent detail, settings x4)
5. **Dashboard Core** — Home, analytics, products, orders (list + detail)
6. **Dashboard Extended** — Collections, coupons, abandoned carts, migration, reports, refunds, returns, reviews
7. **Dashboard Settings** — 10 settings sub-pages
8. **Admin** — 9 admin pages
9. **Polish** — Modal overlays, state variants, navigation links, planned feature markers
