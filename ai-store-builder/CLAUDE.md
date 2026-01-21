# CLAUDE.md - AI Store Builder (StoreForge)

## Project Overview

**StoreForge** - Full-stack Next.js e-commerce platform with AI-assisted store creation for Indian merchants.

### Tech Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS 4, Radix UI, Shadcn UI
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Vercel AI SDK (Google Gemini + Claude)
- **Payments**: Razorpay (UPI, cards, COD)
- **Shipping**: Shiprocket

### Core Features
- 10-step conversational onboarding with AI analysis
- 4 store themes (modern, classic, playful, minimal)
- AI product analysis from images (title, description, price suggestion)
- Product variants (size/color/material)
- Demo products on new stores (auto-removed on first upload)
- Dynamic color contrast for accessibility
- GST invoices, coupons, reviews, collections

---

## Architecture

```
src/
├── app/
│   ├── (auth)/           # Sign-in, sign-up
│   ├── dashboard/        # Products, orders, analytics, settings
│   ├── [storeSlug]/      # Public storefront
│   └── api/              # API routes
├── components/
│   ├── ui/               # Shadcn components
│   ├── dashboard/        # Dashboard components
│   ├── store/            # Storefront themes
│   └── products/         # Product forms, uploaders
├── lib/
│   ├── ai/               # vercel-ai-service.ts, schemas
│   ├── store/            # queries.ts, dynamic-styles.ts
│   ├── payment/          # razorpay.ts
│   └── shipping/         # shiprocket.ts
└── middleware.ts
```

### Key Files
| File | Purpose |
|------|---------|
| `lib/ai/vercel-ai-service.ts` | All AI operations |
| `lib/store/queries.ts` | Database queries for store/products |
| `lib/store/dynamic-styles.ts` | Theme CSS variables + contrast colors |
| `app/api/onboarding/complete/route.ts` | Store activation + AI content generation |
| `app/api/products/upload/route.ts` | Product creation with AI analysis |

---

## Database

### Main Tables
- **stores** - Config, blueprint (JSONB), policies, settings
- **products** - Details, pricing, `is_demo` flag for demo products
- **product_variants** - SKU combinations with per-variant pricing
- **orders** / **order_items** - With Shiprocket tracking fields
- **collections**, **coupons**, **product_reviews**

### Storage Buckets
- `logos` - Store logos
- `product-images` - Product images + thumbnails

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Shipping
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=
```

---

## Recent Changes

| Date | Change |
|------|--------|
| 2026-01-21 | AI store personalization (About Us, tagline auto-generation) |
| 2026-01-21 | Demo products system + color contrast fix |
| 2026-01-21 | Rebuild store option in settings |
| 2026-01-20 | Order auto-refund, variants storefront, 2FA |
| 2026-01-20 | Collections, data export, pincode checker |
| 2026-01-19 | Shiprocket integration, AI image enhancement |

---

## Pending
- Email service integration (templates ready in `lib/email/`)
- Admin panel for platform management
- Multi-language support

*Last Updated: 2026-01-21*
