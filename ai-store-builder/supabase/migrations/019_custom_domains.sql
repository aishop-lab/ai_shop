-- Migration: 019_custom_domains
-- Description: Add custom domain support to stores table
-- Safe to re-run

-- ============================================
-- ADD CUSTOM DOMAIN COLUMNS TO STORES
-- ============================================
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS custom_domain_dns_target TEXT,
ADD COLUMN IF NOT EXISTS custom_domain_ssl_status TEXT DEFAULT 'pending';

-- ============================================
-- UNIQUE CONSTRAINT ON CUSTOM DOMAIN
-- ============================================
-- Only one store can have a given custom domain
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stores_custom_domain_unique'
  ) THEN
    ALTER TABLE stores ADD CONSTRAINT stores_custom_domain_unique UNIQUE (custom_domain);
  END IF;
END $$;

-- ============================================
-- INDEX FOR CUSTOM DOMAIN LOOKUPS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain
ON stores(custom_domain)
WHERE custom_domain IS NOT NULL AND custom_domain_verified = true;

-- ============================================
-- FUNCTION TO LOOKUP STORE BY DOMAIN
-- ============================================
CREATE OR REPLACE FUNCTION get_store_by_custom_domain(p_domain TEXT)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  name TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.slug, s.name, s.status
  FROM stores s
  WHERE s.custom_domain = LOWER(p_domain)
    AND s.custom_domain_verified = true
    AND s.status = 'active';
END;
$$;

-- ============================================
-- DOCUMENTATION
-- ============================================
COMMENT ON COLUMN stores.custom_domain IS 'Custom domain configured for this store (e.g., myshop.com)';
COMMENT ON COLUMN stores.custom_domain_verified IS 'Whether the custom domain DNS has been verified';
COMMENT ON COLUMN stores.custom_domain_verified_at IS 'When the custom domain was verified';
COMMENT ON COLUMN stores.custom_domain_dns_target IS 'The CNAME target for DNS verification (e.g., cname.vercel-dns.com)';
COMMENT ON COLUMN stores.custom_domain_ssl_status IS 'SSL certificate status: pending, issued, failed';
