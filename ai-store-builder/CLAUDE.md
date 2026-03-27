# CLAUDE.md - Autonomous AI Agent E-Commerce Platform

## Product Vision (March 2026 Pivot)

> **Pivoting from "store builder with AI features" to "autonomous AI agent platform for e-commerce."**
> Five specialized agents (Marketing, Sales, Support, Analytics, Technical) run the merchant's entire business.
> The merchant becomes a one-man company — they provide the products, agents handle everything else.
> See `docs/PRD.md` for the full PRD. See `docs/agents.md` for the agent hierarchy and sub-agent system.

### Key Design Decisions
- **UX**: Hybrid Command Center + Conversational (Linear/Vercel/Raycast dark aesthetic)
- **Autonomy**: Auto-execute for non-money actions, approval required for spend/pricing/refunds
- **Onboarding**: Store live in 30 seconds, agents configured in 30 minutes
- **Build order**: Shell/infrastructure first → plug in agents one by one
- **Branding**: Complete rebrand in progress (StoreForge name retiring)
- **Codebase**: Evolve existing repo — keep backend business logic, redesign merchant dashboard

---

## Tech Stack
- **Framework**: Next.js 16.1.1 (App Router + Turbopack), React 19.2, TypeScript 5
- **UI**: Tailwind CSS 4, Radix UI, Shadcn UI
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI**: Vercel AI SDK (`@ai-sdk/google`, `@ai-sdk/anthropic`) — Gemini 2.0 Flash primary, Claude fallback
- **Vision**: Google Cloud Vision API — OCR, object detection, safe search, background removal
- **Image Processing**: Sharp
- **Payments**: Razorpay (INR) + Stripe (international) with per-store credentials, auto-selection by currency
- **Shipping**: Shiprocket, Delhivery, Blue Dart, Shippo, Self-delivery (per-store credentials)
- **Email**: Resend + React Email (per-store credentials)
- **WhatsApp**: MSG91 (per-store credentials)

---

## Architecture

```
src/
├── app/
│   ├── (auth)/           # Sign-in, sign-up
│   ├── (marketing)/      # Landing page
│   ├── admin/            # Platform admin dashboard
│   ├── dashboard/        # Merchant dashboard (products, orders, analytics, settings)
│   ├── [storeSlug]/      # Public storefront
│   └── api/              # 100+ API routes
├── components/
│   ├── ui/               # Shadcn components
│   ├── dashboard/        # Dashboard + AI Bot sidebar
│   ├── admin/            # Admin dashboard
│   ├── store/            # Storefront themes
│   └── products/         # Product form, image uploader, variants
├── lib/
│   ├── ai/               # AI services, bot tools, Google Vision
│   ├── agents/           # Agent infrastructure (chiefs, sub-agents, executor)
│   ├── payment/          # Razorpay, Stripe (per-store credentials)
│   ├── shipping/         # Multi-provider shipping
│   ├── products/         # Product CRUD, images, variants, validation
│   ├── migration/        # Shopify/Etsy import
│   ├── email/            # Resend (per-store credentials)
│   ├── whatsapp/         # MSG91 (per-store credentials)
│   ├── encryption.ts     # AES-256-GCM for merchant secrets
│   └── ...               # rate-limit, webhook-security, notifications, logger, errors
├── emails/               # React Email templates
└── middleware.ts          # Auth + subdomain routing
```

---

## Database (25+ tables)

Key tables: `stores`, `products`, `product_images`, `product_variants`, `orders`, `order_items`, `collections`, `coupons`, `customers`, `abandoned_carts`, `notifications`, `store_migrations`

Storage buckets: `logos`, `product-images` (organized as `products/{storeId}/`)

Image sizes: Original 2000x2000 q90, Thumbnail 600x600 q80, Small 300x300 q75

---

## Key Patterns

### Per-Store Credentials
- Encrypt with AES-256-GCM (`lib/encryption.ts`), store as `*_encrypted` columns
- Platform credentials as fallback when store doesn't have its own
- Lazy platform instance, store instance cache with 5-min TTL

### Product Create vs Edit
- **Create**: `ProductForm mode="create"` → multipart POST to `/api/products/upload`
- **Edit**: `ProductForm mode="edit"` → separate calls for images, fields, variants

### AI Image Auto-Extraction
- Triggers on new image upload, auto-applies suggestions when confidence >= 80%

### Auth on Production
- Cookie-based Supabase auth doesn't work cross-domain on Vercel
- AI Bot uses Bearer token fallback via `Authorization: Bearer <token>`

### Subdomain Routing
- Stores at `{store-slug}.storeforge.site`
- Middleware rewrites to `/[storeSlug]/` routes
- `getStoreUrl(slug)` returns correct URL per environment

### Security
- PostgREST injection prevention (`lib/utils/sanitize.ts`)
- Rate limiting: 100/min API, 10/min AI, 5/min auth
- Webhook signature verification (Razorpay, Shiprocket)
- Security headers in next.config.ts

---

## Production Deployment

**IMPORTANT**: Deploy via `npx vercel --prod` (NOT git push). The `ai-store-builder` Vercel project serves `storeforge.site`.

Setup checklist:
1. `npx vercel --prod`
2. Wildcard domain `*.storeforge.site` → `cname.vercel-dns.com`
3. All env vars in Vercel dashboard
4. Razorpay + Stripe live mode + webhook URLs
5. Shipping/migration provider credentials

---

## Stripe Gotchas
- API version: `2026-01-28.clover`
- Verify credentials with `stripe.balance.retrieve()` (not `stripe.account.retrieve()`)
- Checkout sessions use `expires_at` (Unix timestamp) not `expires_after`

---

## Pending
- Multi-language support (Hindi minimum)
- SMS OTP verification
- PWA support
- Store UI customization (fonts, layouts, custom CSS)
