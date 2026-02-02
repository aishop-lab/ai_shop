-- Migration: Add per-store Razorpay credentials
-- This allows merchants to configure their own Razorpay accounts for direct settlement

-- Add Razorpay credential columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_key_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS razorpay_webhook_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS razorpay_credentials_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS razorpay_credentials_verified_at TIMESTAMPTZ;

-- Add index for looking up stores by Razorpay key ID
-- This is useful when processing webhooks where we need to find the store
CREATE INDEX IF NOT EXISTS idx_stores_razorpay_key_id
ON stores(razorpay_key_id) WHERE razorpay_key_id IS NOT NULL;

-- Add comment explaining the encrypted fields
COMMENT ON COLUMN stores.razorpay_key_id IS 'Public Razorpay Key ID (rzp_live_xxx or rzp_test_xxx)';
COMMENT ON COLUMN stores.razorpay_key_secret_encrypted IS 'AES-256-GCM encrypted Razorpay Key Secret';
COMMENT ON COLUMN stores.razorpay_webhook_secret_encrypted IS 'AES-256-GCM encrypted Razorpay Webhook Secret';
COMMENT ON COLUMN stores.razorpay_credentials_verified IS 'Whether the credentials have been verified against Razorpay API';
COMMENT ON COLUMN stores.razorpay_credentials_verified_at IS 'When the credentials were last verified';
