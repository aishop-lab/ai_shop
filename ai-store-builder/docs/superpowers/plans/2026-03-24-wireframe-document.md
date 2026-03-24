# Wireframe Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single self-contained HTML file (`wireframes.html`) that provides high-fidelity, pixel-accurate mockups of every screen in the AI Store Builder platform (excluding storefront), with Flow View (user journey maps) and Atlas View (searchable page-by-page reference).

**Architecture:** Single HTML file with embedded CSS design system (matching exact app tokens), inline SVG flow diagrams, and vanilla JS for navigation/search/state-switching. Each page mockup is a `<section>` element containing the full layout chrome (sidebar + header + content) styled to match the real app. Modals are togglable overlay divs within each section.

**Tech Stack:** HTML5, CSS3 (custom properties, oklch colors), vanilla JavaScript, inline SVG

**Spec:** `docs/superpowers/specs/2026-03-24-wireframe-document-design.md`

---

## File Structure

All work happens in a single file:

- **Create:** `wireframes.html` (project root)

The file is structured internally as:
```
<!DOCTYPE html>
<html>
<head>
  <style>/* ~2000 lines: design system, component classes, layout classes */</style>
</head>
<body>
  <!-- Top navigation bar -->
  <!-- Flow View container (5 SVG journey maps) -->
  <!-- Atlas View container (tree sidebar + wireframe panels) -->
  <script>/* ~300 lines: navigation, search, modal toggles, state tabs */</script>
</body>
</html>
```

No tests for this project — it's a static HTML document, not application code. Verification is visual (open in browser).

---

## Task 1: Foundation — HTML Shell, CSS Design System, Navigation JS

**Files:**
- Create: `wireframes.html`

This task creates the complete skeleton: design system CSS, navigation shell, JavaScript, and one placeholder page to verify everything works.

- [ ] **Step 1: Create the HTML file with full CSS design system**

Write `wireframes.html` with:

1. **`<head>`** section:
   - Meta charset, viewport
   - `<title>StoreForge Wireframes</title>`
   - `<style>` block containing:

2. **CSS Custom Properties** (`:root`):
   ```css
   /* Dark theme tokens (from globals.css) */
   /* Hex values are oklch conversions from globals.css */
   --background: #242424;      /* oklch(0.145 0 0) */
   --foreground: #fafafa;      /* oklch(0.985 0 0) */
   --card: #333333;            /* oklch(0.205 0 0) */
   --card-foreground: #fafafa;
   --muted: #444444;           /* oklch(0.269 0 0) */
   --muted-foreground: #a3a3a3; /* oklch(0.708 0 0) — approx */
   --border: rgba(255,255,255,0.1);
   --input: rgba(255,255,255,0.15);
   --primary: #ebebeb;         /* oklch(0.922 0 0) */
   --primary-foreground: #333333;
   --secondary: #444444;
   --secondary-foreground: #fafafa;
   --destructive: #ef4444;
   --accent: #444444;
   --accent-foreground: #fafafa;
   --ring: #8f8f8f;            /* oklch(0.556 0 0) */
   --radius: 10px;

   /* Platform theme (agent pages) */
   --platform-bg: #0a0a0a;
   --platform-surface: #171717;
   --platform-surface-hover: #1f1f1f;
   --platform-border: #262626;
   --platform-border-hover: #3a3a3a;
   --platform-text-primary: #ededed;
   --platform-text-secondary: #888;
   --platform-text-muted: #555;
   --platform-accent: #3b82f6;

   /* Agent colors */
   --agent-support: #3b82f6;
   --agent-sales: #10b981;
   --agent-analytics: #f59e0b;
   --agent-marketing: #a855f7;
   --agent-technical: #06b6d4;

   /* Typography */
   --font-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
   --font-mono: "Geist Mono", "SF Mono", "Cascadia Code", "Consolas", monospace;

   /* Layout */
   --sidebar-width: 256px;
   --platform-sidebar-width: 224px;
   --navbar-height: 64px;
   --platform-topbar-height: 56px;
   --tree-width: 260px;
   ```

3. **Component CSS classes** matching shadcn exactly:
   - `.sf-btn` (+ `.sf-btn-default`, `.sf-btn-destructive`, `.sf-btn-outline`, `.sf-btn-secondary`, `.sf-btn-ghost`)
   - `.sf-input`, `.sf-textarea`, `.sf-select`
   - `.sf-badge` (+ `.sf-badge-default`, `.sf-badge-secondary`, `.sf-badge-destructive`, `.sf-badge-outline`)
   - `.sf-card`, `.sf-card-header`, `.sf-card-title`, `.sf-card-description`, `.sf-card-content`
   - `.sf-table`, `.sf-table-header`, `.sf-table-row`, `.sf-table-head`, `.sf-table-cell`
   - `.sf-tabs-list`, `.sf-tab-trigger`, `.sf-tab-trigger-active`
   - `.sf-switch`, `.sf-switch-checked`
   - `.sf-label`
   - `.sf-dialog-overlay`, `.sf-dialog-content`
   - `.sf-alert`, `.sf-alert-destructive`
   - `.sf-skeleton`
   - `.sf-separator`
   - `.sf-popover`
   - `.sf-dropdown-menu`, `.sf-dropdown-item`

4. **Layout chrome classes:**
   - `.layout-dashboard` (sidebar 256px + main content)
   - `.layout-platform` (sidebar 224px + topbar 56px + main content)
   - `.layout-admin` (sidebar 256px + main content)
   - `.layout-auth` (centered 450px card with dot grid background)
   - `.layout-marketing` (full-width sections, zinc-950 bg)
   - `.sidebar` (fixed left, dark bg, border-right)
   - `.navbar` (sticky top, 64px height)
   - `.topbar` (sticky top, 56px height)

5. **Wireframe document navigation classes:**
   - `.wf-topbar` (fixed top bar with tabs + search)
   - `.wf-tree` (atlas sidebar tree)
   - `.wf-tree-item`, `.wf-tree-group`
   - `.wf-panel` (wireframe content panel)
   - `.wf-page-header` (page title, route, persona tag)
   - `.wf-state-tabs` (Default/Loading/Empty/Error)
   - `.wf-nav-map` (links to/from)
   - `.wf-modal-toggle` (show/hide modal buttons)
   - `.wf-planned` (amber dashed border + PLANNED badge)

6. **`<body>`** structure:
   ```html
   <!-- Wireframe top bar -->
   <header class="wf-topbar">
     <div class="wf-topbar-left">StoreForge Wireframes</div>
     <div class="wf-topbar-center">
       <button class="wf-tab active" data-view="flow">Flow View</button>
       <button class="wf-tab" data-view="atlas">Atlas View</button>
     </div>
     <div class="wf-topbar-right">
       <input type="text" class="wf-search" placeholder="Search pages...">
     </div>
   </header>

   <!-- Flow View -->
   <div id="flow-view" class="wf-view active">
     <!-- 5 SVG journey maps go here (Task 2) -->
   </div>

   <!-- Atlas View -->
   <div id="atlas-view" class="wf-view" style="display:none">
     <aside class="wf-tree" id="atlas-tree">
       <!-- Tree navigation (built from page data) -->
     </aside>
     <main class="wf-panels" id="atlas-panels">
       <!-- Page wireframe sections go here (Tasks 3-9) -->
     </main>
   </div>
   ```

7. **`<script>`** section with:
   - View switching (flow ↔ atlas)
   - Tree navigation (collapse/expand groups, highlight active)
   - Search filtering (fuzzy match on page names, hide non-matching tree items)
   - `showPage(id)` — scroll to page panel, update tree highlight, update URL hash
   - `toggleModal(pageId, modalName)` — show/hide modal overlay within a page
   - `switchState(pageId, state)` — switch between Default/Loading/Empty/Error tabs
   - URL hash routing on load (`#page-sign-in` → scroll to sign-in)
   - Auto-compute "Linked from" data from all "Links to" declarations
   - Tree building from a `PAGES` data array

8. **One placeholder page** to verify the shell works:
   ```html
   <section id="page-sign-in" class="wf-page" data-links-to="sign-up,reset-password,platform">
     <div class="wf-page-header">
       <h2>Sign In</h2>
       <code>/sign-in</code>
       <span class="wf-persona">Visitor</span>
     </div>
     <div class="wf-mockup">
       <!-- Placeholder: "Sign In page mockup goes here" -->
       <div class="layout-auth">
         <p style="text-align:center;color:var(--muted-foreground)">Sign In mockup placeholder</p>
       </div>
     </div>
   </section>
   ```

- [ ] **Step 2: Open in browser and verify**

Open `wireframes.html` in a browser. Verify:
- Top bar renders with tabs and search
- Flow View shows (empty for now)
- Atlas View shows with tree sidebar and placeholder sign-in page
- Tab switching works
- Search filters the tree
- URL hash navigation works (#page-sign-in)

- [ ] **Step 3: Commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe document foundation — shell, design system, navigation"
```

---

## Task 2: Flow View — 5 SVG Journey Maps

**Files:**
- Modify: `wireframes.html` (inside `#flow-view`)

- [ ] **Step 1: Add the 5 flow diagrams**

Inside `#flow-view`, add 5 sections, each containing:
- Section heading (e.g., "New Merchant Journey")
- An inline `<svg>` element with:
  - Positioned node rectangles (`<foreignObject>` wrapping HTML divs for styled text)
  - Curved connector paths (`<path>` with cubic bezier curves)
  - Arrow markers at path endpoints
  - Each node has `onclick="showPage('page-id')"` and cursor:pointer
  - Nodes are styled: rounded-lg, dark bg, border, page name + route text

**Flow 1: New Merchant Journey** (~12 nodes)
```
Landing → Sign Up → Email Verify → Sign In → 2FA (optional) →
Onboarding Step 1 → Step 2 → Step 3 → Step 4 →
Agent Intro → Team Summary → Command Center
```

**Flow 2: Auth Flows** (~8 nodes)
```
Sign In ↔ Sign Up
Sign In → 2FA → Platform
Sign In → Reset Password → Update Password → Sign In
Auth Confirmation (standalone)
```

**Flow 3: Merchant Platform Operations** (~12 nodes)
```
Command Center → Agent Detail
Command Center → Approvals
Command Center → Analytics
Command Center → Orders
Command Center → Products
Command Center → Settings Hub → Agent Config / Agent Memory / Connections
```

**Flow 4: Merchant Legacy Dashboard** (~20 nodes)
```
Dashboard Home → Products List → Product Create / Product Edit
Dashboard Home → Orders List → Order Detail
Dashboard Home → Collections List → Create/Edit
Dashboard Home → Coupons List → Create/Edit
Dashboard Home → Abandoned Carts / Migration / Reports / Refunds / Returns / Reviews
Dashboard Home → Settings → (10 sub-pages)
```

**Flow 5: Platform Admin** (~10 nodes)
```
Admin Overview → Stores List → Store Detail
Admin Overview → Sellers / Customers / Orders / Products
Admin Overview → Analytics
Admin Overview → Agent Health
```

Each SVG should be ~600-800px tall, full width of the flow view container. Nodes arranged in rows with left-to-right flow and top-to-bottom branching.

- [ ] **Step 2: Verify in browser**

Open in browser. Verify all 5 flow diagrams render, nodes are clickable (switches to Atlas View and scrolls to the page), connectors draw correctly.

- [ ] **Step 3: Commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe flow view — 5 SVG journey maps with clickable nodes"
```

---

## Task 3: Auth & Marketing Pages (7 pages)

**Files:**
- Modify: `wireframes.html` (replace sign-in placeholder, add 6 more page sections)

Build high-fidelity mockups for these pages. Each mockup uses `.layout-auth` (centered card on dot-grid background) or `.layout-marketing` (full-width sections).

**Pages to build:**

- [ ] **Step 1: Sign In page**

Replace the placeholder with full mockup:
- Auth layout wrapper (dot grid bg, centered card)
- Logo: Bot icon + "AI Store" text (font-mono, text-2xl)
- Card with: title "Welcome back", description
- Google sign-in button (outline, Google SVG icon)
- "Or continue with email" divider
- Email input (label, placeholder "you@example.com")
- Password input (label with "Forgot password?" link, eye toggle icon, placeholder "••••••••")
- "Sign In" button (primary, full width)
- Footer: "Don't have an account? Sign up" link
- `data-links-to="sign-up,reset-password,platform,onboarding"`

- [ ] **Step 2: Sign Up page**

- Same auth layout
- Card: "Create your account", description
- Google sign-up button
- Divider
- Full Name input (placeholder "Priya Kumar")
- Email input
- Phone input (optional, placeholder "+1 234 567 8900")
- Password input with eye toggle + PasswordStrength indicator (4 colored bars)
- Confirm Password input with match indicator (green checkmark or red X)
- "Create Account" button
- Footer: "Already have an account? Sign in"
- `data-links-to="sign-in,onboarding"`

- [ ] **Step 3: Reset Password page**

- Default state: email input + "Send Reset Link" button + "Back to Sign In" ghost button
- Success state (tab): green mail icon, "Check your email" message, "Send another link" + "Back to Sign In"
- `data-links-to="sign-in"`

- [ ] **Step 4: Update Password page**

- Three states (tabs): Loading (spinner), Invalid Session (error message + links), Form (new password + confirm + "Update Password" button)
- Success state: green checkmark, "Password updated" + "Go to Sign In"
- `data-links-to="sign-in,reset-password"`

- [ ] **Step 5: 2FA Verification page**

- Blue mail icon header, "Check your email"
- 6-digit code input (centered, monospace, large tracking)
- Expiry countdown timer
- "Verify Code" button
- "Didn't receive the code?" + "Resend Code" button with cooldown
- "Back to Sign In" link
- `data-links-to="sign-in,platform,onboarding"`

- [ ] **Step 6: Auth Confirmation page**

- Three states (tabs): Loading (spinner + "Verifying your email..."), Success (green checkmark + "Email Verified!"), Error (red X + "Verification Failed" + "Try signing up again" link)

- [ ] **Step 7: Marketing Landing page**

Full-width sections:
- Sticky nav: logo + "Sign In" ghost button + "Launch Your Store" primary button
- Hero: badge "5 AI Agents. One Command Center.", headline with gradient text, subtitle, two CTAs, sub-text "Free to start..."
- Agent showcase: 5 agent cards in 3-column grid (each with icon, name, description, highlight)
- How it works: 3 steps with numbered circles and connector lines
- Why us: 3 comparison cards (Traditional, Shopify+Apps strikethrough, StoreForge highlighted)
- Pricing: 3 tier cards (Free ₹0, Pro ₹2,999 with "Most Popular" badge, Business ₹9,999)
- Final CTA: "Ready to run your business on autopilot?"
- Footer: logo, links, copyright
- `data-links-to="sign-in,sign-up"`

- [ ] **Step 8: Verify all 7 pages in browser, commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe auth + marketing pages (7 high-fidelity mockups)"
```

---

## Task 4: Onboarding Pages (5 screens)

**Files:**
- Modify: `wireframes.html`

- [ ] **Step 1: Onboarding Step 1 — Store Basics**

- Full-screen dark (zinc-950) with sticky header showing progress dots (1/4)
- Progress indicator: 4 circles with connecting lines, step 1 active
- Store Name input with live slug preview (blue link text)
- Business Description textarea
- Category selector: 3x3 grid of 9 category buttons with AI detection badge
- Sticky footer: Back (disabled) + Continue button
- `data-links-to="onboarding-step-2"`

- [ ] **Step 2: Onboarding Step 2 — Brand & Theme**

- Progress: step 2 active
- Logo section: drag-drop area with "Generate with AI" button (Sparkles icon)
- Theme picker: 2x2 grid with 4 theme preview cards (Modern, Classic, Playful, Minimal) — each showing a mini wireframe preview
- Primary color picker: 8 preset circles + custom color
- `data-links-to="onboarding-step-1,onboarding-step-3"`

- [ ] **Step 3: Onboarding Step 3 — First Product**

- Progress: step 3 active
- Large dashed drop zone with ImagePlus icon
- "Drop product images here" + file type text
- AI badge: "AI will extract title, description, price & more"
- "Skip — Add products later" link
- `data-links-to="onboarding-step-2,onboarding-step-4"`

- [ ] **Step 4: Onboarding Step 4 — Store Live**

- Progress: step 4 complete (all green)
- Rocket icon in emerald circle
- "Your store is live!" heading
- Store name + subdomain URL (monospace)
- "Visit Your Store" primary button
- "Set Up Your AI Agents →" secondary link
- `data-links-to="platform"`

- [ ] **Step 5: Agent Intro Overlay**

Show the full overlay sequence as a single mockup with labeled sections:

**Section A: Single Agent Card** (show SENTINEL/Support as example)
- Progress dots (1/5)
- Radial glow + icon container (blue)
- Codename "SENTINEL" (mono, uppercase, tracking-widest)
- Display name "Support Agent"
- Tagline in quotes
- Intro paragraph
- Setup panel: Enable toggle + 5 autonomy level buttons (1-5)
- Autonomy level description
- "Meet Next Agent →" primary button + "Skip this agent" link

**Section B: Team Summary**
- Check icon (emerald circle)
- "Your AI Team is Ready" heading
- "X of 5 agents activated"
- Roster table: 5 rows showing codename, display name, status dot, autonomy level
- "Enter Command Center →" button

- `data-links-to="platform"`

- [ ] **Step 6: Verify and commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe onboarding pages (4 steps + agent intro overlay)"
```

---

## Task 5: Platform Pages (10 pages)

**Files:**
- Modify: `wireframes.html`

All platform pages use `.layout-platform` (224px sidebar + 56px topbar + platform theme colors).

**Platform sidebar** to include in chrome:
- "AI STORE" header (mono, semibold)
- Sections: COMMAND (Command Center, Approvals), AGENTS (5 agent types with colored dots), OPERATIONS (Products, Orders, Analytics), bottom: Settings link

**Platform topbar** to include:
- Breadcrumb text
- Cmd+K search button
- Notification bell (with amber badge showing pending count)
- User avatar dropdown

- [ ] **Step 1: Command Center**

- QuickStats: 4 metric cards (Total Actions, Pending Approvals, Active Agents 3/5, Monthly Cost $0.00 PLANNED)
- Two-column grid: Activity Feed (left 2/3, 6 items with colored agent dots, action text, timestamps) + Approval Summary (right 1/3, 3 pending items with priority dots)
- Agent Cards: 5-column grid, each card showing agent icon, codename, status dot, description, enable toggle
- `data-links-to="platform-analytics,platform-approvals,platform-orders,platform-products,platform-agent-detail,platform-settings"`

- [ ] **Step 2: Analytics**

- Header: "Analytics" + period switcher (7d/30d/90d) + refresh + Generate Report button
- 6-column metrics bar (Revenue, Orders, Avg Order Value, Cart Abandonment, Recovery Rate, Active Customers)
- Two charts (static SVGs): Revenue trend (area chart) + Orders by Status (horizontal bar chart)
- Top Products table (5 rows)
- Agent Insights section with insight cards
- `data-links-to="platform"`

- [ ] **Step 3: Approvals Queue**

- Header: "Approval Queue" + pending count badge + agent filter dropdown + priority filter dropdown
- Batch action bar: Select all checkbox + count + "Reject Selected" + "Approve Selected" buttons
- 3 approval cards: each with checkbox, priority dot+label, agent badge, timestamp, summary text, expandable reasoning, expiry, Reject/Approve buttons
- One card shown as "Approved" with green overlay
- Keyboard shortcuts bar at bottom (j/k, a, r)
- Empty state tab: check icon + "All clear" message
- `data-links-to="platform"`

- [ ] **Step 4: Orders**

- Header: "Orders" + count
- Search input + status dropdown filter
- Table: Order #, Customer (name + email), Total, Items, Status badge, Payment badge, Date
- 5 sample rows
- Pagination: Previous / Page 1 of 3 / Next
- Slide-over detail panel (right side): Customer info, Items summary, Payment & Status
- `data-links-to="platform"`

- [ ] **Step 5: Products**

- Header: "Products" + count + "Add Product" button (links to dashboard)
- Search + status filter + category filter
- Table: Product (thumbnail + name + category), Price, Inventory (with stock indicators), Status badge, Created, Store link
- 5 sample rows
- `data-links-to="dashboard-products-create,platform"`

- [ ] **Step 6: Agent Detail**

- Header: agent icon (blue) + "Support Agent" (mono) + status dot + "Level 3 — Smart Auto" + Enable/Disable toggle
- Two-column layout:
  - Left (2/3): Tab bar (Timeline / Chat)
    - Timeline tab: 4 entries with colored dots, timestamps, status badges, duration/cost
    - Chat tab: 3 message bubbles (agent left, merchant right), input bar with "Ask SENTINEL..." placeholder
  - Right (1/3): Metrics (3 cards: Total Actions, Approvals Requested, Errors), Autonomy Level (number + 5 clickable bars), Quick Info section
- `data-links-to="platform,platform-settings-agents"`

- [ ] **Step 7: Settings Hub**

- Header: "Settings" + subtitle
- 2x3 grid of settings cards: Agent Configuration, Connected Accounts, Store Settings, Notifications, Payments, Shipping
- Each card: icon in bordered box + title + description + arrow
- `data-links-to="platform-settings-agents,platform-settings-connections,dashboard-settings,dashboard-settings-notifications,dashboard-settings-payments,dashboard-settings-shipping-providers"`

- [ ] **Step 8: Agent Configuration**

- Breadcrumb: "← Settings"
- 2-column grid of 5 agent config cards
- Each card: agent badge, description, toggle switch, autonomy level (5 numbered buttons), current level description, "View all levels" collapsible, Configuration section with 2 dropdowns
- `data-links-to="platform-settings,platform-settings-agent-memory"`

- [ ] **Step 9: Agent Memory**

- Breadcrumb: Settings / Agents / Support / Memory
- Header: "Agent Memory" + brain icon badge with count
- Memory groups by type (Preferences, Learned Patterns, Merchant Feedback, Context)
- 2 memory cards per group: key (mono), source badge, confidence bar (colored fill), JSON value (expandable), timestamps
- `data-links-to="platform-settings-agents"`

- [ ] **Step 10: Connected Accounts**

- Breadcrumb: "← Settings"
- 3 connection cards: Meta Business (blue), Google Ads (red), Google Analytics (amber, "Coming Soon" disabled)
- Connected state: green dot + "Connected" + "Disconnect" button
- Not connected state: "Connect" button
- Info callout at bottom
- `data-links-to="platform-settings"`

- [ ] **Step 11: Verify all 10 platform pages, commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe platform pages (10 high-fidelity mockups)"
```

---

## Task 6: Dashboard Core Pages (6 pages)

**Files:**
- Modify: `wireframes.html`

All dashboard pages use `.layout-dashboard` (256px sidebar + 64px navbar).

**Dashboard sidebar** chrome:
- Store logo/initial + store name + Live/Draft status
- Nav sections: Home, Products, Collections, Coupons, Orders, Analytics
- More: Abandoned Carts, Reports, Reviews, Refunds, Returns, Migration
- Settings link, Admin link (red)
- User dropdown at bottom

**Dashboard navbar** chrome:
- Menu button (mobile icon)
- Spacer
- Notification bell popover
- AI Bot floating trigger button (gradient purple-blue circle, bottom-right)

- [ ] **Step 1: Dashboard Home**

- Welcome banner (gradient, dismissible)
- "Home, Manan" heading + subtitle + "Add Product" button
- 3-column grid: Store Status Card (left) + 3 stat cards (Products, Orders, Revenue)
- 2-column: AI Suggestions Widget + Traffic Widget
- 2-column: Getting Started Checklist (4 steps with progress bar) + Quick Actions (3 buttons)
- `data-links-to="dashboard-products,dashboard-orders,dashboard-analytics,dashboard-settings,dashboard-products-create,onboarding"`

- [ ] **Step 2: Dashboard Analytics**

- "Analytics" heading + period tabs (7d/30d/90d/1y)
- 4 stat cards (Revenue, Orders, Products, Avg Order Value)
- Revenue trend chart (static SVG area chart)
- 2-column: Top Selling Products table + Recent Orders table
- Low stock alert (conditional, shown with sample data)
- `data-links-to="dashboard,dashboard-products,dashboard-orders"`

- [ ] **Step 3: Products List**

- "Products" heading + Import dropdown + "Add Product" button
- Filters row: search, status dropdown, category dropdown, sort dropdown, view toggle (grid/list)
- "Showing 12 of 24 products"
- Grid view: 4-column grid of product cards (image, title, price, status badge, actions dropdown)
- Pagination: Previous / Page 1 of 2 / Next
- Empty state tab
- **Modal: Bulk Upload** (file upload zone, progress bar, results display)
- **Modal: Delete Confirmation** (alert dialog)
- `data-links-to="dashboard-products-create,dashboard-products-edit,dashboard"`

- [ ] **Step 4: Product Create (ProductForm)**

- Back button + "New Product" heading
- Image uploader: dashed drop zone with thumbnails, reorder handles, delete buttons, AI enhance buttons
- AI Suggestions card: expandable, confidence badge, fields with apply buttons
- Form fields: Title, Description (with AI generator button), Category dropdown, Tags input
- Pricing section: Price, Compare-at Price, Cost, Tax toggle
- Inventory section: Track inventory toggle, Quantity, SKU
- Variants section: "Enable Variants" toggle, variant options editor, variants table
- Status: Draft (default)
- "Create Product" button
- `data-links-to="dashboard-products"`

- [ ] **Step 5: Product Edit (ProductForm — edit mode)**

Same as Create but with edit-mode header:
- Back button + Product title + Status toggle (Published ↔ Draft) + "View in Store" link + Delete button (red)
- Existing images shown with delete buttons
- "Save Changes" button instead of "Create Product"
- `data-links-to="dashboard-products"`

- [ ] **Step 6: Orders List + Order Detail**

**Orders List:**
- "Orders" heading + Refresh + Export CSV buttons
- Search + status tabs (All/New/Processing/Packed/Shipped/Out/Done/Cancelled)
- Table: Order #, Customer, Date, Total, Payment badge, Status badge, chevron
- Smart pagination
- Empty state tab

**Order Detail:**
- Back + Order # heading + status badge + timestamp + Download Invoice button
- 3-column layout: Order Items card (product images, quantities, subtotal/shipping/tax/discount/total), Shipping Address card (left 2/3) + Customer card, Shipping Actions, Payment card, Refund card, Manual Update card, Timeline card (right 1/3)
- **Modal: Refund** (radio: full/partial, amount input, reason dropdown, warning alert, buttons)
- **Modal: Shipping Pickup** (date input, schedule button)
- **Modal: Shipping Tracking** (status box, timeline events)
- `data-links-to="dashboard-orders,dashboard"`

- [ ] **Step 7: Verify all 6 pages, commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe dashboard core pages (home, analytics, products, orders)"
```

---

## Task 7: Dashboard Extended Pages (8 pages)

**Files:**
- Modify: `wireframes.html`

- [ ] **Step 1: Collections List + Create**

**List:** 3-column grid of collection cards (cover image, title, product count, Hidden/Featured badges, actions dropdown)
**Create:** Form with name, description, cover image upload, product selector, visibility/featured toggles, SEO fields
**Edit:** Same form as Create but pre-filled with existing data + "Save Changes" button instead of "Create Collection" (note this in the mockup with a small "Edit mode mirrors Create with pre-filled data" annotation)
- `data-links-to="dashboard-collections-create,dashboard"`

- [ ] **Step 2: Coupons List + Create**

**List:** 3 stat cards (Total/Active/Discount Given) + table (Code with icon, Discount, Usage, Expires, Status badge, Actions dropdown)
**Create:** Code input + Generate button, description, discount type radio (3 visual cards: Percentage/Fixed/Free Shipping), value inputs, conditions (min order, usage limit, per-customer), schedule (start/end dates), active toggle
**Edit:** Same form as Create but pre-filled with existing coupon data + "Save Changes" button (note this mirrors Create)
- `data-links-to="dashboard-coupons-create,dashboard"`

- [ ] **Step 3: Abandoned Carts**

- 4 stat cards (Active, Recovered, Expired, Recovery Rate)
- Search by email + status tabs (All/Active/Recovered/Expired)
- Cart rows: email + status badge, info line (items, total, time ago, emails sent), item pills, "Send Reminder" button
- `data-links-to="dashboard"`

- [ ] **Step 4: Store Migration**

Show the multi-state flow:
- Disconnected state: 2 platform cards (Shopify, Etsy) with "Connect" buttons
- Connected state: platform card with shop name + "Configure Import" button
- Configuring state: checkboxes (Products/Collections/Orders/Customers/Coupons) + product status dropdown + Start button
- Migrating state: phase-by-phase progress bars
- `data-links-to="dashboard-products,dashboard"`

- [ ] **Step 5: Reports**

- "Financial Reports" heading
- Report generator card: type dropdown (GST/Sales by Date/Sales by Product), start/end date inputs, "Generate Report" button
- Results card: header with CSV/Excel export buttons, summary stat cards, data table (show GST report as default)
- `data-links-to="dashboard"`

- [ ] **Step 6: Refunds**

- 4 stat cards (Total Refunded, Processed, Pending, Failed)
- Search + status tabs
- Table: Order #, Customer, Amount, Reason, Date, Status badge, View Order link
- Pagination
- `data-links-to="dashboard-order-detail"`

- [ ] **Step 7: Returns & RTO**

- 4 stat cards (Total RTO, In Transit, Received Back, RTO Rate)
- RTO value alert (amber)
- Status tabs + search
- Order cards: order #, status badge, customer/amount/location/courier grid, RTO reason pill, timeline info, "View Order" button
- RTO Prevention Tips: 4 tip cards in 2x2 grid
- `data-links-to="dashboard-order-detail"`

- [ ] **Step 8: Reviews Moderation**

- 3 tabs: Pending (with count badge), Approved, Rejected
- Review cards: star rating, "Verified Purchase" badge, customer name/email, date, review title + text, product info, Approve/Reject buttons (pending only)
- Empty state tab
- `data-links-to="dashboard"`

- [ ] **Step 9: Verify all 8 pages, commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe dashboard extended pages (collections, coupons, carts, migration, reports, refunds, returns, reviews)"
```

---

## Task 8: Dashboard Settings Pages (10 pages)

**Files:**
- Modify: `wireframes.html`

- [ ] **Step 1: Settings Main**

- Back button + "Store Settings" heading + "View Store" button
- 2-column grid of cards: Store Information (name, tagline, description, contact fields), Branding (color picker with 8 presets + custom, logo editor, store URL), Shipping (thresholds, COD toggle), Checkout (guest checkout, require phone, payment status indicators), Legal Policies, Data & Privacy, Security, Notifications, Migration, Custom Domain, Danger Zone (red border, rebuild store button)
- Sticky save bar at bottom
- **Modal: Rebuild Store** (type store name to confirm, destructive)
- **Modal: Currency Change** (confirmation)
- `data-links-to="dashboard-settings-payments,dashboard-settings-shipping,dashboard-settings-shipping-providers,dashboard-settings-notifications,dashboard-settings-security,dashboard-settings-domain,dashboard-settings-policies,dashboard-settings-marketing,dashboard-settings-data,dashboard-migrate"`

- [ ] **Step 2: Payments**

- Razorpay section: status badge (Custom/Platform), benefits alert, credential inputs (Key ID, Key Secret, Webhook Secret) with eye toggles, "Save & Verify" + "Remove Credentials" buttons, help links + webhook URL
- Stripe section: same pattern
- Security notice (amber alert: AES-256-GCM)
- **Modal: Remove Credentials** (alert dialog)
- `data-links-to="dashboard-settings"`

- [ ] **Step 3: Shipping**

- Basic settings: flat rate + free shipping threshold inputs, COD toggle + fee
- Shipping zones: enable toggle, quick-add template buttons, collapsible zone cards (name, rate, delivery days, free threshold, COD toggle, state checkboxes for Indian states)
- Weight-based pricing: enable toggle, base weight + additional rate inputs, example calculation box
- `data-links-to="dashboard-settings"`

- [ ] **Step 4: Shipping Providers**

- Info alert (Multi-Provider Support)
- Connected providers list: provider cards with emoji icon, name, badges (Default/Active), masked credentials, Set Default + Delete buttons
- Shipping settings: auto-create toggle, courier selection dropdown, package dimensions (4 inputs)
- 5 collapsible setup guides (Shiprocket, Delhivery, Blue Dart, Shippo, Self Delivery)
- **Modal: Add Provider** (provider dropdown, dynamic credential fields, pickup location, default toggle, skip validation toggle)
- `data-links-to="dashboard-settings"`

- [ ] **Step 5: Notifications**

- Tabs: Email (Resend) / WhatsApp (MSG91)
- Email tab: credential card (API Key, From Email, From Name) + setup guide + notification preferences (5 toggles with mail/whatsapp icons)
- WhatsApp tab: credential card (Auth Key, WhatsApp Number, Sender ID) + setup guide
- `data-links-to="dashboard-settings"`

- [ ] **Step 6: Security**

- 2FA card: status indicator (enabled/disabled), enable/disable button
- How it works section (3 bullet points)
- **Modal: Enable 2FA** (6-digit code input, centered monospace, resend with cooldown, cancel/enable buttons)
- **Modal: Disable 2FA** (same code input, warning text, cancel/disable destructive button)
- `data-links-to="dashboard-settings"`

- [ ] **Step 7: Domain**

- StoreForge subdomain card (always active, green check, link)
- Custom domain card:
  - Not configured: domain input + "Add Custom Domain" button + how-it-works steps
  - Configured: status (verified green or pending yellow), DNS instructions with 3-step progress indicator, TXT/CNAME record tables with copy buttons, "Verify Domain" button
- **Modal: Remove Domain** (alert dialog)
- `data-links-to="dashboard-settings"`

- [ ] **Step 8: Policies**

- View mode toggle: Configure Policies / Edit Policy Text
- Configure mode: PolicyConfigurator component placeholder
- Edit mode: legal disclaimer alert (amber), "Regenerate All" button, 4 tabs (Returns, Privacy, Terms, Shipping), large textarea (monospace, 400px min-height), last updated timestamp, Save button
- `data-links-to="dashboard-settings"`

- [ ] **Step 9: Marketing**

- Info banner (why add tracking pixels)
- Facebook Pixel card: Pixel ID input + external link
- Google Analytics 4 card: Measurement ID input + external link
- Google Ads card: Conversion ID + Conversion Label inputs + external link
- "Save Changes" button
- `data-links-to="dashboard-settings"`

- [ ] **Step 10: Data Export**

- Export All Data card: info box, "Download All Data" button, export contents grid (6 items: customers.csv, orders.csv, products.csv, analytics.json, settings.json, README.txt)
- Data Ownership card: 4 benefit items with green checkmarks
- `data-links-to="dashboard-settings"`

- [ ] **Step 11: Verify all 10 settings pages, commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe dashboard settings pages (10 high-fidelity mockups)"
```

---

## Task 9: Admin Pages (9 pages)

**Files:**
- Modify: `wireframes.html`

All admin pages use `.layout-admin` (256px sidebar + navbar).

**Admin sidebar** chrome:
- Shield icon + "Admin Panel" header
- Nav: Overview, Stores, Sellers, Customers, Orders, Products, Analytics, Agent Health
- "Back to Dashboard" link at bottom

- [ ] **Step 1: Admin Overview**

- 4 stat cards (Total Stores, Total Sellers, Total Orders, Total Revenue)
- 2-column: Revenue Trend chart (SVG) + Signups chart (SVG)
- 2-column: Top Stores by Revenue table + Recent Orders table
- `data-links-to="admin-stores,admin-sellers,admin-orders,admin-analytics"`

- [ ] **Step 2: Stores List + Store Detail**

**Stores List:**
- Header + count + Delete (conditional) + Refresh buttons
- Search + status tabs (All/Active/Draft/Suspended)
- Table with checkboxes: Store (logo + name + slug), Owner, Products, Orders, Revenue, Status badge, chevron
- Pagination
- **Modal: Delete Stores** (alert dialog with count)

**Store Detail:**
- Back + store logo + name + status badge + URL link + Suspend/Activate button
- Store info card (2-column: owner, created, activated, status)
- 4 stat cards
- Recent orders table (10 rows)
- `data-links-to="admin-stores,admin"`

- [ ] **Step 3: Sellers List**

- Header + Delete + Refresh
- Search
- Table: Seller (name + email), Store (name + status badge), Signup Date, Last Login, Logins, Status (Completed/Onboarding)
- **Modal: Delete Sellers**
- `data-links-to="admin-stores,admin"`

- [ ] **Step 4: Customers List**

- Header + Delete + Refresh
- Search
- Table: Customer (name + email), Store, Orders, Total Spent, Joined
- **Modal: Delete Customers**
- `data-links-to="admin"`

- [ ] **Step 5: Admin Orders**

- Header + Delete + Refresh
- Search + status tabs (All/New/Processing/Shipped/Delivered/Cancelled)
- Table: Order #, Store, Customer, Amount, Payment badge, Status badge, Date
- **Modal: Delete Orders**
- `data-links-to="admin"`

- [ ] **Step 6: Admin Products**

- Header + Delete + Refresh
- Search + status tabs (All/Active/Draft/Archived)
- Table: Product (thumbnail + title), Store, Price, Stock (red if ≤5), Status, Created
- **Modal: Delete Products**
- `data-links-to="admin"`

- [ ] **Step 7: Admin Analytics**

- Header + period tabs (7d/30d/90d/1y/all)
- 5 summary stat cards (Revenue, Orders, New Sellers, New Stores, New Customers)
- Revenue Trend chart (SVG) + Signups chart (SVG)
- 2-column: Top Stores by Revenue + Top Stores by Orders
- `data-links-to="admin-stores,admin"`

- [ ] **Step 8: Agent Health Dashboard**

- Back link + "Agent Health Dashboard" heading
- 4 stat cards (Total Active, Agents with Errors, Pending Approvals, Total Actions 24h)
- Agent Type Breakdown table (type with colored dot, Active Instances, Actions 7d, Errors 7d, Health Status)
- Recent Agent Errors table (agent type badge, Store ID truncated mono, error message, error count red, last occurred)
- 2-column: Cost by Agent Type card (horizontal bars + total) + Top Stores by LLM Cost card
- `data-links-to="admin"`

- [ ] **Step 9: Verify all 9 admin pages, commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe admin pages (9 high-fidelity mockups)"
```

---

## Task 10: Polish — AI Bot Panel, State Variants, Navigation Links, Planned Markers

**Files:**
- Modify: `wireframes.html`

- [ ] **Step 1: AI Bot Panel (documented once)**

Add a dedicated section for the AI Bot Panel:
- Floating trigger button (gradient purple-blue circle, bottom-right, with keyboard hint "⌘K")
- Expanded panel: slide-out right panel with header ("AI Assistant" + close button), messages area (user bubbles right, assistant bubbles left, loading spinner), quick suggestion pills, input bar (textarea + send button)
- Confirmation overlay: action description, warning icon, Confirm/Cancel buttons
- Note: "This panel appears on all Dashboard and Platform pages"

- [ ] **Step 2: Command Palette (documented once)**

- Cmd+K overlay: dark modal with search input, categorized results list (Navigation, Actions, Agents), keyboard hints (↑↓ navigate, Enter select, Esc close)

- [ ] **Step 3: Notification Popover (documented once)**

- Bell icon trigger with unread count badge
- Popover panel: "Notifications" header + "Mark all read" button, scrollable list of 5 notifications (icon, title, message, time-ago, read indicator), "View all notifications" footer link

- [ ] **Step 4: User Dropdown (documented once)**

- Avatar + name trigger
- Dropdown: "My Account" label, Profile/Settings/Store Settings links, separator, Sign Out (red)

- [ ] **Step 5: Add state variant tabs to applicable pages**

For pages that have meaningful alternate states, add state tabs with content:
- Dashboard Home: Loading (skeleton cards), Empty (no store: "Let's get your store set up")
- Products List: Loading (skeleton grid), Empty ("No products yet" + "Add Your First Product" CTA)
- Orders List: Loading (skeleton table), Empty ("No orders yet")
- Collections List: Empty ("No collections yet" + "Create Collection" CTA)
- Coupons List: Empty ("No Coupons Yet" + "Create Your First Coupon" CTA)
- Approvals: Empty ("All clear" with check icon)
- Platform Analytics: Loading (skeletons), Empty ("No data yet for this period")
- Reviews: Empty per tab ("No pending/approved/rejected reviews found")

- [ ] **Step 6: Add PLANNED badges**

Mark these elements with amber dashed border + "PLANNED" badge:
- Command Center: Monthly Cost metric card ($0.00)
- Connected Accounts: Google Analytics card ("Coming Soon")
- Agent Detail: Chat tab streaming functionality note

- [ ] **Step 7: Verify navigation links**

Open browser, click through flow diagram nodes — verify each navigates to the correct Atlas page. Click "Links to" anchors on each page — verify they scroll correctly. Check that "Linked from" is auto-computed and accurate.

- [ ] **Step 8: Final commit**

```bash
git add wireframes.html
git commit -m "feat: wireframe polish — AI bot panel, state variants, navigation, planned markers"
```

---

## Execution Notes

- **Each task is independent after Task 1** — Tasks 3-9 can be built in any order since they all add `<section>` elements to the same file. However, they must be executed sequentially since they modify the same file.
- **Verification is visual** — After each task, open `wireframes.html` in a browser to check rendering. There are no automated tests.
- **Sample data** — Use realistic-looking placeholder data (Indian names, INR prices, realistic product titles) to match the app's target market.
- **File size** — The file will be large (~40-60k lines). This is expected and accepted per spec.
- **SVG charts** — Keep chart SVGs simple: 3-5 data points for line/area charts, 4-6 bars for bar charts. The goal is visual recognition, not data accuracy.
