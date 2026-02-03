-- Add Google OAuth support for customer accounts
-- Allows customers to sign in with Google on any store

-- Add google_id column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS google_id TEXT;

-- Create index for faster Google ID lookups
CREATE INDEX IF NOT EXISTS idx_customers_google_id ON customers(google_id) WHERE google_id IS NOT NULL;

-- Add unique constraint per store (a Google account can only be linked once per store)
-- But same Google account can be used across different stores
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_store_google_id
ON customers(store_id, google_id)
WHERE google_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN customers.google_id IS 'Google OAuth user ID (sub claim from ID token)';
