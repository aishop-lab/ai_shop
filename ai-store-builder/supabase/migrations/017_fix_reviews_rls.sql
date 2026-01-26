-- Migration: 017_fix_reviews_rls
-- Description: Fix product_reviews RLS policy to not access auth.users directly
-- This fixes "permission denied for table users" error for anonymous users

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON product_reviews;

-- Create new policy that handles anonymous users properly
-- Anonymous users can only see approved reviews
-- Authenticated users can also see their own reviews (any status) and reviews for their store's products
CREATE POLICY "Anyone can view approved reviews"
  ON product_reviews FOR SELECT
  USING (
    -- Anyone can see approved reviews
    status = 'approved'
    OR
    -- Store owners can see all reviews for their products (for moderation)
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM products p
        JOIN stores s ON s.id = p.store_id
        WHERE p.id = product_reviews.product_id
        AND s.owner_id = auth.uid()
      )
    )
    OR
    -- Customers can see their own reviews (using customer_id instead of email lookup)
    (
      auth.uid() IS NOT NULL
      AND customer_id = auth.uid()
    )
  );

-- Also add a simpler public policy specifically for storefront access
-- This ensures unauthenticated users can definitely see approved reviews
DROP POLICY IF EXISTS "Public can view approved reviews" ON product_reviews;
CREATE POLICY "Public can view approved reviews"
  ON product_reviews FOR SELECT
  USING (status = 'approved');
