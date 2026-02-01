-- Migration: 020_domain_verification_token
-- Description: Add verification token for DNS TXT record verification
-- Safe to re-run

-- ============================================
-- ADD VERIFICATION TOKEN COLUMN
-- ============================================
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS custom_domain_verification_token TEXT;

-- ============================================
-- DOCUMENTATION
-- ============================================
COMMENT ON COLUMN stores.custom_domain_verification_token IS 'Unique token for DNS TXT record verification (_storeforge-verify.domain.com TXT "token")';
