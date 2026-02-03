# CLAUDE.md - AI Store Builder (StoreForge)

## Project Overview

**StoreForge** - Full-stack Next.js e-commerce platform with AI-assisted store creation for Indian merchants. Production-ready with subdomain routing (`{store}.storeforge.site`).

### Tech Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS 4, Radix UI, Shadcn UI
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI**: Vercel AI SDK (Google Gemini 2.0 Flash + Claude)
- **Payments**: Razorpay (UPI, cards, COD) with per-store credentials
- **Shipping**: Multi-provider (Shiprocket, Delhivery, Blue Dart, Self-delivery) with per-store credentials
- **Email**: Resend + React Email templates (per-store credentials supported)
- **WhatsApp**: MSG91 (per-store credentials supported)

### Core Features
- 10-step conversational onboarding with AI analysis
- 4 store themes (modern, classic, playful, minimal)
- AI product analysis from images (title, description, price suggestion)
- AI-powered product recommendations ("You might also like", "Frequently bought together")
- Product variants (size/color/material)
- Demo products on new stores (auto-removed on first upload)
- Dynamic color contrast for accessibility
- GST invoices, coupons, reviews, collections (with tag-based auto-population)
- Subdomain-based store routing
- Real-time merchant notifications
- Rate limiting & webhook security
- Customer accounts with order history, addresses, wishlist
- Abandoned cart recovery with 3-email sequence
- WhatsApp order notifications (MSG91)
- Per-store integrations:
  - Razorpay (payment processing)
  - Shiprocket, Delhivery, Blue Dart (shipping)
  - Resend (email notifications)
  - MSG91 (WhatsApp notifications)

---

## Architecture

```
src/
├── app/
│   ├── (auth)/           # Sign-in, sign-up
│   ├── (marketing)/      # Landing page for storeforge.site
│   ├── dashboard/        # Products, orders, analytics, settings
│   ├── [storeSlug]/      # Public storefront + sitemap.xml + robots.txt
│   └── api/              # 90+ API routes
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
│   ├── shipping/         # provider-manager.ts, shiprocket.ts, delhivery.ts, bluedart.ts
│   ├── whatsapp/         # msg91.ts (per-store credentials support)
│   ├── email/            # index.ts (per-store credentials), order-confirmation.ts, merchant-notifications.ts
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
| `lib/shipping/provider-manager.ts` | Multi-provider shipping abstraction |
| `lib/shipping/shiprocket.ts` | Shiprocket API integration |
| `lib/shipping/delhivery.ts` | Delhivery API integration |
| `lib/shipping/bluedart.ts` | Blue Dart API integration |
| `lib/email/index.ts` | Email service with per-store Resend credentials |
| `lib/whatsapp/msg91.ts` | WhatsApp notifications with per-store MSG91 credentials |
| `lib/rate-limit.ts` | Rate limiting (100/min API, 10/min AI, 5/min auth) |
| `lib/notifications.ts` | Real-time notifications via Supabase |
| `lib/webhook-security.ts` | Razorpay signature + Shiprocket IP verification |
| `lib/encryption.ts` | AES-256-GCM encryption for merchant secrets |
| `middleware.ts` | Subdomain detection + auth protection |
| `app/api/onboarding/complete/route.ts` | Store activation + AI content generation |
| `app/api/dashboard/settings/razorpay/route.ts` | Per-store Razorpay credential management |
| `app/api/dashboard/settings/shipping-providers/route.ts` | Per-store shipping provider management |
| `app/api/dashboard/settings/email/route.ts` | Per-store Resend credential management |
| `app/api/dashboard/settings/whatsapp/route.ts` | Per-store MSG91 credential management |

---

## Database

### Main Tables (25+)
- **stores** - Config, blueprint (JSONB), policies, settings, cart_recovery_settings, razorpay_credentials, shipping_providers, msg91_credentials, resend_credentials, notification_settings
- **products** - Details, pricing, `is_demo` flag for demo products
- **product_variants** - SKU combinations with per-variant pricing
- **orders** / **order_items** - With shipping tracking, customer_id link, courier info
- **collections**, **collection_products** - Manual + tag-based product grouping
- **coupons**, **product_reviews**
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

# Shipping (Platform defaults - merchants can override)
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=

# Email (Platform defaults - merchants can override)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# WhatsApp (Platform defaults - merchants can override)
MSG91_AUTH_KEY=
MSG91_WHATSAPP_INTEGRATED_NUMBER=

# Cron Jobs
CRON_SECRET=

# Address Autocomplete (optional)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://storeforge.site
```

---

## Recent Changes

| Date | Change |
|------|--------|
| 2026-02-04 | **Per-Store Notifications**: MSG91 (WhatsApp) and Resend (Email) per-store credentials with platform fallback |
| 2026-02-04 | **Multi-Provider Shipping**: Shiprocket, Delhivery, Blue Dart, Self-delivery with per-store credentials |
| 2026-02-04 | **Bug Fix**: Customer orders now properly linked via customer_id for order history |
| 2026-02-04 | **Bug Fix**: Collections auto-populate from product tags when no manual assignment |
| 2026-02-04 | **Shipping Provider Setup Guides**: Step-by-step instructions with direct links for each provider |
| 2026-02-03 | **Checkout Polish**: Address autocomplete (Google Places), saved addresses for logged-in customers, guest checkout localStorage persistence, multi-step checkout with progress indicator |
| 2026-02-03 | **WhatsApp Improvements**: Retry logic with exponential backoff (3 attempts), phone validation, structured JSON logging |
| 2026-02-03 | **Per-Store Razorpay**: Merchants can configure their own Razorpay credentials for direct settlement |
| 2026-01-26 | **AI Recommendations**: Product similarity, "frequently bought together", personalized recommendations |
| 2026-01-26 | **Abandoned Cart Recovery**: Cart persistence, 3-email recovery sequence, cron job |
| 2026-01-26 | **Customer Accounts**: Registration, login, order history, saved addresses, wishlist |
| 2026-01-26 | **WhatsApp Notifications**: Order confirmation, shipping, delivery via MSG91 |
| 2026-01-26 | **Email Service Complete**: Welcome email on onboarding, low stock cron, delivery triggers |
| 2026-01-26 | **Production Infrastructure**: Subdomain routing, vercel.json, rate limiting |
| 2026-01-26 | **SEO**: Dynamic sitemap.xml and robots.txt per store |
| 2026-01-26 | **Notifications**: Real-time merchant alerts via Supabase + notification bell UI |

---

## Per-Store Integrations

Merchants can connect their own accounts for direct control:

| Service | Settings Page | Credentials Needed |
|---------|---------------|-------------------|
| **Razorpay** | `/dashboard/settings/payments` | Key ID, Key Secret, Webhook Secret |
| **Shiprocket** | `/dashboard/settings/shipping-providers` | Email, Password |
| **Delhivery** | `/dashboard/settings/shipping-providers` | API Token, Client Name |
| **Blue Dart** | `/dashboard/settings/shipping-providers` | API Key, Client Code, License Key, Login ID |
| **Resend** | `/dashboard/settings/notifications` | API Key, From Email |
| **MSG91** | `/dashboard/settings/notifications` | Auth Key, WhatsApp Number |

All credentials are encrypted with AES-256-GCM before storage.

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
- Store UI customization (fonts, layouts, custom CSS)

---

## Production Deployment

1. Configure Vercel with wildcard domain `*.storeforge.site`
2. Set DNS: `*.storeforge.site → cname.vercel-dns.com`
3. Add all environment variables in Vercel dashboard
4. Enable Razorpay live mode + webhook URL
5. Configure Shiprocket production credentials
6. Run database migrations for new features

*Last Updated: 2026-02-04*
