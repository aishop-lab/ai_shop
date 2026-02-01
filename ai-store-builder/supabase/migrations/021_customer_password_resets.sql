-- Migration: 021_customer_password_resets
-- Description: Add password reset tokens table for customer accounts
-- Safe to re-run

-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customer_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT customer_password_resets_token_hash_unique UNIQUE (token_hash)
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_customer_password_resets_token_hash
ON customer_password_resets(token_hash);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_customer_password_resets_expires_at
ON customer_password_resets(expires_at);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE customer_password_resets ENABLE ROW LEVEL SECURITY;

-- Only service role can access (no direct user access needed)
-- Tokens are accessed via API routes using service role

-- ============================================
-- CLEANUP FUNCTION FOR EXPIRED TOKENS
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM customer_password_resets
  WHERE expires_at < NOW();
END;
$$;

-- ============================================
-- DOCUMENTATION
-- ============================================
COMMENT ON TABLE customer_password_resets IS 'Stores password reset tokens for customer accounts';
COMMENT ON COLUMN customer_password_resets.token_hash IS 'SHA256 hash of the reset token (token sent via email)';
COMMENT ON COLUMN customer_password_resets.expires_at IS 'When the reset token expires (typically 1 hour)';
