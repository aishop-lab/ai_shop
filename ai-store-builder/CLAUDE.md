# CLAUDE.md - AI Store Builder Project Context

> **IMPORTANT**: After completing code changes, update this file:
> 1. Add entry to **DEVELOPMENT LOG** with timestamp
> 2. Update relevant sections if features/APIs changed

---

## 1. PROJECT OVERVIEW

**AI Store Builder** - Full-stack Next.js e-commerce platform with AI-assisted store creation.

### Core Features
- 10-step conversational onboarding with AI category extraction
- 4 customizable store themes (modern, classic, playful, minimal)
- Product management with AI image extraction and enhancement
- Product variants (size/color/material with per-variant pricing)
- Razorpay payments + COD support
- Shiprocket shipping integration
- Coupon system, refunds, reviews
- Marketing pixels (FB, GA4, Google Ads)
- Invoice PDF generation with GST

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| UI | Tailwind CSS 4, Radix UI, Shadcn UI |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Vercel AI SDK (Google Gemini + Claude) |
| Payments | Razorpay |
| Shipping | Shiprocket |

### Current Status
All core features complete. Pending: Email service integration (templates ready), Admin panel, Multi-language.

---

## 2. ARCHITECTURE

### Directory Structure
```
src/
├── app/
│   ├── (auth)/              # Sign-in, sign-up pages
│   ├── (dashboard)/         # Protected: dashboard, onboarding
│   ├── dashboard/           # Products, orders, analytics, settings
│   ├── [storeSlug]/         # Public storefront (dynamic)
│   └── api/                 # All API routes
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── dashboard/           # Dashboard-specific
│   ├── onboarding/          # Chat UI, progress, preview
│   ├── products/            # Forms, uploaders, variants
│   ├── store/               # Themes, product cards
│   └── ...                  # orders, shipping, reviews, etc.
├── lib/
│   ├── ai/                  # AI services, schemas
│   ├── supabase/            # Client, server, middleware
│   ├── onboarding/          # Flow, blueprint generator
│   ├── payment/             # Razorpay
│   ├── shipping/            # Shiprocket
│   ├── types/               # TypeScript types
│   └── ...                  # cart, coupons, orders, etc.
└── middleware.ts            # Route protection
```

### Key Files
| File | Purpose |
|------|---------|
| `lib/ai/vercel-ai-service.ts` | All AI operations |
| `lib/onboarding/flow.ts` | 10 onboarding steps |
| `lib/payment/razorpay.ts` | Payment integration |
| `lib/shipping/shiprocket.ts` | Shipping API client |
| `lib/orders/inventory.ts` | Stock management |
| `lib/store/queries.ts` | Store/product queries |
| `lib/types/variant.ts` | Variant type definitions |

---

## 3. KEY FEATURES

### Onboarding (10 Steps)
1. business_name → 2. description (AI analysis) → 3. category_confirmation → 4. target_geography → 5. logo_url → 6. brand_vibe → 7. primary_color → 8. contact_info → 9. gstin → 10. build_store

After completion: Redirects to `/dashboard?welcome=true`

### Product Variants
- Options: Size, Color, Material with customizable values
- Per-variant: price, SKU, inventory tracking
- Storefront: variant selector with dynamic pricing
- Fully integrated with cart and checkout

### Orders & Payments
- Razorpay integration with webhooks
- COD support (auto-confirmed)
- Auto-refund on cancellation (paid orders)
- Inventory restoration on cancel
- Invoice PDF with GST breakdown

### Shipping (Shiprocket)
- Create shipments, generate AWB
- Track shipments, schedule pickups
- Pincode serviceability check
- Webhook status updates with email notifications

---

## 4. DATABASE

### Main Tables
- **profiles** - User data, 2FA settings
- **stores** - Store config, blueprint (JSONB), settings
- **products** - Details, pricing, inventory, has_variants flag
- **product_variant_options** / **product_variant_option_values** - Variant definitions
- **product_variants** - SKU combinations with pricing
- **orders** / **order_items** - Order data with Shiprocket fields
- **collections** / **collection_products** - Product groupings
- **coupons** / **coupon_usage** - Discount system
- **product_reviews** / **review_votes** - Review system

### Storage Buckets
- **logos** - Store logos
- **product-images** - Product images + thumbnails

---

## 5. API REFERENCE

### Auth
| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/sign-up` | Register |
| `POST /api/auth/sign-in` | Login |
| `GET /api/auth/user` | Current user + store |
| `POST /api/auth/2fa/{setup,verify,disable}` | 2FA management |

### Products
| Endpoint | Purpose |
|----------|---------|
| `POST /api/products/upload` | Create product |
| `GET/PATCH/DELETE /api/products/[id]` | CRUD |
| `GET/POST /api/products/[id]/variants` | Variant management |
| `GET /api/products/[id]/reviews` | Product reviews |

### Orders
| Endpoint | Purpose |
|----------|---------|
| `POST /api/orders/create` | Create order + Razorpay |
| `POST /api/orders/verify-payment` | Verify payment |
| `GET /api/orders/[orderId]/invoice` | Download PDF invoice |
| `GET/PATCH/DELETE /api/dashboard/orders/[orderId]` | Order management |
| `POST /api/dashboard/orders/[orderId]/refund` | Process refund |

### Shipping
| Endpoint | Purpose |
|----------|---------|
| `POST /api/shipping/create-shipment` | Generate AWB |
| `GET /api/shipping/track` | Track shipment |
| `POST /api/shipping/check-pincode` | Check serviceability |
| `POST /api/webhooks/shiprocket` | Status updates |

### Store Frontend
| Endpoint | Purpose |
|----------|---------|
| `GET /api/store/[slug]/data` | Store + products |
| `GET /api/store/[slug]/collections` | Collections list |

---

## 6. ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
AI_PROVIDER=google  # or 'anthropic'
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=

# Google Cloud (Vision, Imagen)
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Shipping (optional)
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=

# Email (optional)
RESEND_API_KEY=
```

---

## 7. DEVELOPMENT LOG

> Format: `[YYYY-MM-DD] - Brief description`

### Recent Changes

[2026-01-20] - Order cancellation auto-refund, shipment email notifications, cancelled order email template
[2026-01-20] - Product variants storefront integration (queries.ts now fetches variant data)
[2026-01-20] - Quick wins: onboarding progress bar, AI confidence badges, 2FA, traffic widget, color accessibility
[2026-01-20] - One-click data export (ZIP), pincode checker, collections system
[2026-01-19] - AI image enhancement (Vertex Imagen), Shiprocket integration
[2026-01-19] - Logo color extraction, AI logo generation
[2026-01-19] - Marketing pixels (FB, GA4), refund management UI
[2026-01-19] - Storefront sidebar, coupon system, dashboard redesign
[2026-01-19] - Vercel AI SDK integration, product upload fixes

---

*Last Updated: 2026-01-20*
