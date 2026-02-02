# CLAUDE.md - AI Store Builder (StoreForge)

## Project Overview

**StoreForge** - Full-stack Next.js e-commerce platform with AI-assisted store creation for Indian merchants. Production-ready with subdomain routing (`{store}.storeforge.site`).

### Tech Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS 4, Radix UI, Shadcn UI
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI**: Vercel AI SDK (Google Gemini 2.0 Flash + Claude)
- **Payments**: Razorpay (UPI, cards, COD) with per-store credentials
- **Shipping**: Shiprocket
- **Email**: Resend + React Email templates

### Core Features
- 10-step conversational onboarding with AI analysis
- 4 store themes (modern, classic, playful, minimal)
- AI product analysis from images (title, description, price suggestion)
- AI-powered product recommendations ("You might also like", "Frequently bought together")
- Product variants (size/color/material)
- Demo products on new stores (auto-removed on first upload)
- Dynamic color contrast for accessibility
- GST invoices, coupons, reviews, collections
- Subdomain-based store routing
- Real-time merchant notifications
- Rate limiting & webhook security
- Customer accounts with order history, addresses, wishlist
- Abandoned cart recovery with 3-email sequence
- WhatsApp order notifications (MSG91)
- Per-store Razorpay integration (merchants use their own payment accounts)

---

## Architecture

```
src/
├── app/
│   ├── (auth)/           # Sign-in, sign-up
│   ├── (marketing)/      # Landing page for storeforge.site
│   ├── dashboard/        # Products, orders, analytics, settings
│   ├── [storeSlug]/      # Public storefront + sitemap.xml + robots.txt
│   └── api/              # 85+ API routes
├── components/
│   ├── ui/               # Shadcn components
│   ├── dashboard/        # Dashboard + notification-bell
│   ├── store/            # Storefront themes
│   ├── products/         # Product forms, uploaders
│   └── error-boundary.tsx
├── lib/
│   ├── ai/               # vercel-ai-service.ts, recommendations.ts, schemas
│   ├── store/            # queries.ts, dynamic-styles.ts
│   ├── customer/         # auth.ts (customer authentication)
│   ├── cart/             # abandoned-cart.ts (recovery system)
│   ├── payment/          # razorpay.ts (per-store credentials support)
│   ├── encryption.ts     # AES-256-GCM for sensitive credentials
│   ├── shipping/         # shiprocket.ts
│   ├── whatsapp/         # msg91.ts (WhatsApp notifications)
│   ├── email/            # Email service + merchant notifications
│   ├── contexts/         # auth-context.tsx, customer-context.tsx
│   ├── rate-limit.ts     # API rate limiting
│   ├── webhook-security.ts # Razorpay/Shiprocket verification
│   ├── notifications.ts  # Supabase realtime notifications
│   ├── logger.ts         # Structured JSON logging
│   └── errors.ts         # Custom error classes
├── emails/               # React Email templates
├── middleware.ts         # Auth + subdomain routing
└── vercel.json           # Production deployment config
```

### Key Files
| File | Purpose |
|------|---------|
| `lib/ai/vercel-ai-service.ts` | All AI operations (Gemini 2.0 Flash) |
| `lib/store/queries.ts` | Database queries + `getStoreUrl()` helper |
| `lib/store/dynamic-styles.ts` | Theme CSS variables + contrast colors |
| `lib/rate-limit.ts` | Rate limiting (100/min API, 10/min AI, 5/min auth) |
| `lib/notifications.ts` | Real-time notifications via Supabase |
| `lib/webhook-security.ts` | Razorpay signature + Shiprocket IP verification |
| `middleware.ts` | Subdomain detection + auth protection |
| `app/api/onboarding/complete/route.ts` | Store activation + AI content generation |
| `app/api/shipping/calculate/route.ts` | Real-time shipping cost calculation |
| `lib/encryption.ts` | AES-256-GCM encryption for Razorpay secrets |
| `app/api/dashboard/settings/razorpay/route.ts` | Per-store Razorpay credential management |

---

## Database

### Main Tables (20+)
- **stores** - Config, blueprint (JSONB), policies, settings, cart_recovery_settings, razorpay_credentials
- **products** - Details, pricing, `is_demo` flag for demo products
- **product_variants** - SKU combinations with per-variant pricing
- **orders** / **order_items** - With Shiprocket tracking, customer_id link
- **collections**, **coupons**, **product_reviews**
- **notifications** - Merchant alerts (new orders, low stock, etc.)
- **profiles** - Merchant profiles with 2FA settings
- **customers** - Store-specific customer accounts
- **customer_addresses** - Saved shipping addresses
- **customer_sessions** - Customer auth sessions
- **wishlists** - Customer product favorites
- **abandoned_carts** - Cart recovery with email sequence tracking
- **cart_recovery_emails** - Recovery email analytics

### Storage Buckets
- `logos` - Store logos (AI-generated supported)
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

# Payments (Platform defaults - merchants can override with their own)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CREDENTIALS_ENCRYPTION_KEY=  # 32-byte base64 key for encrypting merchant secrets

# Shipping
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=

# Email (Resend)
RESEND_API_KEY=

# WhatsApp (MSG91)
MSG91_AUTH_KEY=
MSG91_WHATSAPP_INTEGRATED_NUMBER=

# Cron Jobs
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://storeforge.site
```

---

## Recent Changes

| Date | Change |
|------|--------|
| 2026-02-03 | **Per-Store Razorpay**: Merchants can configure their own Razorpay credentials for direct settlement |
| 2026-01-26 | **AI Recommendations**: Product similarity, "frequently bought together", personalized recommendations |
| 2026-01-26 | **Abandoned Cart Recovery**: Cart persistence, 3-email recovery sequence, cron job |
| 2026-01-26 | **Customer Accounts**: Registration, login, order history, saved addresses, wishlist |
| 2026-01-26 | **WhatsApp Notifications**: Order confirmation, shipping, delivery via MSG91 |
| 2026-01-26 | **Email Service Complete**: Welcome email on onboarding, low stock cron, delivery triggers |
| 2026-01-26 | **Production Infrastructure**: Subdomain routing, vercel.json, rate limiting |
| 2026-01-26 | **SEO**: Dynamic sitemap.xml and robots.txt per store |
| 2026-01-26 | **Reliability**: Error boundaries, webhook security, structured logging |
| 2026-01-26 | **Notifications**: Real-time merchant alerts via Supabase + notification bell UI |
| 2026-01-26 | **Marketing**: Landing page for storeforge.site |
| 2026-01-21 | AI store personalization (About Us, tagline auto-generation) |
| 2026-01-21 | Demo products system + color contrast fix |
| 2026-01-21 | Rebuild store option in settings |
| 2026-01-20 | Order auto-refund, variants storefront, 2FA |
| 2026-01-20 | Collections, data export, pincode checker |
| 2026-01-19 | Shiprocket integration, AI image enhancement |

---

## Subdomain Routing

Stores are accessible at `{store-slug}.storeforge.site`:
- Middleware detects subdomain and rewrites to `/[storeSlug]/` routes
- `getStoreUrl(slug)` helper returns correct URL (subdomain in prod, path in dev)
- SEO helpers generate subdomain-based canonical URLs

---

## Pending
- Admin panel for platform management
- Multi-language support (Hindi at minimum)
- SMS OTP verification
- PWA support (installable stores)
- Stripe integration for international payments
- Multiple shipping providers (Delhivery, Blue Dart)

---

## Production Deployment

1. Configure Vercel with wildcard domain `*.storeforge.site`
2. Set DNS: `*.storeforge.site → cname.vercel-dns.com`
3. Add all environment variables in Vercel dashboard
4. Enable Razorpay live mode + webhook URL
5. Configure Shiprocket production credentials

*Last Updated: 2026-02-03*
