# StoreForge Comprehensive Testing Document

## Overview

This document provides a complete feature inventory and testing checklist for StoreForge - an AI-first e-commerce platform for Indian merchants.

**Codebase Stats:**
- 104+ API routes
- 40+ pages
- 70+ components
- 17 database tables
- 16 migrations
- 9 email templates

---

# PART 1: COMPLETE FEATURE INVENTORY

## 1. Authentication & User Management

### 1.1 Merchant Authentication
- [x] Email/password sign up with validation
- [x] Email/password sign in
- [x] Google OAuth sign up/sign in
- [x] Password strength indicator (8+ chars, uppercase, lowercase, number)
- [x] Indian phone number validation (10 digits, starts with 6-9)
- [x] Email verification flow
- [x] Sign out with session cleanup
- [x] User profile (full_name, email, phone, avatar_url)
- [x] Profile update
- [x] Login tracking (login_count, last_login_at)

### 1.2 Two-Factor Authentication (2FA)
- [x] 2FA setup with QR code generation
- [x] TOTP verification
- [x] Backup codes generation (10 codes)
- [x] 2FA enable/disable
- [x] 2FA status check

### 1.3 Customer Authentication (Store-specific)
- [x] Customer registration per store
- [x] Customer login with password
- [x] Session token management (30-day expiry)
- [x] Customer logout (single session)
- [x] Logout all sessions
- [x] Password hashing with scrypt
- [x] Session validation middleware

---

## 2. Onboarding & Store Creation

### 2.1 10-Step Conversational Onboarding
- [x] Step 1: Store name input
- [x] Step 2: Business category selection
- [x] Step 3: Brand vibe/personality selection
- [x] Step 4: Store description input
- [x] Step 5: Contact information (email, phone, WhatsApp, Instagram)
- [x] Step 6: Template/theme selection (4 themes)
- [x] Step 7: Brand color selection with logo
- [x] Step 8: AI tagline generation
- [x] Step 9: About section generation
- [x] Step 10: Store creation confirmation

### 2.2 AI-Powered Onboarding Features
- [x] AI brand analysis from description
- [x] AI store name suggestions
- [x] AI category extraction
- [x] AI blueprint generation
- [x] AI logo generation (up to 3 generations)
- [x] Color extraction from uploaded logos
- [x] AI tagline generation with alternatives
- [x] AI About Us content generation
- [x] Confidence scores for AI suggestions

### 2.3 Store Activation
- [x] Store status management (draft → active)
- [x] Auto-generate legal policies (Returns, Privacy, Terms, Shipping)
- [x] Demo products creation on new stores
- [x] Welcome email to merchant
- [x] Blueprint storage in JSONB

---

## 3. Product Management

### 3.1 Product CRUD
- [x] Create product with basic fields
- [x] Edit product details
- [x] Delete product (soft delete)
- [x] Hard delete product
- [x] Duplicate product (UI ready, API pending)
- [x] Publish/unpublish product
- [x] Archive product

### 3.2 Product Fields
- [x] Title, Description
- [x] Price, Compare At Price, Cost Per Item
- [x] SKU, Barcode
- [x] Quantity, Track Quantity toggle
- [x] Weight, Requires Shipping toggle
- [x] Categories (multi-select)
- [x] Tags (multi-input)
- [x] Featured flag
- [x] Status (draft, published, archived)
- [x] HSN Code (for GST)
- [x] is_demo flag (auto-cleanup)

### 3.3 Product Images
- [x] Multiple image upload (up to 10)
- [x] Image position ordering
- [x] Thumbnail generation
- [x] Alt text support
- [x] Image deletion

### 3.4 Product Variants
- [x] Variant options (Size, Color, Material, Custom)
- [x] Option values with color codes
- [x] Auto-generate variant combinations
- [x] Per-variant pricing
- [x] Per-variant SKU/barcode
- [x] Per-variant quantity tracking
- [x] Per-variant images
- [x] Default variant selection
- [x] Variant enable/disable
- [x] Convert to simple product (remove variants)

### 3.5 AI Product Features
- [x] AI product analysis from images
- [x] AI title generation
- [x] AI description generation
- [x] AI category/tag extraction
- [x] AI price suggestions
- [x] AI confidence scores
- [x] Streaming description generation
- [x] Multi-image analysis

### 3.6 Bulk Operations
- [x] CSV bulk upload with template
- [x] Bulk publish/archive/delete
- [x] Bulk price update
- [x] Bulk category update
- [x] Export products to CSV/JSON

---

## 4. Inventory Management

### 4.1 Stock Tracking
- [x] Quantity per product
- [x] Quantity per variant
- [x] Track quantity toggle
- [x] Auto-reduce on order completion
- [x] Auto-restore on refund/cancellation

### 4.2 Inventory Reservations
- [x] Reserve stock during checkout
- [x] Auto-release expired reservations
- [x] Prevent overselling

### 4.3 Inventory Alerts
- [x] Low stock detection
- [x] Out of stock detection
- [x] Low stock email alerts to merchant
- [x] Low stock dashboard banner
- [x] Cron job for stock checks

---

## 5. Order Management

### 5.1 Order Creation
- [x] Create order from checkout
- [x] Order number generation
- [x] Customer details capture
- [x] Shipping address storage
- [x] Order items with variants
- [x] Price calculations (subtotal, shipping, tax, discount)

### 5.2 Order Status Flow
- [x] Pending → Confirmed → Processing → Shipped → Delivered
- [x] Cancelled status
- [x] Refunded status
- [x] Manual status update
- [x] Status timestamps tracking

### 5.3 Payment Handling
- [x] Razorpay order creation
- [x] Payment signature verification
- [x] Payment status (pending, paid, failed, refunded)
- [x] COD support with configurable fee
- [x] Payment error tracking

### 5.4 Order Actions
- [x] View order details
- [x] Update order status
- [x] Process refund (full/partial)
- [x] Download GST invoice
- [x] Add tracking number
- [x] Select courier service

### 5.5 Order Listing
- [x] Paginated order list
- [x] Filter by status
- [x] Filter by payment status
- [x] Search by order number/customer
- [x] Sort by date/amount
- [x] Export orders to CSV

---

## 6. Shipping Integration (Shiprocket)

### 6.1 Serviceability
- [x] Pincode availability check
- [x] COD availability check
- [x] Estimated delivery days
- [x] Shipping cost calculation

### 6.2 Shipment Management
- [x] Create shipment in Shiprocket
- [x] AWB code generation
- [x] Shipping label generation (PDF)
- [x] Manifest generation
- [x] Pickup scheduling
- [x] Courier selection (7 providers)

### 6.3 Tracking
- [x] Track by AWB code
- [x] Track by order ID
- [x] Shipment events logging
- [x] Webhook for status updates
- [x] Delivery confirmation

---

## 7. Payment Integration (Razorpay)

### 7.1 Payment Processing
- [x] Create Razorpay order
- [x] INR to paise conversion
- [x] Payment signature verification
- [x] Webhook signature verification
- [x] Payment capture

### 7.2 Payment Methods
- [x] UPI payments
- [x] Card payments
- [x] Net banking
- [x] Wallets
- [x] Cash on Delivery (COD)

### 7.3 Refunds
- [x] Full refund
- [x] Partial refund
- [x] Refund status tracking
- [x] Refund reason capture
- [x] Auto-restore inventory on refund

### 7.4 Webhooks
- [x] payment.captured event
- [x] payment.failed event
- [x] refund.created event
- [x] refund.processed event
- [x] refund.failed event

---

## 8. Email Service (Resend)

### 8.1 Customer Emails
- [x] Order confirmation email
- [x] Order shipped email with tracking
- [x] Order delivered email
- [x] Order cancelled email
- [x] Refund processed email
- [x] Abandoned cart recovery emails (3-email sequence)

### 8.2 Merchant Emails
- [x] New order alert
- [x] Low stock alert
- [x] Welcome email after store creation

### 8.3 Email Features
- [x] React Email templates
- [x] Responsive HTML emails
- [x] Unsubscribe links (cart recovery)
- [x] Console fallback if API key missing

---

## 9. WhatsApp Notifications (MSG91)

### 9.1 Customer Notifications
- [x] Order confirmation
- [x] Order shipped
- [x] Out for delivery
- [x] Order delivered
- [x] COD payment reminder
- [x] Abandoned cart recovery

### 9.2 WhatsApp Features
- [x] Template-based messages
- [x] MSG91 integration
- [x] Dynamic template variables

---

## 10. Coupons & Discounts

### 10.1 Coupon Types
- [x] Percentage discount
- [x] Fixed amount discount
- [x] Free shipping

### 10.2 Coupon Settings
- [x] Minimum order value
- [x] Maximum discount cap
- [x] Usage limit (total)
- [x] Usage limit per customer
- [x] Valid date range (starts_at, expires_at)
- [x] Active/inactive toggle

### 10.3 Coupon Management
- [x] Create coupon
- [x] Edit coupon
- [x] Delete coupon
- [x] View usage stats
- [x] Apply coupon at checkout
- [x] Validate coupon rules

---

## 11. Product Reviews

### 11.1 Review Submission
- [x] Star rating (1-5)
- [x] Review title
- [x] Review text
- [x] Verified purchase badge
- [x] One review per customer per product

### 11.2 Review Moderation
- [x] Pending/Approved/Rejected status
- [x] Approve review
- [x] Reject review
- [x] Delete review

### 11.3 Review Display
- [x] Product average rating
- [x] Review count
- [x] Rating distribution
- [x] Helpful/Not helpful voting

---

## 12. Collections

### 12.1 Collection Management
- [x] Create collection
- [x] Edit collection (title, description, image)
- [x] Delete collection
- [x] Collection slug (URL-friendly)

### 12.2 Collection Products
- [x] Add products to collection
- [x] Remove products from collection
- [x] Product position ordering

### 12.3 Collection Display
- [x] Featured collections
- [x] Collection visibility toggle
- [x] Collection cover image
- [x] SEO meta fields

---

## 13. Customer Accounts

### 13.1 Customer Profile
- [x] View profile information
- [x] Total orders count
- [x] Total spent amount
- [x] Member since date

### 13.2 Saved Addresses
- [x] Add address
- [x] Edit address
- [x] Delete address
- [x] Set default address
- [x] Address labels (Home, Work, Other)

### 13.3 Order History
- [x] View past orders
- [x] Order details
- [x] Download invoice

### 13.4 Wishlist
- [x] Add to wishlist
- [x] Remove from wishlist
- [x] View wishlist

---

## 14. Abandoned Cart Recovery

### 14.1 Cart Tracking
- [x] Save cart contents
- [x] Guest cart tracking (by email)
- [x] Customer cart tracking
- [x] Cart expiry (7 days)

### 14.2 Recovery Flow
- [x] 3-email sequence
- [x] Configurable delays (1h, 24h, 72h)
- [x] Recovery token generation
- [x] Cart restoration from token
- [x] Mark cart as recovered on order

### 14.3 Recovery Settings
- [x] Enable/disable recovery
- [x] Custom email subjects
- [x] Discount code in final email
- [x] Unsubscribe functionality

---

## 15. AI Recommendations

### 15.1 Recommendation Types
- [x] Similar products
- [x] Frequently bought together
- [x] Trending products
- [x] Personalized recommendations

### 15.2 Recommendation Engine
- [x] Category-based matching
- [x] Tag overlap scoring
- [x] Price range similarity
- [x] Purchase history analysis
- [x] AI-enhanced recommendations (large catalogs)

---

## 16. Analytics & Dashboard

### 16.1 Dashboard Stats
- [x] Total products count
- [x] Published products count
- [x] Total orders count
- [x] Total revenue
- [x] Average order value
- [x] Pending orders count

### 16.2 Analytics Features
- [x] Revenue trend chart
- [x] Top selling products
- [x] Recent orders table
- [x] Period selector (7d, 30d, 90d, 1y)

### 16.3 Marketing Pixels
- [x] Facebook Pixel integration
- [x] Google Analytics 4 integration
- [x] Google Ads conversion tracking

---

## 17. Store Settings

### 17.1 Store Information
- [x] Store name, tagline, description
- [x] Contact email, phone
- [x] WhatsApp number
- [x] Instagram handle

### 17.2 Branding
- [x] Primary color picker
- [x] Color accessibility checker (WCAG)
- [x] Logo upload
- [x] AI logo generation
- [x] Logo generation quota tracking

### 17.3 Shipping Settings
- [x] Free shipping threshold
- [x] Flat rate shipping
- [x] COD enable/disable
- [x] COD fee configuration

### 17.4 Checkout Settings
- [x] Guest checkout toggle
- [x] Phone required toggle

### 17.5 Legal Policies
- [x] Returns policy editor
- [x] Privacy policy editor
- [x] Terms & conditions editor
- [x] Shipping policy editor
- [x] AI policy regeneration

### 17.6 Data Management
- [x] Export products (CSV/JSON)
- [x] Export orders (CSV/JSON)
- [x] Rebuild store option

---

## 18. Storefront (Public)

### 18.1 Store Themes
- [x] Modern Minimal theme
- [x] Classic Elegant theme
- [x] Playful Bright theme
- [x] Minimal Zen theme

### 18.2 Store Pages
- [x] Homepage with hero, featured products, collections
- [x] Products catalog with filters
- [x] Product detail page
- [x] Collections page
- [x] Collection detail page
- [x] About page
- [x] Contact page
- [x] Policy pages (4 types)
- [x] Search results page

### 18.3 Shopping Cart
- [x] Add to cart
- [x] Update quantity
- [x] Remove item
- [x] Cart persistence (localStorage)
- [x] Mini cart preview
- [x] Cart totals calculation

### 18.4 Checkout
- [x] Order review
- [x] Shipping address form
- [x] Pincode validation
- [x] Coupon application
- [x] Payment method selection
- [x] Razorpay payment flow
- [x] COD order placement
- [x] Guest checkout
- [x] Order confirmation page

### 18.5 Product Features
- [x] Image gallery
- [x] Variant selector
- [x] Quantity selector
- [x] Add to cart button
- [x] Out of stock state
- [x] Product reviews display
- [x] Related products

---

## 19. Notifications

### 19.1 Notification Types
- [x] New order notification
- [x] Low stock notification
- [x] New review notification
- [x] Refund requested
- [x] Payment failed
- [x] System notifications

### 19.2 Notification Features
- [x] Unread count badge
- [x] Mark as read
- [x] Mark all as read
- [x] Notification bell in navbar
- [x] Notification priorities

---

## 20. Search & Discovery

### 20.1 Search Features
- [x] Product search by title
- [x] Search suggestions/autocomplete
- [x] Search results page
- [x] Filter by category
- [x] Sort options

### 20.2 Product Discovery
- [x] Category browsing
- [x] Collection browsing
- [x] Featured products section
- [x] Trending products

---

## 21. Security & Rate Limiting

### 21.1 Rate Limiting
- [x] API rate limiting (100 req/min)
- [x] AI endpoints (10 req/min)
- [x] Auth endpoints (5 req/min)
- [x] Checkout (20 req/min)
- [x] Upload (10 req/min)
- [x] IP-based limiting

### 21.2 Security Features
- [x] Razorpay signature verification
- [x] Webhook signature verification
- [x] Row Level Security (RLS) on all tables
- [x] Password hashing (bcrypt/scrypt)
- [x] Session token security
- [x] CRON_SECRET for cron jobs

---

## 22. Cron Jobs

### 22.1 Scheduled Tasks
- [x] Low stock check
- [x] Abandoned cart processing
- [x] Expired session cleanup
- [x] Expired reservation cleanup

---

## 23. Data Export

### 23.1 Export Options
- [x] Products export (CSV/JSON)
- [x] Orders export (CSV)
- [x] Customers export (future)

---

# PART 2: TESTING CHECKLIST

## API Routes Testing

### Authentication APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/auth/sign-up` | POST | Valid registration | ☐ |
| `/api/auth/sign-up` | POST | Duplicate email rejection | ☐ |
| `/api/auth/sign-up` | POST | Weak password rejection | ☐ |
| `/api/auth/sign-in` | POST | Valid login | ☐ |
| `/api/auth/sign-in` | POST | Invalid credentials | ☐ |
| `/api/auth/sign-out` | POST | Session cleared | ☐ |
| `/api/auth/user` | GET | Returns user with store | ☐ |
| `/api/auth/profile` | PATCH | Update profile fields | ☐ |
| `/api/auth/2fa/setup` | POST | Generate QR code | ☐ |
| `/api/auth/2fa/verify` | POST | Enable 2FA | ☐ |
| `/api/auth/2fa/verify` | POST | Login with 2FA | ☐ |
| `/api/auth/2fa/disable` | POST | Disable 2FA | ☐ |
| `/api/auth/callback` | GET | OAuth callback | ☐ |

### Product APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/products/upload` | POST | Create with images | ☐ |
| `/api/products/upload` | POST | AI analysis triggered | ☐ |
| `/api/products/upload` | POST | Demo products removed | ☐ |
| `/api/products/analyze-image` | POST | Returns AI suggestions | ☐ |
| `/api/products/suggest-price` | POST | Returns price/reasoning | ☐ |
| `/api/products/bulk-upload` | POST | CSV import works | ☐ |
| `/api/products/bulk-upload` | GET | CSV template download | ☐ |
| `/api/products/list` | GET | Paginated results | ☐ |
| `/api/products/list` | GET | Filter by status | ☐ |
| `/api/products/list` | GET | Search works | ☐ |
| `/api/products/[id]` | GET | Returns product | ☐ |
| `/api/products/[id]` | PATCH | Update fields | ☐ |
| `/api/products/[id]` | DELETE | Soft delete | ☐ |
| `/api/products/[id]/variants` | GET | Returns variants | ☐ |
| `/api/products/[id]/variants` | POST | Create variants | ☐ |
| `/api/products/[id]/variants/generate` | POST | Auto-generate combinations | ☐ |
| `/api/products/[id]/publish` | GET | Publish product | ☐ |
| `/api/products/[id]/reviews` | GET | Returns reviews | ☐ |

### Order APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/orders/create` | POST | Create Razorpay order | ☐ |
| `/api/orders/create` | POST | Create COD order | ☐ |
| `/api/orders/create` | POST | Inventory reserved | ☐ |
| `/api/orders/verify-payment` | POST | Verify signature | ☐ |
| `/api/orders/verify-payment` | POST | Inventory reduced | ☐ |
| `/api/orders/verify-payment` | POST | Email sent | ☐ |
| `/api/orders/[orderId]` | GET | Returns order details | ☐ |
| `/api/orders/[orderId]/invoice` | GET | Returns PDF | ☐ |
| `/api/orders/lookup/[orderNumber]` | GET | Find by order number | ☐ |

### Dashboard APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/dashboard/orders` | GET | Paginated orders | ☐ |
| `/api/dashboard/orders/[orderId]` | GET | Order detail | ☐ |
| `/api/dashboard/orders/[orderId]/refund` | POST | Process refund | ☐ |
| `/api/dashboard/products` | GET | Product list | ☐ |
| `/api/dashboard/coupons` | GET | Coupon list | ☐ |
| `/api/dashboard/coupons` | POST | Create coupon | ☐ |
| `/api/dashboard/coupons/[id]` | PATCH | Update coupon | ☐ |
| `/api/dashboard/coupons/[id]` | DELETE | Delete coupon | ☐ |
| `/api/dashboard/collections` | GET | Collection list | ☐ |
| `/api/dashboard/collections` | POST | Create collection | ☐ |
| `/api/dashboard/collections/[id]/products` | POST | Add products | ☐ |
| `/api/dashboard/bulk-actions` | POST | Bulk operations | ☐ |
| `/api/dashboard/settings` | GET | Get settings | ☐ |
| `/api/dashboard/settings` | PATCH | Update settings | ☐ |
| `/api/dashboard/logo/generate` | POST | AI logo generation | ☐ |
| `/api/dashboard/reviews` | GET | Review list | ☐ |
| `/api/dashboard/reviews/[id]` | PATCH | Approve/reject | ☐ |
| `/api/dashboard/stats` | GET | Dashboard stats | ☐ |
| `/api/dashboard/export-data` | POST | Export data | ☐ |

### Store/Storefront APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/store/[slug]/data` | GET | Returns store data | ☐ |
| `/api/store/[slug]/products` | GET | Paginated products | ☐ |
| `/api/store/[slug]/products/[id]` | GET | Single product | ☐ |
| `/api/store/[slug]/collections` | GET | Collections | ☐ |
| `/api/stores/policies` | GET | Returns policies | ☐ |

### Cart APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/cart/save` | POST | Save cart | ☐ |
| `/api/cart/validate` | POST | Validate items | ☐ |
| `/api/cart/apply-coupon` | POST | Apply coupon | ☐ |
| `/api/cart/apply-coupon` | POST | Invalid coupon rejected | ☐ |
| `/api/cart/check-inventory` | POST | Stock check | ☐ |

### Customer APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/customer/register` | POST | Create account | ☐ |
| `/api/customer/register` | POST | Duplicate email rejected | ☐ |
| `/api/customer/login` | POST | Valid login | ☐ |
| `/api/customer/login` | POST | Rate limit after 5 fails | ☐ |
| `/api/customer/logout` | POST | Session cleared | ☐ |
| `/api/customer/me` | GET | Returns profile | ☐ |
| `/api/customer/orders` | GET | Order history | ☐ |
| `/api/customer/addresses` | GET | Address list | ☐ |
| `/api/customer/addresses` | POST | Add address | ☐ |
| `/api/customer/wishlist` | GET | Wishlist items | ☐ |
| `/api/customer/wishlist` | POST | Add to wishlist | ☐ |

### Shipping APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/shipping/check-pincode` | POST | Valid pincode | ☐ |
| `/api/shipping/check-pincode` | POST | Invalid pincode | ☐ |
| `/api/shipping/calculate` | POST | Returns cost | ☐ |
| `/api/shipping/create-shipment` | POST | Shiprocket order | ☐ |
| `/api/shipping/track` | GET | Tracking events | ☐ |

### AI APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/ai/chat` | POST | Streaming response | ☐ |
| `/api/ai/generate-content` | POST | Content generation | ☐ |
| `/api/recommendations` | GET | Similar products | ☐ |
| `/api/recommendations` | GET | Trending products | ☐ |

### Notification APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/notifications` | GET | Notification list | ☐ |
| `/api/notifications/[id]` | PATCH | Mark read | ☐ |
| `/api/notifications/read-all` | POST | Mark all read | ☐ |

### Webhook APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/webhooks/razorpay` | POST | payment.captured | ☐ |
| `/api/webhooks/razorpay` | POST | refund.processed | ☐ |
| `/api/webhooks/razorpay` | POST | Invalid signature rejected | ☐ |
| `/api/webhooks/shiprocket` | POST | Status update | ☐ |

### Cron APIs
| Route | Method | Test Case | Status |
|-------|--------|-----------|--------|
| `/api/cron/check-low-stock` | GET | Sends alerts | ☐ |
| `/api/cron/process-abandoned-carts` | GET | Sends recovery emails | ☐ |

---

## Page Testing

### Authentication Pages
| Page | Test Case | Status |
|------|-----------|--------|
| `/sign-in` | Form validation | ☐ |
| `/sign-in` | Successful login → redirect | ☐ |
| `/sign-in` | Google OAuth flow | ☐ |
| `/sign-up` | Form validation | ☐ |
| `/sign-up` | Password strength indicator | ☐ |
| `/sign-up` | Successful registration | ☐ |

### Dashboard Pages
| Page | Test Case | Status |
|------|-----------|--------|
| `/dashboard` | Shows stats cards | ☐ |
| `/dashboard` | Getting started checklist | ☐ |
| `/dashboard` | AI suggestions widget | ☐ |
| `/dashboard/products` | Product grid/list view | ☐ |
| `/dashboard/products` | Search and filter | ☐ |
| `/dashboard/products` | Delete product | ☐ |
| `/dashboard/products/new` | Create product form | ☐ |
| `/dashboard/products/new` | AI image analysis | ☐ |
| `/dashboard/products/new` | Variant creation | ☐ |
| `/dashboard/orders` | Order list with tabs | ☐ |
| `/dashboard/orders` | Search/filter | ☐ |
| `/dashboard/orders/[id]` | Order details display | ☐ |
| `/dashboard/orders/[id]` | Update status | ☐ |
| `/dashboard/orders/[id]` | Process refund | ☐ |
| `/dashboard/collections` | Create collection | ☐ |
| `/dashboard/collections` | Add products | ☐ |
| `/dashboard/coupons` | Create coupon | ☐ |
| `/dashboard/coupons` | Edit/delete coupon | ☐ |
| `/dashboard/reviews` | Moderate reviews | ☐ |
| `/dashboard/analytics` | Charts render | ☐ |
| `/dashboard/analytics` | Period selection | ☐ |
| `/dashboard/settings` | Update store info | ☐ |
| `/dashboard/settings` | Logo upload/generate | ☐ |
| `/dashboard/settings` | Color picker | ☐ |
| `/dashboard/settings/marketing` | Pixel setup | ☐ |
| `/dashboard/settings/policies` | Edit policies | ☐ |

### Onboarding
| Page | Test Case | Status |
|------|-----------|--------|
| `/onboarding` | 10-step flow completion | ☐ |
| `/onboarding` | AI suggestions appear | ☐ |
| `/onboarding` | Logo generation (3 max) | ☐ |
| `/onboarding` | Template preview | ☐ |
| `/onboarding` | Store activation | ☐ |

### Storefront Pages
| Page | Test Case | Status |
|------|-----------|--------|
| `/{store}` | Homepage renders | ☐ |
| `/{store}` | Theme applied correctly | ☐ |
| `/{store}/products` | Product grid | ☐ |
| `/{store}/products` | Category filter | ☐ |
| `/{store}/products` | Pagination | ☐ |
| `/{store}/products/[id]` | Product details | ☐ |
| `/{store}/products/[id]` | Variant selector | ☐ |
| `/{store}/products/[id]` | Add to cart | ☐ |
| `/{store}/products/[id]` | Reviews section | ☐ |
| `/{store}/cart` | Cart items display | ☐ |
| `/{store}/cart` | Quantity update | ☐ |
| `/{store}/cart` | Remove item | ☐ |
| `/{store}/checkout` | Address form | ☐ |
| `/{store}/checkout` | Pincode validation | ☐ |
| `/{store}/checkout` | Coupon application | ☐ |
| `/{store}/checkout` | Razorpay payment | ☐ |
| `/{store}/checkout` | COD order | ☐ |
| `/{store}/thank-you` | Order confirmation | ☐ |
| `/{store}/collections` | Collections list | ☐ |
| `/{store}/collections/[slug]` | Collection products | ☐ |
| `/{store}/about` | About page | ☐ |
| `/{store}/contact` | Contact form | ☐ |
| `/{store}/policies/[type]` | Policy content | ☐ |
| `/{store}/account` | Customer dashboard | ☐ |
| `/{store}/account/login` | Customer login | ☐ |
| `/{store}/account/orders` | Order history | ☐ |

---

## Form Testing

### Product Form
| Field | Validation | Status |
|-------|-----------|--------|
| Title | Required, max 200 chars | ☐ |
| Price | Required, positive number | ☐ |
| Compare At Price | Greater than price | ☐ |
| Quantity | Non-negative integer | ☐ |
| SKU | Unique per store | ☐ |
| Images | Max 10, valid types | ☐ |
| Categories | Array of strings | ☐ |
| Tags | Array of strings | ☐ |

### Checkout Form
| Field | Validation | Status |
|-------|-----------|--------|
| Email | Valid email format | ☐ |
| Phone | 10 digits, starts 6-9 | ☐ |
| Full Name | Required | ☐ |
| Address Line 1 | Required | ☐ |
| City | Required | ☐ |
| State | Required | ☐ |
| Pincode | 6 digits, valid | ☐ |

### Coupon Form
| Field | Validation | Status |
|-------|-----------|--------|
| Code | Unique per store | ☐ |
| Discount Type | percentage/fixed/free_shipping | ☐ |
| Discount Value | Positive, ≤100 for % | ☐ |
| Min Order Value | Non-negative | ☐ |
| Usage Limit | Positive integer | ☐ |
| Date Range | Valid dates | ☐ |

---

## Integration Testing

### Payment Flow
| Test Case | Status |
|-----------|--------|
| Razorpay checkout opens | ☐ |
| Payment success → order confirmed | ☐ |
| Payment failure → order cancelled | ☐ |
| Webhook updates order status | ☐ |
| Refund processes correctly | ☐ |
| COD order created without payment | ☐ |

### Shipping Flow
| Test Case | Status |
|-----------|--------|
| Pincode check works | ☐ |
| Shipment created in Shiprocket | ☐ |
| AWB assigned | ☐ |
| Label generated | ☐ |
| Tracking updates received | ☐ |

### Email Flow
| Test Case | Status |
|-----------|--------|
| Order confirmation sent | ☐ |
| Shipped notification sent | ☐ |
| Merchant new order alert | ☐ |
| Low stock alert sent | ☐ |
| Abandoned cart emails (3 sequence) | ☐ |

---

# PART 3: INCOMPLETE/IMPROVABLE FEATURES

## Half-Implemented Features

### 1. Product Duplicate
- **Current State:** UI button exists, API returns "Coming soon"
- **Needed:** Implement duplication logic for product + images + variants

### 2. Customer Export
- **Current State:** Products/Orders export works, Customers mentioned but not implemented
- **Needed:** `/api/dashboard/export-data` with type="customers"

### 3. Search Autocomplete
- **Current State:** `/api/search/suggestions` route exists but implementation unclear
- **Needed:** Verify frontend uses autocomplete dropdown

### 4. Review Images
- **Current State:** Schema supports `images` array, but upload UI not visible
- **Needed:** Image upload in review submission form

### 5. Collection SEO
- **Current State:** `meta_title`, `meta_description` fields exist
- **Needed:** UI to edit SEO fields, add to page metadata

### 6. Inventory History/Audit Log
- **Current State:** Not implemented
- **Needed:** Track all inventory changes with timestamps and reasons

### 7. Multi-Language Support
- **Current State:** Mentioned as pending in CLAUDE.md
- **Needed:** i18n framework, translated content

### 8. Platform Admin Dashboard
- **Current State:** Not implemented
- **Needed:** `/admin` routes for platform-wide management

---

## Features That Can Be Improved

### 1. Subdomain Routing
- **Current:** Stores at `/{storeSlug}/*`
- **Improvement:** Enable `{store}.storeforge.site` subdomain routing
- **Files:** `middleware.ts`, `vercel.json`

### 2. Real-Time Notifications
- **Current:** Database-based, requires polling
- **Improvement:** Use Supabase Realtime for instant updates

### 3. Email Service Fallback
- **Current:** Falls back to console.log if no API key
- **Improvement:** Make Resend API key required for production

### 4. Shipping Rate Calculation
- **Current:** Some routes exist, but may use static rates
- **Improvement:** Real-time Shiprocket API rate calculation at checkout

### 5. Analytics Depth
- **Current:** Basic stats (revenue, orders, products)
- **Improvement:** Conversion rate, cart abandonment %, traffic sources, cohort analysis

### 6. SEO
- **Current:** Basic metadata
- **Improvement:** JSON-LD structured data, dynamic sitemap per store, Open Graph images

### 7. Mobile UX
- **Current:** Responsive but not mobile-optimized
- **Improvement:** Sticky add-to-cart, bottom navigation, swipe gestures

### 8. Error Boundaries
- **Current:** Limited error handling
- **Improvement:** React error boundaries on all pages, user-friendly error pages

### 9. Performance
- **Current:** Standard Next.js
- **Improvement:** Image srcset optimization, route prefetching, skeleton loaders

### 10. Webhook Security
- **Current:** Basic signature verification
- **Improvement:** IP allowlisting, idempotency keys, event logging

---

## Not Yet Implemented Features

### 1. Custom Domains
- Allow merchants to connect their own domain
- SSL certificate management
- DNS verification wizard

### 2. Multi-Currency
- Support USD and other currencies
- Currency conversion rates
- Per-store currency settings

### 3. PWA Support
- Make stores installable as PWAs
- Offline product browsing
- Push notifications

### 4. Subscription/Recurring Payments
- Subscription products
- Recurring billing
- Subscription management dashboard

### 5. Multi-Vendor Marketplace
- Multiple sellers per store
- Vendor commissions
- Vendor payouts

### 6. Advanced Inventory
- Multiple warehouse support
- Inventory transfer between locations
- Batch/lot tracking
- Serial number tracking

### 7. B2B Features
- Wholesale pricing tiers
- Minimum order quantities
- Quote requests
- Net payment terms

### 8. Loyalty Program
- Points system
- Rewards/tier levels
- Points redemption

### 9. Gift Cards
- Digital gift cards
- Balance tracking
- Gift card redemption

### 10. Advanced Shipping
- Real-time carrier rates
- Shipping zones
- Local pickup
- Delivery date selection

### 11. Tax Automation
- GST calculation by state
- Tax-exempt customers
- Tax reports

### 12. Automated Marketing
- Email sequences beyond cart recovery
- Product launch announcements
- Re-engagement campaigns
- Review request automation

### 13. Social Commerce
- Instagram shopping integration
- Facebook shop sync
- WhatsApp catalog

### 14. A/B Testing
- Price testing
- Product page variants
- Checkout optimization

### 15. Advanced Reports
- Profit margins
- Customer lifetime value
- Product performance
- Inventory forecasting

---

## Verification Plan

After testing, verify:

1. **Complete User Journey:**
   - Sign up → Onboarding → Add products → Receive order → Ship → Deliver

2. **Payment Processing:**
   - Test mode payment successful
   - Refund processed correctly

3. **Email Delivery:**
   - All 9 email templates render correctly
   - Emails delivered to inbox (not spam)

4. **Mobile Experience:**
   - Test on iOS Safari
   - Test on Android Chrome

5. **Performance:**
   - Lighthouse score > 80 on all metrics
   - Page load < 3 seconds

---

*Document created: 2026-01-26*
*Codebase: StoreForge AI Store Builder*
