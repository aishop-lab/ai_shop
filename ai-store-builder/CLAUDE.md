# CLAUDE.md - AI Store Builder (StoreForge)

## Project Overview

**StoreForge** - Full-stack Next.js e-commerce platform with AI-assisted store creation for Indian merchants. Production-ready with subdomain routing (`{store}.storeforge.site`).

### Tech Stack
- **Framework**: Next.js 16.1.1 (App Router + Turbopack), React 19.2, TypeScript 5
- **UI**: Tailwind CSS 4 (`@tailwindcss/postcss` v4), Radix UI, Shadcn UI
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI**: Vercel AI SDK (`@ai-sdk/google` ^3.0, `@ai-sdk/anthropic` ^3.0) — Google Gemini 2.0 Flash primary, Claude fallback
- **Vision**: Google Cloud Vision API (`@google-cloud/vision`) — OCR, object detection, safe search, background removal
- **Image Processing**: Sharp — resize, enhance, quality assessment, format conversion
- **Payments**: Razorpay (UPI, cards, COD) + Stripe (international cards) with per-store credentials, auto-selection by currency
- **Shipping**: Multi-provider (Shiprocket, Delhivery, Blue Dart, Shippo, Self-delivery) with per-store credentials
- **Email**: Resend + React Email templates (per-store credentials supported)
- **WhatsApp**: MSG91 (per-store credentials supported)
- **Forms**: React Hook Form + Zod validation

### Core Features
- 10-step conversational onboarding with AI analysis
- 4 store themes (modern, classic, playful, minimal)
- **AI Product Analysis** — Multi-image extraction (title, description, categories, tags, price suggestion)
  - Auto-applies suggestions when confidence >= 80%
  - Image quality assessment, enhancement, background removal
  - OCR text extraction from product images
  - AI price suggestions based on category and market data
  - AI description generator
- AI-powered product recommendations ("You might also like", "Frequently bought together")
- **AI Bot for Sellers** - Natural language store management (Cmd+K to open)
  - 25+ tools: products, orders, coupons, collections, analytics, settings
  - Auto-execute for creates/updates, confirmation for destructive actions
  - Context-aware (current page, selected items, recent actions)
  - Bearer token auth for production (cookie fallback for dev)
- **Platform Admin Dashboard** (`/admin`) - Full platform management
  - Access restricted to hardcoded admin email (`aishop@middlefieldbrands.com`)
  - Overview with platform stats, revenue/signup charts
  - Stores management with suspend/unsuspend functionality
  - Sellers, customers, orders, products list views
  - Analytics with configurable time periods
- **Product Management**
  - Shared `ProductForm` component for both create and edit modes
  - Image upload with drag-and-drop, compression, AI enhancement
  - Product variants (size/color/material) with combination generator
  - Bulk CSV import with progress tracking
  - Demo products on new stores (auto-removed on first upload)
- Dynamic color contrast for accessibility
- GST invoices, coupons, reviews, collections (with tag-based auto-population)
- Subdomain-based store routing
- Real-time merchant notifications
- Rate limiting & webhook security
- Input sanitization against PostgREST injection (`lib/utils/sanitize.ts`)
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
│   │   └── products/
│   │       ├── new/      # Create product (uses ProductForm mode="create")
│   │       └── [id]/     # Edit product (thin wrapper → ProductForm mode="edit")
│   ├── [storeSlug]/      # Public storefront + sitemap.xml + robots.txt
│   └── api/              # 100+ API routes
│       └── products/
│           ├── upload/           # POST - Create product with images (multipart)
│           ├── list/             # GET - Paginated product listing
│           ├── [id]/             # GET/PATCH/DELETE single product
│           │   ├── images/       # POST/DELETE/PATCH - Add, remove, reorder images
│           │   ├── variants/     # GET/POST/DELETE - Variant CRUD
│           │   ├── publish/      # POST - Publish/unpublish
│           │   └── reviews/      # GET/POST - Product reviews
│           ├── extract/          # POST - AI single-image extraction
│           ├── extract-multi/    # POST - AI multi-image extraction
│           ├── extract-enhanced/ # POST - Enhanced extraction with quality assessment
│           ├── enhance-image/    # POST - Image enhancement service
│           ├── suggest-price/    # POST - AI price suggestion
│           ├── analyze-image/    # POST - AI image analysis
│           └── bulk-upload/      # POST - CSV batch import
├── components/
│   ├── ui/               # Shadcn components
│   ├── dashboard/        # Dashboard + notification-bell
│   │   └── ai-bot/       # AI Bot sidebar panel (provider, messages, input, confirmation)
│   ├── admin/            # Admin dashboard components (sidebar, charts, tables)
│   ├── store/            # Storefront themes
│   ├── products/         # Product components (see Product Components section)
│   └── error-boundary.tsx
├── lib/
│   ├── ai/               # vercel-ai-service.ts, recommendations.ts, schemas
│   │   ├── bot/          # AI Bot tools, executor, system prompt
│   │   └── google-vision-service.ts  # Cloud Vision: OCR, object detection, safe search
│   ├── admin/            # constants.ts (ADMIN_EMAIL), auth.ts, queries.ts
│   ├── store/            # queries.ts, dynamic-styles.ts
│   ├── products/         # Product operations (see Product Modules section)
│   ├── customer/         # auth.ts (customer authentication)
│   ├── cart/             # abandoned-cart.ts (recovery system)
│   ├── payment/          # razorpay.ts, stripe.ts (per-store credentials, auto-selection by currency)
│   ├── encryption.ts     # AES-256-GCM for sensitive credentials
│   ├── shipping/         # provider-manager.ts, shiprocket.ts, delhivery.ts, bluedart.ts, shippo.ts
│   ├── migration/        # pipeline.ts, progress.ts, shopify/ (client, transformers), etsy/
│   ├── whatsapp/         # msg91.ts (per-store credentials support)
│   ├── email/            # index.ts (per-store credentials), order-confirmation.ts, merchant-notifications.ts
│   ├── contexts/         # auth-context.tsx, customer-context.tsx
│   ├── types/            # TypeScript types (store.ts, variant.ts)
│   ├── utils/            # sanitize.ts (PostgREST injection prevention)
│   ├── rate-limit.ts     # API rate limiting (100/min API, 10/min AI, 5/min auth)
│   ├── webhook-security.ts # Razorpay/Shiprocket verification
│   ├── notifications.ts  # Supabase realtime notifications
│   ├── logger.ts         # Structured JSON logging
│   └── errors.ts         # Custom error classes
├── emails/               # React Email templates
├── middleware.ts         # Auth + subdomain routing
└── vercel.json           # Production deployment config
```

### Product Modules (`lib/products/`)

| File | Purpose |
|------|---------|
| `db-operations.ts` | CRUD: `createProduct`, `updateProduct`, `deleteProduct`, `hardDeleteProduct`, `getProductById`, `getStoreProducts`, `verifyProductOwnership`, `verifyStoreOwnership`, `bulkUpdateStatus` |
| `image-processor.ts` | `uploadProductImages(storeId, productId, files, startPosition?)`, `deleteProductImage`, `deleteProductImages`, `reorderProductImages`, `enhanceProductImage`, `analyzeImageQuality`, `removeBackground` |
| `processing-pipeline.ts` | Orchestrates enhancement + AI analysis + upload pipeline |
| `variant-operations.ts` | `getProductWithVariants`, `saveVariantOptions`, `bulkUpdateVariants`, `deleteAllVariants`, `enableVariants` |
| `variant-utils.ts` | Variant utility functions for display/matching |
| `validation.ts` | Zod schemas (`productInputSchema`, `productUpdateSchema`, `bulkProductSchema`, `csvRowSchema`), `validatePricing`, `sanitizeProductData`, `validateImageFile` |
| `csv-parser.ts` | CSV parsing for bulk product import |
| `demo-products.ts` | Demo product fixtures for new stores |

### Product Components (`components/products/`)

| Component | Purpose |
|-----------|---------|
| `product-form.tsx` | **Main form** — create/edit modes, AI extraction, variants, image management. Edit mode: existing image display, delete, status toggle, delete product |
| `image-uploader.tsx` | Drag-drop upload with `existingImages` support, compression for oversized files, AI enhancement buttons |
| `ai-suggestions.tsx` | AI suggestion display with confidence score and apply button |
| `description-generator.tsx` | AI-powered description generation from title + category |
| `variant-options-editor.tsx` | UI for adding/editing variant options (Size, Color, etc.) |
| `variants-table.tsx` | Table for variant combinations with per-variant pricing/inventory |
| `bulk-upload-modal.tsx` | CSV bulk upload dialog with progress |
| `processing-status.tsx` | Stage-by-stage processing indicator |
| `product-card.tsx` | Product preview card |

### Key Files
| File | Purpose |
|------|---------|
| `lib/ai/vercel-ai-service.ts` | All AI text operations (Gemini 2.0 Flash) |
| `lib/ai/google-vision-service.ts` | Cloud Vision: OCR, object detection, safe search, color extraction, background removal |
| `lib/ai/bot/tools.ts` | AI Bot tool definitions (25+ tools) |
| `lib/ai/bot/tool-executor.ts` | AI Bot tool execution logic |
| `app/api/ai/bot/route.ts` | AI Bot streaming chat endpoint |
| `components/dashboard/ai-bot/` | AI Bot UI (panel, messages, input, confirmation) |
| `lib/store/queries.ts` | Database queries + `getStoreUrl()` helper |
| `lib/store/dynamic-styles.ts` | Theme CSS variables + contrast colors |
| `lib/payment/stripe.ts` | Stripe payment processing (checkout sessions, webhooks, refunds) |
| `lib/payment/stripe-client.ts` | Client-side Stripe checkout redirect |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler (checkout completed/expired, refunds) |
| `lib/shipping/provider-manager.ts` | Multi-provider shipping abstraction |
| `lib/email/index.ts` | Email service with per-store Resend credentials |
| `lib/whatsapp/msg91.ts` | WhatsApp notifications with per-store MSG91 credentials |
| `lib/webhook-security.ts` | Razorpay signature + Shiprocket IP verification |
| `lib/encryption.ts` | AES-256-GCM encryption for merchant secrets |
| `middleware.ts` | Subdomain detection + auth protection |
| `lib/migration/pipeline.ts` | 5-phase migration orchestration |
| `lib/migration/shopify/client.ts` | Shopify GraphQL API |
| `lib/migration/etsy/client.ts` | Etsy REST API (listings, sections, images, rate limiting) |
| `lib/admin/constants.ts` | Admin email constant (`aishop@middlefieldbrands.com`) |

---

## Database

### Main Tables (25+)
- **stores** - Config, blueprint (JSONB), policies, settings, cart_recovery_settings, razorpay_credentials, stripe_credentials, shipping_providers, msg91_credentials, resend_credentials, notification_settings
- **products** - Details, pricing, `is_demo` flag for demo products, `has_variants` flag
- **product_images** - original_url, thumbnail_url, position, alt_text, is_primary
- **product_variant_options** - Option definitions (Size, Color, Material)
- **product_variant_option_values** - Option values (S, M, L, Red, Blue)
- **product_variants** - SKU combinations with attributes (JSONB), per-variant pricing/inventory
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
- `product-images` - Product images + thumbnails (organized as `products/{storeId}/` and `products/{storeId}/thumbnails/`)

### Image Sizes
- **Original**: 2000x2000, quality 90, fit inside
- **Thumbnail**: 600x600, quality 80, fit cover
- **Small**: 300x300, quality 75, fit cover

---

## Key Patterns

### Product Create vs Edit Flow
- **Create**: `ProductForm mode="create"` → multipart POST to `/api/products/upload` (images + fields in one request)
- **Edit**: `ProductForm mode="edit"` → three separate API calls:
  1. New images → POST `/api/products/{id}/images` (multipart)
  2. Product fields → PATCH `/api/products/{id}` (JSON)
  3. Variants → POST `/api/products/{id}/variants` (JSON)
- Edit page (`dashboard/products/[id]/page.tsx`) is a thin wrapper that fetches data and renders `ProductForm`

### AI Image Auto-Extraction
- Triggers automatically when new `File` images are added (both create and edit modes)
- Single image → `/api/products/extract-enhanced`
- Multiple images → `/api/products/extract-multi`
- Auto-applies suggestions when confidence >= 80% (`AUTO_APPLY_THRESHOLD`)
- Falls back to basic `/api/products/extract` on failure

### Per-Store Credentials Pattern
- Encrypt with AES-256-GCM (`lib/encryption.ts`), store as `*_encrypted` columns
- Platform credentials as fallback when store doesn't have its own
- Lazy platform instance, store instance cache with 5-min TTL

### Shipping Provider Pattern
- Implement `ShippingProvider` interface
- Add to all 4 switch statements in `provider-manager.ts` (validate, create, rates, track)

### Payment Auto-Selection
- Store currency from `store.blueprint.location.currency` (defaults to `'INR'`)
- INR → Razorpay, non-INR → Stripe

### Auth on Production
- Cookie-based Supabase auth doesn't work cross-domain on Vercel production
- AI Bot uses Bearer token fallback: frontend gets token via `supabase.auth.getSession()`, sends as `Authorization: Bearer <token>`
- Backend tries cookie auth first, falls back to Authorization header

### Security
- `sanitizeSearchQuery()` in `lib/utils/sanitize.ts` prevents PostgREST injection in `.or()` filters
- Rate limiting: 100/min API, 10/min AI, 5/min auth
- Razorpay signature + Shiprocket IP webhook verification
- Security headers in next.config.ts (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- Body size limit: 50MB for server actions (image uploads)

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

## Recent Changes

| Date | Change |
|------|--------|
| 2026-02-25 | **Product Edit Page Parity**: Replaced 792-line custom edit page with `ProductForm` in edit mode. Full feature parity with create page: image management (add/delete via `/api/products/[id]/images`), AI extraction on new images, variant editing, description generator, price suggestions. Edit-mode header with status toggle, View in Store link, delete button. `uploadProductImages` now accepts `startPosition` for appending images. |
| 2026-02-19 | **AI Bot Production Auth Fix**: Fixed AI Bot failing on production. Added Bearer token auth fallback for cross-domain Vercel. |
| 2026-02-19 | **Etsy Migration**: Full Etsy store import via OAuth PKCE. Products (with variant support) and collections (from sections). |
| 2026-02-19 | **Stripe Payment Integration**: International payments via Stripe Checkout. Auto-selects by currency. Per-store credentials with platform fallback. |
| 2026-02-19 | **Shippo Shipping Provider**: Multi-carrier US shipping (USPS, UPS, FedEx, DHL). Per-store credentials. |
| 2026-02-19 | **Expanded Shopify Migration**: 5-phase pipeline (Products, Collections, Customers, Coupons, Orders). |
| 2026-02-19 | **AI Bot Improvements**: Authentication, confirmation flow, field mapping fixes, rate limiting. |
| 2026-02-09 | **Platform Admin Dashboard**: Full admin panel at `/admin`. Store management, analytics, user management. |
| 2026-02-09 | **AI Bot for Sellers**: Natural language store management via sidebar panel (Cmd+K). 25+ tools. |
| 2026-02-04 | **E2E Tests**: 405 Playwright tests covering shipping, payment, products, API, inventory, email, cart, auth. |
| 2026-02-04 | **Google Sign-In for Customers**: Customers can sign in with Google on any store. |
| 2026-02-04 | **Per-Store Notifications**: MSG91 (WhatsApp) and Resend (Email) per-store credentials. |
| 2026-02-04 | **Multi-Provider Shipping**: Shiprocket, Delhivery, Blue Dart, Self-delivery with per-store credentials. |
| 2026-02-03 | **Checkout Polish**: Google Places autocomplete, saved addresses, multi-step checkout. |
| 2026-02-03 | **Per-Store Razorpay**: Merchants can configure own Razorpay credentials for direct settlement. |
| 2026-01-26 | **AI Recommendations, Abandoned Cart Recovery, Customer Accounts, WhatsApp Notifications, Email Service, Production Infrastructure, SEO, Real-time Notifications** |

---

## Stripe Integration Notes
- Stripe npm package uses API version `2026-01-28.clover`
- Use `stripe.balance.retrieve()` to verify credentials (not `stripe.account.retrieve()`)
- Stripe Checkout sessions use `expires_at` (Unix timestamp) not `expires_after` (seconds)

---

## Pending
- Multi-language support (Hindi at minimum)
- SMS OTP verification
- PWA support (installable stores)
- Store UI customization (fonts, layouts, custom CSS)

---

## Production Deployment

**IMPORTANT**: `storeforge.site` is served by the `ai-store-builder` Vercel project (locally linked via `.vercel/project.json`). Deploy via `npx vercel --prod` from the project root — git push does NOT deploy to this project.

There's also an `ai-shop` project with GitHub integration, but it does NOT serve storeforge.site.

1. Deploy: `npx vercel --prod` (NOT git push)
2. Configure Vercel with wildcard domain `*.storeforge.site`
3. Set DNS: `*.storeforge.site → cname.vercel-dns.com`
4. Add all environment variables in Vercel dashboard
5. Enable Razorpay live mode + webhook URL
6. Enable Stripe live mode + webhook URL (`/api/webhooks/stripe`)
7. Configure Shiprocket production credentials
8. Configure Shopify app (client ID + secret) for migration
9. Configure Etsy app (client ID) for migration
10. Run database migrations for new features

*Last Updated: 2026-02-25*
