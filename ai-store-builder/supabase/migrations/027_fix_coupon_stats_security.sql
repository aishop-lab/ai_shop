-- =============================================
-- Migration: Fix coupon_stats view security
-- =============================================
-- Changes coupon_stats view from SECURITY DEFINER to SECURITY INVOKER
-- to ensure RLS policies are properly enforced when querying the view.

-- Drop and recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS coupon_stats;

CREATE VIEW coupon_stats
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.store_id,
  c.code,
  c.discount_type,
  c.discount_value,
  c.usage_count,
  c.usage_limit,
  c.active,
  c.expires_at,
  COALESCE(SUM(cu.discount_amount), 0) as total_discount_given,
  COUNT(DISTINCT cu.order_id) as orders_with_coupon
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
GROUP BY c.id;

COMMENT ON VIEW coupon_stats IS 'Coupon statistics with proper RLS enforcement';
