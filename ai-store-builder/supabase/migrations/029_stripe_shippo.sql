-- Stripe + Shippo Integration Migration
-- Adds Stripe payment credentials to stores and Stripe/currency fields to orders

-- Stripe credentials on stores table (mirrors Razorpay pattern)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS stripe_secret_key_encrypted TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS stripe_webhook_secret_encrypted TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS stripe_credentials_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS stripe_credentials_verified_at TIMESTAMPTZ;

-- Stripe fields on orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Currency on orders (previously implicit INR)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
