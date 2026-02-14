-- Store Migrations table for Shopify/Etsy product import
CREATE TABLE IF NOT EXISTS store_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopify', 'etsy')),
  source_shop_id TEXT,
  source_shop_name TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  total_products INT DEFAULT 0,
  migrated_products INT DEFAULT 0,
  failed_products INT DEFAULT 0,
  total_collections INT DEFAULT 0,
  migrated_collections INT DEFAULT 0,
  failed_collections INT DEFAULT 0,
  total_images INT DEFAULT 0,
  migrated_images INT DEFAULT 0,
  failed_images INT DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  product_id_map JSONB DEFAULT '{}'::jsonb,
  collection_id_map JSONB DEFAULT '{}'::jsonb,
  last_cursor TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_store_migrations_store_id ON store_migrations(store_id);

ALTER TABLE store_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own store migrations"
  ON store_migrations FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
