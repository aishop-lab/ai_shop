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
- Uses AI (Google Gemini) to extract business categories from descriptions
- Auto-generates store blueprints with region-specific defaults
- Provides AI-powered product data extraction from images
- Handles authentication, file uploads, and database operations

### Current Status: **Active Development (v0.2.0)**
- Authentication: ✅ Complete
- Onboarding Flow: ✅ Complete (with live store building preview)
- AI Integration: ✅ Complete (onboarding + product extraction)
- Store Frontend: ✅ Complete (4 themes: modern, classic, playful, minimal)
- Product Management: ✅ Complete (upload, bulk CSV, AI extraction)
- Dashboard: ✅ Complete (analytics, orders, products, settings)
- Orders/Checkout: ✅ Complete (frontend + backend)
- Payments: ✅ Complete (Razorpay integration)

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.1 (App Router) |
| Frontend | React 19.2.3, TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | Radix UI, Shadcn UI, Lucide Icons |
| Forms | React Hook Form + Zod |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| AI | Google Gemini 2.0 Flash + Cloud Vision |
| Image Processing | Sharp (enhanced pipeline) |
| OCR/Vision | Google Cloud Vision API |
| Notifications | Sonner |

---

## 2. ARCHITECTURE

### Directory Structure
```
src/
├── app/
│   ├── (auth)/                    # Auth pages (sign-in, sign-up)
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/               # Protected routes
│   │   ├── dashboard/page.tsx
│   │   ├── onboarding/page.tsx
│   │   └── layout.tsx
│   ├── dashboard/
│   │   ├── products/              # Product management
│   │   │   ├── page.tsx           # Products list
│   │   │   └── new/page.tsx       # Add new product
│   │   ├── orders/                # Order management
│   │   │   ├── page.tsx           # Orders list with filters
│   │   │   └── [orderId]/page.tsx # Order detail with updates
│   │   ├── analytics/page.tsx     # Analytics dashboard
│   │   └── settings/page.tsx      # Store settings
│   ├── [storeSlug]/               # Dynamic store frontend
│   │   ├── layout.tsx             # Store layout with CSS vars
│   │   ├── page.tsx               # Store homepage
│   │   ├── products/
│   │   │   ├── page.tsx           # All products
│   │   │   └── [productId]/page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── cart/page.tsx
│   │   └── checkout/page.tsx
│   ├── api/
│   │   ├── auth/                  # Auth endpoints
│   │   ├── onboarding/            # Onboarding endpoints
│   │   ├── products/              # Product management endpoints
│   │   │   ├── upload/route.ts    # Single product upload
│   │   │   ├── bulk-upload/route.ts # CSV bulk upload
│   │   │   ├── list/route.ts      # List products
│   │   │   ├── extract/route.ts   # AI image extraction
│   │   │   └── [id]/
│   │   │       ├── route.ts       # Get/Update/Delete
│   │   │       └── publish/route.ts
│   │   └── store/[slug]/          # Public store API
│   │       ├── data/route.ts
│   │       └── products/route.ts
│   ├── page.tsx                   # Landing page
│   └── layout.tsx                 # Root layout
├── components/
│   ├── ui/                        # Reusable UI (button, card, input, alert, tabs, etc.)
│   ├── auth/                      # Auth components
│   ├── dashboard/                 # Dashboard components
│   │   ├── sidebar.tsx            # Shopify-style sidebar with collapsible nav
│   │   ├── navbar.tsx             # Dashboard top navbar
│   │   ├── nav-section.tsx        # Collapsible navigation section
│   │   ├── welcome-banner.tsx     # Dismissible welcome banner
│   │   ├── store-status-card.tsx  # Store overview card
│   │   ├── ai-suggestions-widget.tsx # AI-powered product suggestions
│   │   ├── revenue-chart.tsx      # Revenue trend chart (Recharts)
│   │   ├── top-products-table.tsx # Top selling products
│   │   ├── recent-orders-table.tsx # Recent orders list
│   │   └── low-stock-alert.tsx    # Low stock inventory alert
│   ├── orders/                    # Order components
│   │   └── order-status-badge.tsx # Order/Payment status badges
│   ├── onboarding/
│   │   ├── chat.tsx               # Main onboarding chat UI
│   │   ├── progress-sidebar.tsx   # Step progress indicator
│   │   └── store-building-preview.tsx # Live store building UI
│   ├── products/                  # Product management UI
│   │   ├── image-uploader.tsx     # Drag-drop image upload
│   │   ├── product-form.tsx       # Product form
│   │   ├── product-card.tsx       # Product card component
│   │   ├── ai-suggestions.tsx     # AI suggestions panel
│   │   └── bulk-upload-modal.tsx  # CSV bulk upload modal
│   └── store/                     # Store frontend components
│       ├── store-header.tsx
│       ├── store-footer.tsx
│       ├── store-homepage.tsx
│       ├── store-products-page.tsx
│       ├── store-product-detail.tsx
│       ├── store-cart-page.tsx
│       ├── store-checkout-page.tsx
│       └── themes/                # Theme variants
│           ├── modern-minimal/
│           ├── classic-elegant/
│           └── playful-bright/
├── lib/
│   ├── ai/
│   │   ├── unified-ai-service.ts  # Batched AI service (main)
│   │   ├── ai-cache.ts            # AI response caching
│   │   ├── google-vision-service.ts # Cloud Vision API
│   │   ├── onboarding-agent.ts    # Gemini AI for onboarding (legacy)
│   │   ├── product-extractor.ts   # Gemini AI for products (legacy)
│   │   └── prompts/
│   │       ├── onboarding.ts      # Legacy prompts
│   │       └── unified-prompts.ts # Optimized batched prompts
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client
│   │   └── middleware.ts          # Session management
│   ├── onboarding/
│   │   ├── flow.ts                # Step definitions
│   │   └── blueprint-generator.ts # Store config generator
│   ├── products/                  # Product utilities
│   │   ├── validation.ts          # Zod schemas
│   │   ├── db-operations.ts       # Database CRUD
│   │   ├── image-processor.ts     # Sharp image processing (enhanced)
│   │   ├── processing-pipeline.ts # Full AI processing pipeline
│   │   └── csv-parser.ts          # Bulk upload parsing
│   ├── store/
│   │   ├── queries.ts             # Store data queries
│   │   ├── cache.ts               # Caching strategy
│   │   ├── seo.ts                 # SEO helpers
│   │   └── dynamic-styles.ts      # CSS variable generation
│   ├── contexts/
│   │   ├── auth-context.tsx       # Global auth state
│   │   └── store-context.tsx      # Store frontend state
│   ├── hooks/
│   │   └── use-toast.ts           # Toast notifications
│   ├── types/
│   │   ├── auth.ts
│   │   ├── onboarding.ts
│   │   └── store.ts               # Store, Product, Settings types
│   └── validations/
│       ├── auth.ts
│       └── onboarding.ts
└── middleware.ts                  # Route protection
```

### Key Files & Purposes

| File | Purpose |
|------|---------|
| `middleware.ts` | Protects routes, refreshes sessions |
| `lib/ai/onboarding-agent.ts` | Gemini API for onboarding (categories, names, taglines) |
| `lib/ai/product-extractor.ts` | Gemini API for product extraction from images |
| `lib/onboarding/flow.ts` | Defines 10 onboarding steps + skip logic |
| `lib/onboarding/blueprint-generator.ts` | Creates store config from user data |
| `components/onboarding/chat.tsx` | Conversational UI component |
| `components/onboarding/store-building-preview.tsx` | Live store building animation |
| `lib/products/image-processor.ts` | Sharp-based image upload & thumbnails |
| `lib/products/db-operations.ts` | Product CRUD operations |
| `lib/store/queries.ts` | Store frontend data fetching |

---

## 3. IMPLEMENTED FEATURES

### 3.1 Authentication System
- **Sign-Up**: Email, password (8+ chars, upper/lower/number), name, optional phone
- **Sign-In**: Email/password with login tracking
- **Google Sign-In**: OAuth via Supabase
- **Sign-Out**: Clears session cookies
- **Protected Routes**: Middleware-based, redirects to /sign-in
- **Session Management**: JWT in cookies, auto-refresh

### 3.2 Onboarding Flow (10 Steps)

| Step ID | Key | Type | Description |
|---------|-----|------|-------------|
| 1 | business_name | text | Store name input |
| 2 | description | text | Business description (triggers AI) |
| 3 | category_confirmation | select | Confirm AI-extracted category |
| 31 | manual_category | select | Manual category (if AI fails) |
| 4 | target_geography | select | Local/India/International |
| 5 | logo_url | file | Optional logo upload |
| 6 | brand_vibe | select | Modern/Classic/Playful/Minimal |
| 7 | primary_color | color | Brand color picker |
| 8 | contact_info | multi-input | Email, phone, WhatsApp, Instagram |
| 9 | gstin | text | Optional (skipped for international) |
| 10 | build_store | action | "Build My Store" button |

**Skip Logic**:
- Step 3 skipped if AI extraction failed
- Step 31 skipped if AI extraction succeeded
- Step 9 skipped if geography = international

**After Step 10**:
- Shows `StoreBuildingPreview` component with animated progress
- Displays live preview of store being built
- Shows blueprint summary after completion
- Redirects to `/{store-slug}` to view the live store

### 3.3 AI Integration (Vercel AI SDK - Multi-Provider)

**Provider System** (`/src/lib/ai/provider.ts`):
- **Supported Providers**: Google Gemini (default), Anthropic Claude
- **Model Selection**:
  - `getTextModel()`: Claude Sonnet or Gemini Flash for text tasks
  - `getVisionModel()`: Claude Sonnet or Gemini Flash for vision tasks
  - `getFastModel()`: Claude Haiku or Gemini Flash for simple/fast tasks
- **Confidence Thresholds**:
  - `AUTO_CONFIRM` (0.80): Auto-select without user input
  - `AUTO_CONFIRM_REVIEW` (0.70): Auto-select but flag for review
  - `REQUIRE_CONFIRMATION` (0.60): Require user confirmation

**Vercel AI Service** (`/src/lib/ai/vercel-ai-service.ts`):
- **Onboarding (Single API Call)**:
  - `analyzeBusinessForOnboarding()`: Returns category + store names + colors + tagline in ONE call
  - Session caching prevents duplicate calls
  - Auto-apply for high confidence (>80%) suggestions
- **Product Analysis**:
  - `analyzeProductImage()`: Basic analysis (title, description, categories, tags, OCR, quality)
  - `analyzeProductImageEnhanced()`: Full analysis with price suggestion & SEO metadata
- **Store Content Generation**:
  - `generateAboutUs()`: About Us page with headline, story, mission, values
  - `generatePolicies()`: Return, shipping, privacy, terms policies
  - `generateHomepageSections()`: Hero, categories, value props, testimonials
  - `generateFAQs()`: 10-15 common FAQs based on store category
  - `generateAllStoreContent()`: Single call for all content (efficient)
- **SEO & Content**:
  - `generateCollectionDescription()`: Collection descriptions with SEO
  - `generateMetaDescription()`: SEO meta tags for any page
  - `enhanceDescription()`: Improve product descriptions
  - `generateProductTitle()`: SEO-optimized title generation
- **Streaming**:
  - `streamProductDescription()`: Real-time streaming descriptions
- **Utilities**:
  - `extractLogoColors()`: Extract brand colors from uploaded logos
  - `shouldAutoApply()`, `shouldAutoApplyWithReview()`, `requiresConfirmation()`

**Google Cloud Vision** (`/src/lib/ai/google-vision-service.ts`):
- `extractText()`: OCR - extract visible text from product images
- `detectObjects()`: Object detection for background removal analysis
- `moderateImage()`: Safe search - block inappropriate images
- `extractColors()`: Dominant color extraction from logos
- `analyzeImage()`: Comprehensive analysis combining all features

**Image Processing Pipeline** (`/src/lib/products/processing-pipeline.ts`):
- Full auto-enhancement: rotate, brightness, contrast, sharpen
- Background removal using object detection
- Quality scoring and blur detection
- Progress tracking for UI feedback

**Legacy Service** (still available as fallback):
- `onboarding-agent.ts`: Original individual API call methods
- `product-extractor.ts`: Basic product extraction
- `unified-ai-service.ts`: Google Gemini direct API (non-Vercel SDK)

- **Error Handling**: 3 retries with exponential backoff, graceful fallbacks

### 3.4 Blueprint Generation
Creates complete store config with:
- Identity (name, slug, tagline, description)
- Branding (logo, colors, typography by vibe)
- Location settings (currency, timezone)
- Shipping (thresholds, rates, COD)
- Payments (Razorpay/UPI for India, Stripe for international)

**Typography by Vibe**:
| Vibe | Heading Font | Body Font |
|------|--------------|-----------|
| modern | Inter | Poppins |
| classic | Playfair Display | Lora |
| playful | Fredoka | Nunito |
| minimal | Space Grotesk | Inter |

**Region Defaults**:
| Setting | India/Local | International |
|---------|-------------|---------------|
| Currency | INR | USD |
| Free Shipping | ₹999/₹499 | $50 |
| Flat Rate | ₹60/₹40 | $10 |
| COD | Enabled | Disabled |
| Payments | Razorpay, UPI | Stripe |

### 3.5 Store Frontend

**Four Theme Variants**:
1. `modern-minimal` - Clean, spacious, contemporary
2. `classic-elegant` - Serif fonts, gold accents, traditional
3. `playful-bright` - Rounded corners, vibrant, fun
4. `ultra-minimal` - Maximum whitespace, typography-focused

**Pages**:
- Homepage with hero, featured products, categories
- Products listing with filters, search, pagination
- Product detail with gallery, add to cart
- About page with store story
- Contact page with form
- Cart with quantity management
- Checkout (UI only, payments not implemented)

**Features**:
- Dynamic CSS variables from brand colors
- Responsive design (mobile-first)
- SEO metadata and structured data
- Cart state management via Zustand

### 3.6 Product Management

**Single Product Upload**:
- Drag-and-drop image upload (up to 10 images)
- Auto AI extraction when images uploaded
- AI suggests title, description, categories, tags
- Form with pricing, inventory, organization
- Save as draft or publish directly

**Bulk Upload**:
- CSV template download
- Parse and validate CSV
- Match images by filename
- Progress tracking and error reporting

**Product APIs**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products/upload` | POST | Single product with images |
| `/api/products/bulk-upload` | POST | CSV bulk upload |
| `/api/products/bulk-upload` | GET | Download CSV template |
| `/api/products/list` | GET | List with filters, pagination |
| `/api/products/extract` | POST | AI extraction from image |
| `/api/products/[id]` | GET | Get product |
| `/api/products/[id]` | PATCH | Update product |
| `/api/products/[id]` | DELETE | Delete (soft/hard) |
| `/api/products/[id]/publish` | POST | Publish product |
| `/api/products/[id]/publish` | DELETE | Unpublish product |

**Image Processing**:
- Resizes to max 2000x2000 (original)
- Creates 600x600 thumbnails
- JPEG conversion with quality optimization
- Stores in Supabase Storage `product-images` bucket

---

## 4. DATABASE SCHEMA

### Tables

#### `profiles`
```sql
id              UUID PRIMARY KEY (FK → auth.users)
full_name       TEXT
email           TEXT
phone           TEXT
avatar_url      TEXT
role            TEXT ('seller' | 'admin' | 'support')
onboarding_completed    BOOLEAN DEFAULT false
onboarding_current_step INTEGER DEFAULT 0
preferences     JSONB
last_login_at   TIMESTAMPTZ
login_count     INTEGER DEFAULT 0
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `stores`
```sql
id              UUID PRIMARY KEY
owner_id        UUID (FK → profiles)
name            TEXT
slug            TEXT UNIQUE
description     TEXT
tagline         TEXT
logo_url        TEXT
blueprint       JSONB
brand_colors    JSONB
typography      JSONB
theme_template  TEXT
contact_email   TEXT
contact_phone   TEXT
whatsapp_number TEXT
instagram_handle TEXT
facebook_url    TEXT
settings        JSONB
status          TEXT ('draft' | 'active' | 'suspended')
activated_at    TIMESTAMPTZ
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `products`
```sql
id              UUID PRIMARY KEY
store_id        UUID (FK → stores)
title           TEXT
description     TEXT
price           DECIMAL
compare_at_price DECIMAL
cost_per_item   DECIMAL
sku             TEXT
barcode         TEXT
quantity        INTEGER DEFAULT 0
track_quantity  BOOLEAN DEFAULT true
featured        BOOLEAN DEFAULT false
status          TEXT ('draft' | 'published' | 'archived')
categories      TEXT[]
tags            TEXT[]
weight          DECIMAL
requires_shipping BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `product_images`
```sql
id              UUID PRIMARY KEY
product_id      UUID (FK → products)
url             TEXT
thumbnail_url   TEXT
position        INTEGER DEFAULT 0
alt_text        TEXT
created_at      TIMESTAMPTZ
```

### Storage Buckets
- **logos**: Store logo images (`{user_id}/{timestamp}.{ext}`)
- **product-images**: Product images and thumbnails
  - `products/{store_id}/{filename}.jpg` - Original
  - `products/{store_id}/thumbnails/{filename}.jpg` - Thumbnail

---

## 5. API REFERENCE

### Authentication Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/sign-up` | Register new user |
| POST | `/api/auth/sign-in` | Login |
| POST | `/api/auth/sign-out` | Logout |
| GET | `/api/auth/user` | Get current user + store |
| GET | `/api/auth/profile` | Get profile details |

### Onboarding Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/onboarding/start` | Initialize session |
| POST | `/api/onboarding/process` | Process step response |
| POST | `/api/onboarding/extract-category` | AI category extraction |
| POST | `/api/onboarding/suggest-names` | AI name suggestions |
| POST | `/api/onboarding/upload-logo` | Upload logo file |
| POST | `/api/onboarding/generate-blueprint` | Create store + blueprint |
| POST | `/api/onboarding/complete` | Activate store |

### Product Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/products/upload` | Upload product with images |
| POST | `/api/products/bulk-upload` | Bulk CSV upload |
| GET | `/api/products/bulk-upload` | Download CSV template |
| GET | `/api/products/list` | List products (paginated) |
| POST | `/api/products/extract` | AI extract from image |
| GET | `/api/products/[id]` | Get single product |
| PATCH | `/api/products/[id]` | Update product |
| DELETE | `/api/products/[id]` | Delete product |
| POST | `/api/products/[id]/publish` | Publish product |
| DELETE | `/api/products/[id]/publish` | Unpublish product |

### Store Frontend Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/store/[slug]/data` | Get store + products |
| GET | `/api/store/[slug]/products` | Paginated products |
| GET | `/api/store/[slug]/products/[id]` | Single product |

### Order & Payment Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/orders/create` | Create order, reserve inventory, init Razorpay |
| POST | `/api/orders/verify-payment` | Verify Razorpay payment signature |
| POST | `/api/webhooks/razorpay` | Handle Razorpay webhooks |

### Dashboard Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard/stats` | Dashboard statistics (products, store) |
| GET | `/api/dashboard/analytics` | Full analytics (revenue, trends, top products) |
| GET/PATCH | `/api/dashboard/settings` | Store settings CRUD |
| GET | `/api/dashboard/orders` | List orders with filters, pagination |
| GET/PATCH | `/api/dashboard/orders/[orderId]` | Order detail and updates |
| GET | `/api/dashboard/export` | Export orders/products as CSV |

### Search Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/search` | Google Custom Search (params: q, store, page) |
| GET | `/api/search/suggestions` | Autocomplete suggestions (params: q, store, limit) |

---

## 6. CURRENT STATE

### What Works
- ✅ User registration and login (email + Google)
- ✅ Route protection via middleware
- ✅ 10-step onboarding chat UI with progress sidebar
- ✅ AI category extraction from descriptions
- ✅ Logo upload to Supabase Storage
- ✅ Blueprint generation with region defaults
- ✅ Store creation with live building animation
- ✅ Store frontend with 4 theme variants
- ✅ Product upload with AI extraction
- ✅ Bulk product upload via CSV
- ✅ Product management (list, edit, delete, publish)
- ✅ Cart functionality (add, remove, quantity)
- ✅ Order creation with inventory reservation
- ✅ Razorpay payment integration (backend)
- ✅ Payment verification and webhooks
- ✅ Inventory management (reduce/restore on payment)
- ✅ Google Custom Search integration (product search + autocomplete)
- ✅ Seller dashboard with analytics (revenue, orders, top products)
- ✅ Order management UI (list, detail, status updates, tracking)
- ✅ Dashboard settings page
- ✅ Export orders/products to CSV

### Known Issues
- Checkout frontend not yet connected to new backend APIs
- Email notifications are logged only (no actual email service)

### Not Yet Implemented
- Checkout frontend integration with payment APIs
- Email service integration (Resend/SendGrid)
- Admin panel
- Customer management dashboard
- Multi-language support

---

## 7. DEVELOPMENT LOG

> **Instructions**: Add new entries at the TOP with format: `[YYYY-MM-DD HH:MM] - Description`

### Recent Changes

[2026-01-19 18:00] - Implemented Storefront Sidebar Navigation
- **New Components**:
  - `src/lib/contexts/sidebar-context.tsx` - Sidebar state management context
    - `SidebarProvider` component with `isOpen`, `toggle`, `open`, `close`
    - localStorage persistence for desktop state
    - Auto-close on route change (mobile)
    - Keyboard support (Escape to close)
  - `src/components/store/store-sidebar.tsx` - Slide-out sidebar component
    - Shop section: Home, All Products, Categories (collapsible with up to 8 items)
    - Account section: My Orders, Wishlist
    - Help section: Contact Us, Shipping & Returns, FAQ
    - Social links: WhatsApp, Instagram, Facebook
    - Backdrop overlay with click-to-close
    - Smooth slide-in/out animation

- **Updated Theme Headers** (all 4 themes):
  - `src/components/store/themes/modern-minimal/header.tsx`
  - `src/components/store/themes/classic-elegant/header.tsx`
  - `src/components/store/themes/playful-bright/header.tsx`
  - `src/components/store/themes/minimal-zen/header.tsx`
  - Added `onMenuClick` prop to toggle sidebar
  - Hamburger menu now always visible (not just mobile)
  - Removed inline mobile dropdown menus

- **Updated Store Layout** (`src/app/[storeSlug]/layout.tsx`):
  - Wrapped content with `SidebarProvider`
  - Added `StoreSidebar` component to layout

- **Updated Store Header** (`src/components/store/store-header.tsx`):
  - Uses `useSidebar` hook to get toggle function
  - Passes `onMenuClick` to theme-specific headers

- **Responsive Behavior**:
  - Mobile: Sidebar opens as full-height overlay, closes on navigation
  - Desktop: Sidebar toggle in header, state persists in localStorage

[2026-01-19 17:20] - Implemented Discount & Coupon System
- **Database Schema** (`supabase/migrations/006_coupons.sql`):
  - `coupons` table with discount types, usage limits, date restrictions
  - `coupon_usage` table for tracking per-order usage
  - Added `coupon_id`, `coupon_code`, `discount_amount` columns to `orders`
  - RLS policies and `increment_coupon_usage` RPC function

- **Validation Logic** (`src/lib/coupons/validate.ts`):
  - All error cases: expired, inactive, usage limits, minimum order value
  - Discount calculation for percentage, fixed amount, free shipping

- **API Endpoints**:
  - `/api/dashboard/coupons` - List/Create coupons
  - `/api/dashboard/coupons/[id]` - Get/Update/Delete coupon
  - `/api/cart/apply-coupon` - Validate and apply coupon
  - `/api/cart/remove-coupon` - Remove applied coupon

- **Dashboard UI**:
  - `/dashboard/coupons` - List with stats cards and table
  - `/dashboard/coupons/create` - Create form with all options
  - `/dashboard/coupons/[id]` - Edit form
  - Added "Coupons" to sidebar navigation

[2026-01-19 17:05] - Fixed Product Upload AI Integration
- **Issue: AI Description Not Syncing to Form**
  - Fixed `form.setValue()` calls to include `{ shouldDirty: true, shouldValidate: true }`
  - Form fields now properly update when AI suggestions are auto-applied
  
- **New Feature: AI Price Suggestion**
  - Added `/api/products/suggest-price` endpoint using Gemini
  - Shows "Suggest Price with AI" button when price is 0
  - Displays AI-suggested price with "Apply Price" button
  - Includes pricing reasoning from AI

- **Files Modified**:
  - `src/components/products/product-form.tsx` - Fixed setValue, added price suggestion UI
  - Created `src/app/api/products/suggest-price/route.ts` - New AI pricing API

[2026-01-19 23:00] - Fixed Post-Onboarding Store & Product Flow
- **Issue 1: No Re-onboarding Protection**
  - Added check in `/src/app/(dashboard)/onboarding/page.tsx`
  - Users with existing store are redirected to `/dashboard`
  - Shows loading state while checking status

- **Issue 2: Prevent Duplicate Store Creation**
  - Added check in `/src/app/api/onboarding/generate-blueprint/route.ts`
  - Returns error 400 if user already has a store
  - Includes existing store info in error response

- **Issue 3: Made API Queries More Robust**
  - Changed `.single()` to `.limit(1)` with array access in:
    - `/src/app/api/auth/user/route.ts`
    - `/src/app/api/dashboard/stats/route.ts`
  - Queries now order by `created_at DESC` and handle edge cases gracefully

- **One Store Per User Policy**: Users can only create one store; attempting to re-onboard redirects to dashboard

[2026-01-19 22:00] - Implemented Shopify-like Dashboard Redesign
- **New Navigation Structure**:
  - Collapsible sidebar with store header showing logo, name, and status badge
  - Menu items: Home, Products (collapsible), Orders, Analytics, Online Store (collapsible), Settings
  - "View Store" opens store in new tab
  - Persistent expand/collapse state in localStorage

- **New Components Created** (`/src/components/dashboard/`):
  - `welcome-banner.tsx` - Dismissible welcome banner shown after onboarding
  - `nav-section.tsx` - Collapsible navigation section with expand/collapse animation
  - `store-status-card.tsx` - Store overview card with logo and status
  - `ai-suggestions-widget.tsx` - Category-based product suggestions with dismissible tips

- **New Analytics Page** (`/src/app/dashboard/analytics/page.tsx`):
  - Period selector (7d, 30d, 90d, 1y)
  - Revenue trend chart
  - Top selling products
  - Recent orders
  - Low stock alerts

- **Post-Onboarding Flow Changed**:
  - Old: `Onboarding Complete → /{slug}?welcome=true → Store Frontend`
  - New: `Onboarding Complete → /dashboard?welcome=true → Dashboard Home`
  - Welcome banner appears on first visit, dismissible

- **Dashboard Home Page Redesigned**:
  - Welcome banner (when `?welcome=true`)
  - Store status card + quick stats grid
  - AI suggestions widget based on store category
  - Getting started checklist
  - Quick actions cards

- **Updated Files**:
  - `src/components/dashboard/sidebar.tsx` - New Shopify-inspired navigation
  - `src/app/(dashboard)/dashboard/page.tsx` - New layout with welcome flow
  - `src/app/(dashboard)/onboarding/page.tsx` - Changed redirect to dashboard
  - `src/components/onboarding/store-building-preview.tsx` - Updated redirect message
  - `src/app/(dashboard)/layout.tsx` - Pass store data to sidebar
  - `src/app/api/dashboard/stats/route.ts` - Include blueprint in response

[2026-01-19 15:38] - Comprehensive UI Flow Testing
- **Tested Pages**:
  - ✅ Landing Page - Modern design, hero section, CTAs work correctly
  - ✅ Sign Up Page - All fields (name, email, phone, password), Google login, validation
  - ✅ Sign In Page - Email/password fields, forgot password, Google login
  - ✅ Dashboard Access - Protected route correctly redirects to sign-in
  - ⚠️ Store Homepage (`/jaison-herbals`) - Layout works, featured products fail to load
  - ❌ Store Products Page - Shows "No products found" due to database error
  - ✅ Store About Page - Content displays correctly
  - ✅ Store Contact Page - Form and contact info work
  - ✅ Store Cart Page - Empty cart state works
  - ✅ Store Checkout Page - Empty cart redirect works
- **Critical Issue Found**: `Error fetching featured products: Server column product_images_1.url does not exist`
  - Database schema mismatch prevents product display
  - Affects homepage featured products and products page
  - **Fix**: Ensure `product_images` table has `url` column by running migrations
- **Recordings saved** to artifacts directory for visual verification

[2026-01-19 21:00] - Fixed Store Slug Collision Issue in Onboarding
- **Problem**: When a user entered a business name that created a slug already taken by another store (e.g., "My Store" → "my-store"), the system returned an error "Store slug is already taken" instead of handling it gracefully.
- **Solution**: Modified `/src/app/api/onboarding/generate-blueprint/route.ts`:
  - Now checks if the original slug is available in the database
  - If taken, automatically appends a random 4-character suffix (e.g., "my-store" → "my-store-x7k2")
  - Tries up to 10 times to find a unique slug
  - Only shows an error if all attempts fail (extremely unlikely)
- **Result**: Multiple users can now create stores with the same business name, each getting a unique URL automatically.

[2026-01-19 20:00] - Implemented Vercel AI SDK Integration Architecture
- **Provider System** (`/src/lib/ai/provider.ts`):
  - Added Anthropic Claude support alongside Google Gemini
  - `AI_PROVIDER` environment variable for provider selection
  - `getTextModel()`, `getVisionModel()`, `getFastModel()` helpers
  - Confidence thresholds: AUTO_CONFIRM (0.80), AUTO_CONFIRM_REVIEW (0.70)
  - Model selection: Claude Sonnet for complex tasks, Claude Haiku for fast tasks

- **Enhanced Schemas** (`/src/lib/ai/schemas.ts`):
  - `aboutUsSchema` - About Us page content generation
  - `policiesSchema` - Return, shipping, privacy, terms policies
  - `homepageSectionsSchema` - Hero, categories, value props, testimonials
  - `faqSchema` - FAQ generation (10-15 questions)
  - `storeContentSchema` - Complete store content bundle
  - `enhancedProductAnalysisSchema` - Product analysis with price suggestion & SEO
  - `collectionDescriptionSchema` - Collection descriptions
  - `metaDescriptionSchema` - SEO meta tags generation

- **Vercel AI Service** (`/src/lib/ai/vercel-ai-service.ts`):
  - Complete rewrite with provider-agnostic model selection
  - `generateAboutUs()` - AI-generated About Us pages
  - `generatePolicies()` - Store policies with region-specific defaults
  - `generateHomepageSections()` - Homepage content generation
  - `generateFAQs()` - FAQ generation based on store category
  - `generateAllStoreContent()` - Single call for all content (efficient)
  - `analyzeProductImageEnhanced()` - Product analysis with price suggestion & SEO
  - `generateCollectionDescription()` - Collection descriptions
  - `generateMetaDescription()` - SEO meta tags
  - `streamProductDescription()` - Real-time streaming descriptions
  - Auto-apply logic: `shouldAutoApply()`, `shouldAutoApplyWithReview()`, `requiresConfirmation()`

- **New API Endpoints**:
  - `POST /api/onboarding/analyze-brand` - Brand analysis with auto-confirm
  - `POST /api/onboarding/generate-store-content` - Store content generation
  - `POST /api/products/analyze-image` - Enhanced product analysis with price & SEO
  - `POST /api/ai/generate-content` - Generic content generation (collections, meta, FAQs)
  - `POST /api/ai/stream-description` - Streaming product descriptions

- **Blueprint Generator** (`/src/lib/onboarding/blueprint-generator.ts`):
  - `generateStoreContent()` - AI content generation during store creation
  - `generateBlueprintWithContent()` - Blueprint + AI content in one call
  - Store creation now includes AI-generated About Us, policies, homepage, FAQs

- **Updated Onboarding Flow**:
  - Blueprint generation now uses cached AI analysis for tagline
  - AI content generated during store creation
  - Session cache cleared after successful store creation

- **Type Updates**:
  - Added `_ai_brand_colors`, `_ai_tagline`, `_ai_confidence` to StoreData
  - Added `ocr_text` to AIProductSuggestions
  - Extended BulkAction type with all actions

- **Bug Fixes**:
  - Fixed `toDataStreamResponse` → `toTextStreamResponse` in chat API
  - Fixed StoreBlueprint property access (`brand` → `branding`)
  - Fixed Google Vision service type annotations
  - Fixed image processor Buffer type handling

- **New Dependencies**:
  - `@ai-sdk/anthropic` - Anthropic Claude provider for Vercel AI SDK

- **New Environment Variables**:
  - `AI_PROVIDER` - 'anthropic' | 'google' (default: 'google')
  - `ANTHROPIC_API_KEY` - Anthropic API key (required if using Claude)

[2026-01-19 18:00] - Implemented Slice 7: Seller Dashboard Frontend
- **Dashboard Analytics Components** (`/src/components/dashboard/`):
  - `revenue-chart.tsx` - Interactive area chart with Recharts
    - Revenue trend visualization with gradient fill
    - Custom tooltip showing date, revenue, orders
    - Responsive design
  - `top-products-table.tsx` - Top selling products list
    - Product image, title, quantity sold, revenue
    - Empty state when no sales data
  - `recent-orders-table.tsx` - Recent orders list
    - Order number, customer, status badges, amounts
    - Clickable links to order details
    - "View all orders" link
  - `low-stock-alert.tsx` - Inventory alert banner
    - Out of stock items (red)
    - Low stock items with remaining quantity
    - Link to inventory management

- **UI Components** (`/src/components/ui/`):
  - `alert.tsx` - Alert component for notifications (Shadcn style)
  - `tabs.tsx` - Tabs component for filtering (Radix UI)

- **Orders Management** (`/src/app/dashboard/orders/`):
  - `page.tsx` - Orders list page
    - Search by order # or customer name
    - Filter by status (tabs: all, pending, confirmed, processing, shipped, delivered, cancelled)
    - Sortable, paginated table with responsive design
    - Export to CSV functionality
    - Refresh button with loading state
  - `[orderId]/page.tsx` - Order detail page
    - Order items with images and pricing breakdown
    - Customer information (name, email, phone)
    - Payment details (method, status, Razorpay ID, paid date)
    - Shipping address display
    - Update order status dropdown
    - Courier selection and tracking number input
    - Order timeline showing key events
    - Print invoice button (placeholder)

- **New Dependencies**:
  - `recharts` - Charting library for analytics
  - `@radix-ui/react-tabs` - Tabs component

- **Testing Results**:
  - Dashboard Home: 200 OK
  - Orders Page: 200 OK
  - Products Page: 200 OK
  - No TypeScript compilation errors

[2026-01-19 17:00] - Implemented Slice 7: Seller Dashboard Backend
- **Analytics API** (`/src/app/api/dashboard/analytics/route.ts`):
  - Overview stats: revenue, orders, products, AOV
  - Trends: daily revenue and order counts
  - Top products by sales
  - Recent orders list
  - Low stock products alert
- **Orders API** (`/src/app/api/dashboard/orders/route.ts`):
  - List orders with filtering (status, search, date range)
  - Pagination support
- **Order Detail API** (`/src/app/api/dashboard/orders/[orderId]/route.ts`):
  - GET: Fetch order with items and shipping
  - PATCH: Update status, tracking, courier
- **Export API** (`/src/app/api/dashboard/export/route.ts`):
  - Export orders/products as CSV
  - Dynamic column detection
- **Order Types** (`/src/lib/types/order.ts`):
  - Added OrderStatus badge types
  - Shipping address interface
- **Order Status Badge** (`/src/components/orders/order-status-badge.tsx`):
  - Color-coded status badges
  - Payment status badges

[2026-01-19 15:00] - Implemented Enhanced AI Integration
- **Phase 1: Unified AI Service Foundation**
  - `/src/lib/ai/unified-ai-service.ts` - Batched AI service that reduces API calls by 50-75%
    - `analyzeBusinessForOnboarding()` - Single call returns category + names + colors + tagline
    - `analyzeProductImage()` - Single call returns title, description, categories, tags, OCR, quality
    - `extractLogoColors()` - Extract dominant colors from logo images
    - Auto-apply logic for high confidence (>80%) suggestions
  - `/src/lib/ai/ai-cache.ts` - Caching layer with session and content-based caching
    - Prevents duplicate API calls on page refresh
    - 1-hour TTL with max 100 entries
  - `/src/lib/ai/prompts/unified-prompts.ts` - Optimized prompts for batched operations

- **Phase 2: Google Cloud Vision Integration**
  - `/src/lib/ai/google-vision-service.ts` - Cloud Vision API integration
    - `extractText()` - OCR text extraction from product images
    - `detectObjects()` - Object detection for background removal
    - `moderateImage()` - Safe search detection for inappropriate content
    - `extractColors()` - Dominant color extraction for logos
    - `analyzeImage()` - Comprehensive analysis combining all features

- **Phase 3: Enhanced Image Processing**
  - Updated `/src/lib/products/image-processor.ts`:
    - `analyzeImageQuality()` - Quality scoring, blur detection, brightness analysis
    - `enhanceProductImage()` - Auto-rotate, normalize, brightness adjust, sharpen
    - `removeBackground()` - Object detection + crop to white background
  - `/src/lib/products/processing-pipeline.ts` - Full processing orchestration
    - Stages: upload → safe-search → quality → enhance → background → OCR → AI → thumbnails
    - Progress tracking for UI feedback

- **Phase 4: Onboarding Enhancements**
  - Updated `/src/app/api/onboarding/process/route.ts`:
    - Uses unified AI for single-call analysis on description step
    - Caches all AI results (category, names, colors, tagline) for session
    - Returns AI suggestions with each step response
  - Updated `/src/components/onboarding/chat.tsx`:
    - Shows AI store name suggestions as clickable chips
    - Shows AI color suggestions with preview swatches
    - Auto-fills color picker with AI-suggested primary color

- **Phase 5: Product Upload Enhancements**
  - `/src/app/api/products/extract-enhanced/route.ts` - Enhanced extraction endpoint
    - Full pipeline: enhance → OCR → background removal → AI analysis
    - Returns processed images as base64 for preview
    - Safe search validation blocks inappropriate images
  - Updated `/src/components/products/product-form.tsx`:
    - Auto-triggers enhanced extraction when images uploaded
    - Shows processing stages with progress indicator
    - Auto-applies suggestions if confidence > 80%
    - Displays image enhancement and quality info
  - Updated `/src/components/products/ai-suggestions.tsx`:
    - Shows detected attributes (color, material, style)
    - Displays OCR-extracted text from images
    - Auto-apply indicator for high-confidence results
  - `/src/components/products/processing-status.tsx` - Processing UI component
  - Updated `/src/app/api/products/upload/route.ts`:
    - Uses unified AI service for better extraction
    - Returns enhanced data (attributes, OCR text)

- **New Dependencies**:
  - `@google-cloud/vision` - Google Cloud Vision SDK

- **New Environment Variables Required**:
  - `GOOGLE_CLOUD_PROJECT_ID` - Google Cloud project ID
  - `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON
  - OR `GOOGLE_CLOUD_CREDENTIALS` - Inline JSON credentials

[2026-01-18 19:00] - Implemented Google Custom Search Integration
- **Search API Route** (`/src/app/api/search/route.ts`):
  - Google Custom Search API integration
  - Store-specific search with site restriction
  - Price extraction from snippets (INR, USD, EUR formats)
  - Product ID extraction from URLs
  - Pagination support (10 results per page, max 100)
- **Search Suggestions API** (`/src/app/api/search/suggestions/route.ts`):
  - Autocomplete based on product titles
  - Category suggestions from product data
  - Store-specific filtering
- **Search Utility Library** (`/src/lib/search/google-search.ts`):
  - In-memory caching with 1-hour TTL
  - `searchProducts()` - Search with caching
  - `getSearchSuggestions()` - Autocomplete suggestions
  - Cache management functions
- **useDebounce Hook** (`/src/lib/hooks/use-debounce.ts`):
  - Generic debounce hook for search input
  - Configurable delay (default 300ms)
- **SearchBar Component** (`/src/components/search/search-bar.tsx`):
  - Debounced search input
  - Autocomplete dropdown with keyboard navigation
  - Loading and clear states
  - Store-specific or global search
- **SearchResultCard Component** (`/src/components/search/search-result-card.tsx`):
  - Product result card with image, title, snippet, price
  - Responsive design
- **Search Results Page** (`/src/app/[storeSlug]/search/page.tsx`):
  - Client-side search with URL state
  - Pagination controls
  - Empty and error states
  - Filter button (placeholder for future)
- **New Environment Variables Required**:
  - `GOOGLE_CUSTOM_SEARCH_API_KEY` - Google API key
  - `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` - Custom Search Engine ID

[2026-01-18 10:00] - Implemented Slice 6: Checkout & Payment System Backend
- **Order Types** (`/src/lib/types/order.ts`):
  - Complete TypeScript types for orders, order items, shipping address
  - Razorpay-specific types (RazorpayOrder, RazorpayPayment, RazorpayRefund)
  - Request/Response types for order creation and payment verification
- **Razorpay Integration** (`/src/lib/payment/razorpay.ts`):
  - Lazy-initialized Razorpay client (avoids build-time errors)
  - `createRazorpayOrder()` - Create payment order
  - `verifyRazorpaySignature()` - Verify payment signature
  - `verifyWebhookSignature()` - Validate webhook requests
  - `refundPayment()` - Process refunds
  - Additional utility functions for payment management
- **Inventory Management** (`/src/lib/orders/inventory.ts`):
  - `reduceInventory()` - Decrease stock after payment
  - `restoreInventory()` - Restore stock on cancellation/refund
  - `checkStockAvailability()` - Verify stock before order
  - `reserveInventory()` - Prevent overselling during checkout
  - `releaseReservation()` - Release reservations after completion
  - `getEffectiveAvailability()` - Get available quantity minus reservations
- **Email Notifications** (`/src/lib/email/order-confirmation.ts`):
  - `sendOrderConfirmationEmail()` - HTML email generation (placeholder)
  - `sendOrderShippedEmail()`, `sendOrderCancelledEmail()`, `sendRefundProcessedEmail()`
  - Ready for integration with email service (Resend, SendGrid, etc.)
- **Order Creation API** (`/src/app/api/orders/create/route.ts`):
  - Validates cart items against database
  - Creates order with pending status
  - Reserves inventory to prevent overselling
  - Initializes Razorpay order for online payments
  - Handles COD orders (auto-confirmed)
- **Payment Verification API** (`/src/app/api/orders/verify-payment/route.ts`):
  - Verifies Razorpay payment signature
  - Updates order status to paid/confirmed
  - Reduces inventory and releases reservations
  - Sends confirmation email
- **Razorpay Webhook Handler** (`/src/app/api/webhooks/razorpay/route.ts`):
  - Validates webhook signatures
  - Handles `payment.captured` - Confirms order, reduces inventory
  - Handles `payment.failed` - Cancels order, releases inventory
  - Handles `refund.created/processed/failed` - Manages refunds
- **Database Migration** (`/supabase/migrations/006_orders.sql`):
  - `orders` table with customer details, shipping, pricing, payment info
  - `order_items` table with product snapshots
  - `refunds` table for tracking refunds
  - `inventory_reservations` table for preventing overselling
  - RLS policies for store owners and service role
  - Helper functions: `get_order_stats()`, `cleanup_expired_reservations()`
  - Triggers for automatic timestamp updates

[2026-01-17 12:00] - Updated Dashboard & Settings Pages
- **Dashboard Homepage** (`/src/app/(dashboard)/dashboard/page.tsx`):
  - Fetches real store and product data via `/api/dashboard/stats`
  - Shows store card with logo, name, and live status
  - Displays product counts (total, published, drafts)
  - Getting started checklist with progress bar
  - Quick action cards for common tasks
  - View Store button opens store in new tab
- **Settings Page** (`/src/app/dashboard/settings/page.tsx`):
  - Store information editing (name, tagline, description)
  - Contact details (email, phone, WhatsApp, Instagram)
  - Brand color customization
  - Shipping settings (free threshold, flat rate, COD)
  - Checkout options (guest checkout, phone required)
  - Payment method status display
- **New API Endpoints**:
  - `GET /api/dashboard/stats` - Dashboard statistics
  - `GET/PATCH /api/dashboard/settings` - Store settings
- **RLS Policy Fix** (`/supabase/fix-policies.sql`):
  - Fixed infinite recursion in stores table policies
  - Added SECURITY DEFINER helper functions
  - Ensured product_images table exists

[2026-01-17 11:00] - Implemented Slice 5: Shopping Cart Frontend
- **MiniCart Component** (`/src/components/store/mini-cart.tsx`):
  - Dropdown cart accessible from header
  - Shows cart items with images, titles, prices
  - Quantity controls (+/- buttons) and remove functionality
  - Subtotal display with "View Cart" and "Checkout" buttons
  - Click outside and Escape key to close
  - Empty cart state with "Start Shopping" link
- **AddToCartButton Component** (`/src/components/store/add-to-cart-button.tsx`):
  - Three variants: `default`, `compact`, `icon-only`
  - Shows quantity controls when item is in cart
  - Loading and "just added" states with animations
  - Out of stock state handling
  - Toast notifications on add to cart
- **Cart Page Validation** (`/src/components/store/store-cart-page.tsx`):
  - Backend validation before checkout via `/api/cart/validate`
  - Loading state during validation
  - Displays validation errors (out of stock, etc.)
  - Only proceeds to checkout if cart is valid
- **Updated Theme Headers**:
  - All 4 theme headers now use MiniCart component
  - modern-minimal, classic-elegant, playful-bright, minimal-zen

[2026-01-17 10:00] - Implemented Slice 5: Shopping Cart Backend
- **New Types** (`/src/lib/types/cart.ts`):
  - `CartItemInput` - Minimal cart item for API requests
  - `ValidatedCartItem` - Full validated item with product, issues
  - `CartTotals` - Subtotal, shipping, tax, discount, total
  - `CartValidationResult`, `InventoryCheckResult` - API responses
- **Cart Calculations** (`/src/lib/cart/calculations.ts`):
  - `calculateSubtotal()` - Sum of item subtotals
  - `calculateShipping()` - Free shipping threshold, flat rate, COD fee
  - `calculateTax()` - Placeholder for GST (returns 0)
  - `calculateDiscount()` - Placeholder for coupons (returns 0)
  - `calculateCartTotal()` - Complete cart total calculation
  - Helper functions: `formatPrice`, `amountToFreeShipping`
- **Cart Validation** (`/src/lib/cart/validation.ts`):
  - Zod schemas for request validation
  - `validateCartItems()` - Verifies products exist, published, in stock
  - `checkInventory()` - Quick stock availability check
  - `verifyStore()` - Confirms store exists and is active
- **API Endpoints**:
  - `POST /api/cart/validate` - Full cart validation with totals
  - `POST /api/cart/check-inventory` - Quick inventory check
- Client-side cart unchanged (localStorage in `store-context.tsx`)

[2026-01-16 20:00] - Fixed Build My Store Error and Products Upload
- **Onboarding Validation Fixes**:
  - Made `business_type` optional with 'General' default in storeDataSchema
  - Relaxed phone validation to accept 10-15 digits (international support)
  - Added proper handling for empty strings in optional fields (whatsapp, instagram, gstin)
  - Added pre-processing in generate-blueprint endpoint to ensure defaults
- **API Fix**: Updated `/api/auth/user` to return store information for products page
- **TypeScript Fixes**:
  - Fixed type error in bulk-upload route (imageUrl handling)
  - Fixed duplicate 'success' property in bulk-upload response
  - Fixed product-form schema to use required types for form defaults
  - Fixed sanitizeProductData generic type issues
- **Storage Policies**: Updated `setup.sql` with active storage policies for:
  - `logos` bucket (view, upload, delete)
  - `product-images` bucket (view, upload, update, delete)
- All TypeScript builds pass successfully

[2026-01-16 19:00] - Fixed Missing UI Components and Database RLS Policies
- Created `/components/ui/switch.tsx` - Radix UI switch component
- Created `/components/ui/textarea.tsx` - Textarea component
- Created `/components/ui/dialog.tsx` - Radix UI dialog component
- Created `/components/ui/select.tsx` - Radix UI select component
- Created `/lib/hooks/use-toast.ts` - Toast hook using Sonner
- Added npm packages: `@radix-ui/react-switch`, `@radix-ui/react-dialog`, `@radix-ui/react-select`
- **CRITICAL FIX**: Fixed infinite recursion in RLS policies for `stores` table
  - Split "FOR ALL" policy into separate SELECT/INSERT/UPDATE/DELETE policies
  - Combined public view and owner view into single SELECT policy with OR condition
  - Fixed `products` and `product_images` policies to avoid recursion
- User must re-run `/supabase/setup.sql` in Supabase SQL Editor to apply fixes

[2026-01-16 18:00] - Implemented Slice 4 Frontend: Product Upload UI
- Created `/components/products/image-uploader.tsx` - Drag-drop with reordering
- Created `/components/products/ai-suggestions.tsx` - AI suggestions panel
- Created `/components/products/product-card.tsx` - Product card for lists
- Created `/components/products/product-form.tsx` - Complete product form
- Created `/components/products/bulk-upload-modal.tsx` - CSV bulk upload
- Created `/app/dashboard/products/page.tsx` - Products list with filters
- Created `/app/dashboard/products/new/page.tsx` - Add product page
- Created `/app/api/products/extract/route.ts` - AI extraction endpoint
- Added `@radix-ui/react-progress` and `react-dropzone` dependencies
- Features: grid/list view toggle, search, status/category filters, pagination

[2026-01-16 17:00] - Implemented Slice 4 Backend: Product Upload System
- Created `/lib/products/validation.ts` - Zod schemas for products
- Created `/lib/ai/product-extractor.ts` - Gemini vision for product extraction
- Created `/lib/products/image-processor.ts` - Sharp image processing
- Created `/lib/products/db-operations.ts` - Product CRUD operations
- Created `/lib/products/csv-parser.ts` - CSV parsing for bulk upload
- Created product API routes: upload, bulk-upload, list, [id], [id]/publish
- Added `sharp` and `papaparse` dependencies
- Updated `setup.sql` with product-images storage bucket

[2026-01-16 16:00] - Changed onboarding completion flow:
- Changed step 10 from "product_readiness" to "build_store" action
- Created `/components/onboarding/store-building-preview.tsx`
- Shows animated progress steps during store creation
- Displays live store preview with brand colors
- Shows blueprint summary after completion
- Redirects to `/{slug}` instead of dashboard

[2026-01-16 14:30] - Fixed Slice 3 Store Frontend & Redirect Flow:
- Created database migrations for all tables
- Fixed onboarding to return slug and redirect to store
- Fixed CSS variable light color generation for dark primary colors
- Fixed store layout CSS variable application
- Fixed TypeScript errors in cache.ts and seo.ts

[2026-01-16 10:30] - Implemented improved user flow:
- Updated homepage with "AI Store" branding
- Added Google Sign-in to authentication
- Created progress sidebar for onboarding
- Updated all branding from "AI Store Builder" to "AI Store"

[2026-01-15 17:45] - Created CLAUDE.md documentation file

[2026-01-15 17:00] - Implemented Slice 2: Conversational Onboarding Backend
- Created AI agent with Zod validation
- Defined 10-step onboarding flow
- Built all 7 onboarding API endpoints
- Created blueprint generator with region defaults

---
## 9. NEXT STEPS (Planned Features)

### Immediate Priority
- [x] Order management system ✅
- [x] Payment integration (Razorpay for India) ✅
- [ ] Email notifications (order confirmation) - service integration pending
- [ ] Checkout frontend integration with payment APIs

### Short-term
- [x] Dashboard analytics overview ✅
- [x] Inventory alerts ✅
- [ ] Customer management dashboard
- [ ] Invoice generation (PDF)

### Long-term
- [ ] Multi-language support
- [ ] Admin panel
- [ ] Mobile app

---


### Key Types
```typescript
// StoreData - Collected during onboarding
interface StoreData {
  business_name: string
  slug: string
  description: string
  business_type: string
  business_category: string[]
  niche: string
  target_geography: 'local' | 'india' | 'international'
  brand_vibe: 'modern' | 'classic' | 'playful' | 'minimal'
  primary_color: string
  contact_email: string
  contact_phone: string
  // ... more fields
}

// Product - Store product
interface Product {
  id: string
  store_id: string
  title: string
  description: string
  price: number
  compare_at_price?: number
  quantity: number
  track_quantity: boolean
  featured: boolean
  status: 'draft' | 'published' | 'archived'
  images: ProductImage[]
  categories?: string[]
  tags?: string[]
}

// AI Product Suggestions
interface AIProductSuggestions {
  ai_suggested_title: string
  ai_suggested_description: string
  ai_suggested_category: string[]
  ai_suggested_tags: string[]
  confidence: number
}
```

### Validation Patterns
- **Indian Phone**: `/^[6-9]\d{9}$/`
- **Hex Color**: `/^#[0-9A-Fa-f]{6}$/`
- **GSTIN**: `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`

### Dependencies Added
```json
{
  "sharp": "image processing",
  "papaparse": "CSV parsing",
  "react-dropzone": "drag-drop file upload",
  "@radix-ui/react-progress": "progress bar component",
  "@radix-ui/react-tabs": "tabs component for filtering",
  "@google-cloud/vision": "Google Cloud Vision API for OCR and image analysis",
  "recharts": "charts library for analytics dashboard",
  "date-fns": "date formatting utilities"
}
```

---

*Last Updated: 2026-01-19 21:00*
