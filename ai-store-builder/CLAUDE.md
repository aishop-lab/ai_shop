# CLAUDE.md - AI Store Builder Project Context

> **IMPORTANT FOR CLAUDE**: This file contains the complete project context. After completing ANY code change, you MUST update this file:
> 1. Add an entry to the **DEVELOPMENT LOG** section with timestamp and description
> 2. Update relevant sections if features/APIs/schema changed
> 3. Keep this file as the single source of truth for project state

---

## 1. PROJECT OVERVIEW

**AI Store Builder** is a full-stack Next.js application that enables users to create e-commerce stores through an AI-assisted conversational onboarding flow.

### What It Does
- Guides sellers through store setup via a 10-step chat interface
- Uses AI (Google Gemini/Anthropic Claude) to extract business categories from descriptions
- Auto-generates store blueprints with region-specific defaults
- Provides AI-powered product data extraction from images
- Handles authentication, file uploads, and database operations

### Current Status: **Active Development (v0.2.0)**
- Authentication: ✅ Complete
- Onboarding Flow: ✅ Complete (with live store building preview)
- AI Integration: ✅ Complete (Vercel AI SDK, multi-provider)
- Store Frontend: ✅ Complete (4 themes: modern, classic, playful, minimal)
- Product Management: ✅ Complete (upload, bulk CSV, AI extraction)
- Dashboard: ✅ Complete (Shopify-style, analytics, orders, settings)
- Orders/Checkout: ✅ Complete (frontend + backend)
- Payments: ✅ Complete (Razorpay integration)
- Coupons: ✅ Complete (discount system)
- Refunds: ✅ Complete (full/partial via Razorpay)
- Marketing: ✅ Complete (FB Pixel, GA4, Google Ads tracking)

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.1 (App Router) |
| Frontend | React 19.2.3, TypeScript 5, Tailwind CSS 4 |
| UI Components | Radix UI, Shadcn UI, Lucide Icons |
| Forms | React Hook Form + Zod |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| AI | Vercel AI SDK (Google Gemini + Anthropic Claude) |
| Vision/OCR | Google Cloud Vision API |
| Image Processing | Sharp |
| Charts | Recharts |
| Notifications | Sonner |

---

## 2. ARCHITECTURE

### Directory Structure
```
src/
├── app/
│   ├── (auth)/                    # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/               # Protected routes (dashboard, onboarding)
│   ├── dashboard/                 # Dashboard pages (products, orders, analytics, settings, coupons)
│   ├── [storeSlug]/               # Dynamic store frontend (homepage, products, cart, checkout)
│   ├── api/
│   │   ├── auth/                  # Auth endpoints
│   │   ├── onboarding/            # Onboarding endpoints
│   │   ├── products/              # Product management
│   │   ├── orders/                # Order & payment endpoints
│   │   ├── cart/                  # Cart validation & coupons
│   │   ├── dashboard/             # Dashboard APIs (stats, analytics, settings, orders, coupons)
│   │   ├── store/[slug]/          # Public store API
│   │   ├── search/                # Google Custom Search
│   │   └── webhooks/              # Razorpay webhooks
│   └── page.tsx                   # Landing page
├── components/
│   ├── ui/                        # Reusable UI (button, card, input, tabs, dialog, etc.)
│   ├── dashboard/                 # Dashboard components (sidebar, charts, widgets)
│   ├── onboarding/                # Chat UI, progress sidebar, store preview
│   ├── products/                  # Image uploader, product form, AI suggestions
│   ├── store/                     # Store frontend + themes
│   ├── orders/                    # Order status badges
│   └── search/                    # Search bar, result cards
├── lib/
│   ├── ai/                        # AI services (provider, vercel-ai-service, vision, schemas)
│   ├── supabase/                  # Client, server, middleware
│   ├── onboarding/                # Flow definitions, blueprint generator
│   ├── products/                  # Validation, db-ops, image processing
│   ├── cart/                      # Calculations, validation
│   ├── coupons/                   # Coupon validation
│   ├── payment/                   # Razorpay integration
│   ├── orders/                    # Inventory management
│   ├── email/                     # Email templates (placeholder)
│   ├── store/                     # Queries, cache, SEO, dynamic styles
│   ├── search/                    # Google Custom Search
│   ├── analytics/                 # Marketing pixels & tracking (provider, scripts, types)
│   ├── contexts/                  # Auth, store, sidebar contexts
│   ├── hooks/                     # Custom hooks
│   └── types/                     # TypeScript types
└── middleware.ts                  # Route protection
```

### Key Files
| File | Purpose |
|------|---------|
| `lib/ai/provider.ts` | AI provider config (Gemini/Claude selection) |
| `lib/ai/vercel-ai-service.ts` | All AI operations (onboarding, products, content) |
| `lib/onboarding/flow.ts` | 10 onboarding steps + skip logic |
| `lib/onboarding/blueprint-generator.ts` | Store config generator |
| `lib/payment/razorpay.ts` | Razorpay payment integration |
| `lib/orders/inventory.ts` | Stock management (reserve, reduce, restore) |
| `lib/coupons/validate.ts` | Coupon validation logic |
| `lib/analytics/` | Marketing pixels & event tracking (AnalyticsProvider, useAnalytics) |

---

## 3. IMPLEMENTED FEATURES

### Authentication
- Email/password sign-up/sign-in with validation
- Google OAuth via Supabase
- Protected routes via middleware
- Session management with JWT cookies

### Onboarding Flow (10 Steps)
1. **business_name** - Store name input
2. **description** - Business description (triggers AI analysis)
3. **category_confirmation** - Confirm AI-extracted category
4. **target_geography** - Local/India/International
5. **logo_url** - Optional logo upload
6. **brand_vibe** - Modern/Classic/Playful/Minimal
7. **primary_color** - Brand color picker
8. **contact_info** - Email, phone, WhatsApp, Instagram
9. **gstin** - Optional (skipped for international)
10. **build_store** - Creates store with live preview animation

**After completion**: Redirects to `/dashboard?welcome=true`

### AI Integration (Vercel AI SDK)
- **Providers**: Google Gemini (default), Anthropic Claude
- **Onboarding**: Single-call analysis returns category + names + colors + tagline
- **Product Analysis**: Title, description, categories, tags, OCR, price suggestion
- **Content Generation**: About Us, policies, FAQs, homepage sections
- **Confidence Thresholds**: Auto-confirm (80%), review (70%), require confirmation (60%)

### Store Frontend (4 Themes)
- **modern-minimal** - Clean, spacious, contemporary
- **classic-elegant** - Serif fonts, gold accents
- **playful-bright** - Rounded corners, vibrant
- **minimal-zen** - Maximum whitespace

**Pages**: Homepage, Products, Product Detail, About, Contact, Cart, Checkout, Search

**Features**: Dynamic CSS variables, responsive design, SEO metadata, sidebar navigation

### Product Management
- Single upload with drag-drop images (up to 10)
- AI auto-extraction from images
- Bulk CSV upload with template
- CRUD operations with publish/unpublish

### Dashboard (Shopify-style)
- Collapsible sidebar navigation
- Welcome banner after onboarding
- Analytics: Revenue chart, top products, recent orders, low stock alerts
- Order management with status updates and tracking
- Coupon management (create, edit, usage tracking)
- Store settings

### Orders & Payments
- Order creation with inventory reservation
- Razorpay integration (create order, verify payment, webhooks)
- COD support (auto-confirmed)
- Refund handling

### Coupon System
- Discount types: percentage, fixed amount, free shipping
- Usage limits (total and per-customer)
- Minimum order value
- Date restrictions (start/end)

---

## 4. DATABASE SCHEMA

### Tables
- **profiles** - User profiles (FK → auth.users), role, onboarding status
- **stores** - Store info, blueprint (JSONB), brand colors, settings, status
- **products** - Product details, pricing, inventory, status, categories/tags
- **product_images** - Image URLs with thumbnails and position
- **orders** - Customer info, shipping, pricing, payment details, coupon applied
- **order_items** - Product snapshots at time of order
- **refunds** - Refund tracking
- **inventory_reservations** - Prevent overselling during checkout
- **coupons** - Discount codes with rules
- **coupon_usage** - Per-order usage tracking

### Storage Buckets
- **logos** - Store logos (`{user_id}/{timestamp}.{ext}`)
- **product-images** - Product images and thumbnails

---

## 5. API REFERENCE

### Authentication
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/sign-up` | Register |
| POST | `/api/auth/sign-in` | Login |
| POST | `/api/auth/sign-out` | Logout |
| GET | `/api/auth/user` | Current user + store |

### Onboarding
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/onboarding/start` | Initialize session |
| POST | `/api/onboarding/process` | Process step |
| POST | `/api/onboarding/upload-logo` | Upload logo |
| POST | `/api/onboarding/generate-blueprint` | Create store |

### Products
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/products/upload` | Single product upload |
| POST | `/api/products/bulk-upload` | CSV bulk upload |
| GET | `/api/products/list` | List with filters |
| GET/PATCH/DELETE | `/api/products/[id]` | CRUD |
| POST/DELETE | `/api/products/[id]/publish` | Publish/unpublish |
| POST | `/api/products/suggest-price` | AI price suggestion |

### Orders & Cart
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/orders/create` | Create order + Razorpay |
| POST | `/api/orders/verify-payment` | Verify payment |
| POST | `/api/webhooks/razorpay` | Webhooks |
| POST | `/api/cart/validate` | Validate cart |
| POST | `/api/cart/apply-coupon` | Apply coupon |
| POST | `/api/cart/remove-coupon` | Remove coupon |

### Dashboard
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard/stats` | Quick stats |
| GET | `/api/dashboard/analytics` | Full analytics |
| GET/PATCH | `/api/dashboard/settings` | Store settings |
| GET | `/api/dashboard/orders` | List orders |
| GET/PATCH | `/api/dashboard/orders/[orderId]` | Order detail |
| GET/POST | `/api/dashboard/orders/[orderId]/refund` | Get/process refund |
| GET | `/api/dashboard/refunds` | List all refunds |
| GET | `/api/dashboard/export` | CSV export |
| GET/POST | `/api/dashboard/coupons` | List/create coupons |
| GET/PATCH/DELETE | `/api/dashboard/coupons/[id]` | Coupon CRUD |
| GET/PATCH | `/api/dashboard/settings/marketing` | Marketing pixel settings |

### Store Frontend
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/store/[slug]/data` | Store + products |
| GET | `/api/store/[slug]/products` | Paginated products |
| GET | `/api/search` | Google Custom Search |

---

## 6. CURRENT STATE

### Known Issues
- Checkout frontend not yet connected to backend payment APIs
- Email notifications are logged only (no email service)

### Not Yet Implemented
- Email service integration (Resend/SendGrid)
- Admin panel
- Customer management dashboard
- Invoice PDF generation
- Multi-language support

---

## 7. DEVELOPMENT LOG

> Add new entries at the TOP with format: `[YYYY-MM-DD HH:MM] - Description`

### Recent Changes

[2026-01-19 20:30] - Implemented Marketing Pixels & Analytics Integration
- Database: Added `marketing_pixels` JSONB column to stores table (Facebook Pixel, GA4, Google Ads)
- API: GET/PATCH `/api/dashboard/settings/marketing` - Marketing pixel settings CRUD
- Dashboard UI: Marketing settings page at `/dashboard/settings/marketing` with cards for each platform
- Analytics Library: `src/lib/analytics/` with types, context provider, tracking scripts
  - `AnalyticsProvider` and `useAnalytics()` hook for tracking events
  - `TrackingScripts` component for injecting FB Pixel and GA4 scripts
- Store Layout: Integrated `TrackingScripts` and `AnalyticsProvider` with currency support
- Event Tracking:
  - Product Detail: `trackViewProduct` on mount, `trackAddToCart` on add to cart
  - Checkout Page: `trackBeginCheckout` when checkout starts
  - Thank You Page: `trackPurchase` on successful order completion
- Dashboard Sidebar: Added Marketing link with Megaphone icon

[2026-01-19 19:30] - Implemented Refund Management UI
- API: POST /api/dashboard/orders/[orderId]/refund - Process full/partial refunds via Razorpay
- API: GET /api/dashboard/orders/[orderId]/refund - Get refund history for order
- API: GET /api/dashboard/refunds - List all refunds with stats
- Component: RefundModal with full/partial refund options, reason selection
- Updated Order Detail page with refund button, status, and history
- New Refunds list page with table, filters, and stats cards
- Added Refunds to dashboard sidebar navigation

[2026-01-19 18:00] - Implemented Storefront Sidebar Navigation
- Added sidebar context, slide-out sidebar component
- Updated all 4 theme headers with hamburger menu
- Responsive: mobile overlay, desktop toggle persists in localStorage

[2026-01-19 17:20] - Implemented Discount & Coupon System
- Database: coupons, coupon_usage tables, orders coupon columns
- APIs: dashboard/coupons CRUD, cart/apply-coupon, cart/remove-coupon
- Dashboard UI: coupons list, create/edit forms

[2026-01-19 17:05] - Fixed Product Upload AI Integration
- Fixed form.setValue() to properly sync AI suggestions
- Added AI price suggestion endpoint and UI

[2026-01-19 22:00] - Implemented Shopify-like Dashboard Redesign
- Collapsible sidebar with store header
- Welcome banner, analytics page, AI suggestions widget
- Post-onboarding now redirects to /dashboard?welcome=true

[2026-01-19 20:00] - Implemented Vercel AI SDK Integration
- Multi-provider support (Gemini + Claude)
- Enhanced schemas for all AI operations
- Store content generation during onboarding

---

## 8. ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
AI_PROVIDER=google  # 'google' or 'anthropic'
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=  # Required if AI_PROVIDER=anthropic

# Google Cloud Vision (optional, for enhanced image processing)
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=  # Path to service account JSON

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Google Custom Search (optional)
GOOGLE_CUSTOM_SEARCH_API_KEY=
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=
```

---

*Last Updated: 2026-01-19*
