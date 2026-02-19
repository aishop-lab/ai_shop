# CLAUDE.md - AI Store Builder (StoreForge)

## Project Overview

**StoreForge** - Full-stack Next.js e-commerce platform with AI-assisted store creation for Indian merchants. Production-ready with subdomain routing (`{store}.storeforge.site`).

### Tech Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS 4, Radix UI, Shadcn UI
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI**: Vercel AI SDK (Google Gemini 2.0 Flash + Claude)
- **Payments**: Razorpay (UPI, cards, COD) + Stripe (international cards) with per-store credentials, auto-selection by currency
- **Shipping**: Multi-provider (Shiprocket, Delhivery, Blue Dart, Shippo, Self-delivery) with per-store credentials
- **Email**: Resend + React Email templates (per-store credentials supported)
- **WhatsApp**: MSG91 (per-store credentials supported)

### Core Features
- 10-step conversational onboarding with AI analysis
- 4 store themes (modern, classic, playful, minimal)
- AI product analysis from images (title, description, price suggestion)
- AI-powered product recommendations ("You might also like", "Frequently bought together")
- **AI Bot for Sellers** - Natural language store management (Cmd+K to open)
  - 25+ tools: products, orders, coupons, collections, analytics, settings
  - Auto-execute for creates/updates, confirmation for destructive actions
  - Context-aware (current page, selected items, recent actions)
- **Platform Admin Dashboard** (`/admin`) - Full platform management
  - Access restricted to hardcoded admin email (`aishop@middlefieldbrands.com`)
  - Overview with platform stats, revenue/signup charts
  - Stores management with suspend/unsuspend functionality
  - Sellers, customers, orders, products list views
  - Analytics with configurable time periods
- Product variants (size/color/material)
- Demo products on new stores (auto-removed on first upload)
- Dynamic color contrast for accessibility
- GST invoices, coupons, reviews, collections (with tag-based auto-population)
- Subdomain-based store routing
- Real-time merchant notifications
- Rate limiting & webhook security
- Customer accounts with order history, addresses, wishlist, Google OAuth login
- Abandoned cart recovery with 3-email sequence
- WhatsApp order notifications (MSG91)
- Store migration from Shopify (products, collections, orders, customers, coupons) and Etsy (products, collections)
- Per-store integrations:
  - Razorpay (INR payment processing)
  - Stripe (international payment processing)
  - Shiprocket, Delhivery, Blue Dart, Shippo (shipping)
  - Resend (email notifications)
  - MSG91 (WhatsApp notifications)

---

## Architecture

```
src/
├── app/
│   ├── (auth)/           # Sign-in, sign-up
│   ├── (marketing)/      # Landing page for storeforge.site
│   ├── admin/            # Platform admin dashboard
│   ├── dashboard/        # Products, orders, analytics, settings
│   ├── [storeSlug]/      # Public storefront + sitemap.xml + robots.txt
│   └── api/              # 100+ API routes
├── components/
│   ├── ui/               # Shadcn components
│   ├── dashboard/        # Dashboard + notification-bell
│   │   └── ai-bot/       # AI Bot sidebar panel (provider, messages, input, confirmation)
│   ├── admin/            # Admin dashboard components (sidebar, charts, tables)
│   ├── store/            # Storefront themes
│   ├── products/         # Product forms, uploaders
│   └── error-boundary.tsx
├── lib/
│   ├── ai/               # vercel-ai-service.ts, recommendations.ts, schemas
│   │   └── bot/          # AI Bot tools, executor, system prompt
│   ├── admin/            # constants.ts (ADMIN_EMAIL), auth.ts, queries.ts
│   ├── store/            # queries.ts, dynamic-styles.ts
│   ├── customer/         # auth.ts (customer authentication)
│   ├── cart/             # abandoned-cart.ts (recovery system)
│   ├── payment/          # razorpay.ts, stripe.ts (per-store credentials, auto-selection by currency)
│   ├── encryption.ts     # AES-256-GCM for sensitive credentials
│   ├── shipping/         # provider-manager.ts, shiprocket.ts, delhivery.ts, bluedart.ts, shippo.ts
│   ├── migration/        # pipeline.ts, progress.ts, shopify/ (client, transformers)
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
| `lib/ai/bot/tools.ts` | AI Bot tool definitions (25+ tools) |
| `lib/ai/bot/tool-executor.ts` | AI Bot tool execution logic |
| `app/api/ai/bot/route.ts` | AI Bot streaming chat endpoint |
| `components/dashboard/ai-bot/` | AI Bot UI (panel, messages, input, confirmation) |
| `lib/store/queries.ts` | Database queries + `getStoreUrl()` helper |
| `lib/store/dynamic-styles.ts` | Theme CSS variables + contrast colors |
| `lib/payment/stripe.ts` | Stripe payment processing (checkout sessions, webhooks, refunds) |
| `lib/payment/stripe-client.ts` | Client-side Stripe checkout redirect |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler (checkout completed/expired, refunds) |
| `app/api/dashboard/settings/stripe/route.ts` | Per-store Stripe credential management |
| `lib/shipping/provider-manager.ts` | Multi-provider shipping abstraction |
| `lib/shipping/shiprocket.ts` | Shiprocket API integration |
| `lib/shipping/delhivery.ts` | Delhivery API integration |
| `lib/shipping/bluedart.ts` | Blue Dart API integration |
| `lib/shipping/shippo.ts` | Shippo multi-carrier US shipping (USPS, UPS, FedEx, DHL) |
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
| `lib/admin/constants.ts` | Admin email constant (`aishop@middlefieldbrands.com`) |
| `lib/admin/auth.ts` | Admin authentication verification |
| `lib/admin/queries.ts` | Platform-wide database queries for admin |
| `app/admin/layout.tsx` | Admin dashboard layout with sidebar |
| `app/api/admin/stats/route.ts` | Platform stats API endpoint |
| `app/api/admin/stores/route.ts` | Stores list + detail + status update |
| `lib/migration/pipeline.ts` | 5-phase migration orchestration (products, collections, customers, coupons, orders) |
| `lib/migration/shopify/client.ts` | Shopify GraphQL API (products, collections, orders, customers, discounts) |
| `lib/migration/shopify/order-transformer.ts` | Shopify order → StoreForge order mapping |
| `lib/migration/shopify/customer-transformer.ts` | Shopify customer → StoreForge customer mapping |
| `lib/migration/shopify/discount-transformer.ts` | Shopify discount → StoreForge coupon mapping |
| `lib/migration/etsy/oauth.ts` | Etsy OAuth PKCE flow (auth URL, token exchange, refresh) |
| `lib/migration/etsy/client.ts` | Etsy REST API (listings, sections, images, rate limiting) |
| `lib/migration/etsy/transformer.ts` | Etsy listing → StoreForge product mapping (with variant support) |

---

## Database

### Main Tables (25+)
- **stores** - Config, blueprint (JSONB), policies, settings, cart_recovery_settings, razorpay_credentials, stripe_credentials, shipping_providers, msg91_credentials, resend_credentials, notification_settings
- **products** - Details, pricing, `is_demo` flag for demo products
- **product_variants** - SKU combinations with per-variant pricing
- **orders** / **order_items** - With shipping tracking, customer_id link, courier info, Stripe/Razorpay payment fields, currency
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
- **store_migrations** - Shopify/Etsy import tracking with per-entity progress, ID maps, and error logs

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

# AI (Text generation - Gemini/Claude)
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=

# Logo Generation (Vertex AI Imagen 3.0) - Required for AI logo generation
GOOGLE_CLOUD_PROJECT_ID=           # GCP project ID
GOOGLE_CLOUD_CREDENTIALS=          # Service account JSON key (as string)

# Payments (Platform defaults - merchants can override with their own)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
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

# Shopify Migration (OAuth app)
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=

# Etsy Migration (OAuth PKCE app)
ETSY_CLIENT_ID=

# Cron Jobs
CRON_SECRET=

# Google APIs
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=  # Address autocomplete (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=       # Customer Google Sign-In

# App
NEXT_PUBLIC_APP_URL=https://storeforge.site
```

---

## Recent Changes

| Date | Change |
|------|--------|
| 2026-02-19 | **Etsy Migration**: Full Etsy store import via OAuth PKCE. Imports products (with variant support for 1D/2D properties) and collections (from Etsy sections). Offset-based pagination, token refresh, rate limit backoff. |
| 2026-02-19 | **Stripe Payment Integration**: International payments via Stripe Checkout. Auto-selects Razorpay for INR, Stripe for non-INR currencies. Per-store Stripe credentials with platform fallback. Webhook handler for checkout completed/expired/refunds. Stripe settings page in dashboard. |
| 2026-02-19 | **Shippo Shipping Provider**: Multi-carrier US shipping via Shippo (USPS, UPS, FedEx, DHL). Full ShippingProvider interface implementation. Per-store credentials with settings UI. |
| 2026-02-19 | **Expanded Shopify Migration**: Full store migration now imports Orders, Customers, and Coupons in addition to Products and Collections. 5-phase pipeline (Products → Collections → Customers → Coupons → Orders). Orders link to imported customers via email. Code-based discounts imported (automatic discounts skipped). OAuth scopes expanded to `read_products,read_orders,read_customers,read_discounts`. |
| 2026-02-19 | **AI Bot Improvements**: Added authentication, confirmation flow for destructive actions, fixed `category` → `categories` field mapping, rate limiting. |
| 2026-02-09 | **Platform Admin Dashboard**: Full admin panel at `/admin` for platform owner. Stores, sellers, customers, orders, products management. Revenue and signups charts. Store suspend/unsuspend. Access restricted to hardcoded admin email. |
| 2026-02-09 | **AI Bot for Sellers**: Natural language store management via sidebar panel (Cmd+K). 25+ tools for products, orders, coupons, collections, analytics, settings, branding. Auto-execute for creates/updates, confirmation dialogs for destructive actions. Context-aware of current page. |
| 2026-02-04 | **Comprehensive E2E Tests**: 405 Playwright tests covering shipping (56), payment/Razorpay (56), products (75), API routes (97), inventory (18), email (29), cart, auth, storefront |
| 2026-02-04 | **Gemini Model Fix**: Updated from deprecated `gemini-2.0-flash-exp` to stable `gemini-2.0-flash` for product image AI analysis |
| 2026-02-04 | **Logo Regeneration Improvements**: User feedback now properly incorporated - parses color/text requests, places feedback prominently in prompt |
| 2026-02-04 | **Demo Product Images Fix**: Added Unsplash to Next.js image remote patterns, fixed `original_url` column usage |
| 2026-02-04 | **Google Sign-In for Customers**: Customers can sign in with Google on any store |
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
| **Stripe** | `/dashboard/settings/payments` | Publishable Key, Secret Key, Webhook Secret |
| **Shiprocket** | `/dashboard/settings/shipping-providers` | Email, Password |
| **Delhivery** | `/dashboard/settings/shipping-providers` | API Token, Client Name |
| **Blue Dart** | `/dashboard/settings/shipping-providers` | API Key, Client Code, License Key, Login ID |
| **Shippo** | `/dashboard/settings/shipping-providers` | API Token |
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
- Multi-language support (Hindi at minimum)
- SMS OTP verification
- PWA support (installable stores)
- Store UI customization (fonts, layouts, custom CSS)


---

## Production Deployment

1. Configure Vercel with wildcard domain `*.storeforge.site`
2. Set DNS: `*.storeforge.site → cname.vercel-dns.com`
3. Add all environment variables in Vercel dashboard
4. Enable Razorpay live mode + webhook URL
5. Enable Stripe live mode + webhook URL (`/api/webhooks/stripe`)
6. Configure Shiprocket production credentials
7. Configure Shopify app (client ID + secret) for migration
8. Configure Etsy app (client ID) for migration
9. Run database migrations for new features

*Last Updated: 2026-02-19*
