-- Expanded migration tracking: Orders, Customers, Coupons
-- Adds progress columns and ID maps for the new import phases

ALTER TABLE store_migrations
  ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS migrated_orders INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_orders INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_customers INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS migrated_customers INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_customers INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_coupons INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS migrated_coupons INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_coupons INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_id_map JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS order_id_map JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS coupon_id_map JSONB DEFAULT '{}'::jsonb;
