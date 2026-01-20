-- Migration: 009_store_policies
-- Description: Add policies column to stores table for legal documents

-- Add policies JSONB column
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS policies JSONB DEFAULT '{
  "returns": {"content": "", "updated_at": null},
  "privacy": {"content": "", "updated_at": null},
  "terms": {"content": "", "updated_at": null},
  "shipping": {"content": "", "updated_at": null}
}'::jsonb;

-- Create index for policy lookup
CREATE INDEX IF NOT EXISTS idx_stores_policies ON stores USING gin(policies);
