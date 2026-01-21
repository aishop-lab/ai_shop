-- Migration: 008_product_reviews
-- Description: Create product reviews and ratings system
-- Safe to re-run

-- ============================================
-- CLEANUP (for re-running)
-- ============================================

-- Drop indexes first (in case tables were partially created)
DROP INDEX IF EXISTS idx_reviews_product_id;
DROP INDEX IF EXISTS idx_reviews_status;
DROP INDEX IF EXISTS idx_reviews_rating;
DROP INDEX IF EXISTS idx_reviews_customer_email;
DROP INDEX IF EXISTS idx_reviews_order_id;
DROP INDEX IF EXISTS idx_reviews_created_at;
DROP INDEX IF EXISTS idx_review_votes_review_id;
DROP INDEX IF EXISTS idx_review_votes_customer_email;

-- Drop tables (CASCADE handles policies, triggers)
DROP TABLE IF EXISTS review_votes CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_review_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS update_product_rating() CASCADE;
DROP FUNCTION IF EXISTS update_review_timestamp() CASCADE;
DROP FUNCTION IF EXISTS get_rating_distribution(UUID) CASCADE;

-- ============================================
-- PRODUCT REVIEWS TABLE
-- ============================================
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),

  -- Customer info
  customer_id UUID REFERENCES auth.users(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  review_text TEXT NOT NULL,

  -- Media (for future use)
  images TEXT[],

  -- Moderation
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES auth.users(id),

  -- Engagement
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  -- Verification
  verified_purchase BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_customer_product_review UNIQUE (customer_email, product_id)
);

-- ============================================
-- REVIEW VOTES TABLE
-- ============================================
CREATE TABLE review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_review_vote UNIQUE (review_id, customer_email)
);

-- ============================================
-- UPDATE PRODUCTS TABLE
-- ============================================
ALTER TABLE products
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_reviews_status ON product_reviews(status);
CREATE INDEX idx_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_reviews_customer_email ON product_reviews(customer_email);
CREATE INDEX idx_reviews_order_id ON product_reviews(order_id);
CREATE INDEX idx_reviews_created_at ON product_reviews(created_at DESC);
CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX idx_review_votes_customer_email ON review_votes(customer_email);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PRODUCT REVIEWS RLS POLICIES
-- ============================================

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON product_reviews FOR SELECT
  USING (
    status = 'approved'
    OR
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_reviews.product_id
      AND s.owner_id = auth.uid()
    )
    OR
    customer_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Any authenticated user can insert reviews
CREATE POLICY "Authenticated users can submit reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Store owners can update reviews (for moderation)
CREATE POLICY "Store owners can moderate reviews"
  ON product_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_reviews.product_id
      AND s.owner_id = auth.uid()
    )
  );

-- Store owners can delete reviews
CREATE POLICY "Store owners can delete reviews"
  ON product_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_reviews.product_id
      AND s.owner_id = auth.uid()
    )
  );

-- ============================================
-- REVIEW VOTES RLS POLICIES
-- ============================================

CREATE POLICY "Anyone can view votes"
  ON review_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON review_votes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_timestamp
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_review_timestamp();

-- Update Product Rating Statistics
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;

  UPDATE products
  SET
    review_count = (
      SELECT COUNT(*) FROM product_reviews
      WHERE product_id = v_product_id AND status = 'approved'
    ),
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM product_reviews
      WHERE product_id = v_product_id AND status = 'approved'
    )
  WHERE id = v_product_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- Update Vote Counts
CREATE OR REPLACE FUNCTION update_review_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE product_reviews
  SET
    helpful_count = (
      SELECT COUNT(*) FROM review_votes
      WHERE review_id = NEW.review_id AND vote_type = 'helpful'
    ),
    not_helpful_count = (
      SELECT COUNT(*) FROM review_votes
      WHERE review_id = NEW.review_id AND vote_type = 'not_helpful'
    )
  WHERE id = NEW.review_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_review_vote_counts
  AFTER INSERT OR UPDATE ON review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_vote_counts();

-- Helper: Get rating distribution for a product
CREATE OR REPLACE FUNCTION get_rating_distribution(p_product_id UUID)
RETURNS TABLE (
  rating INTEGER,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.rating,
    COUNT(*)::BIGINT as count
  FROM product_reviews r
  WHERE r.product_id = p_product_id
  AND r.status = 'approved'
  GROUP BY r.rating
  ORDER BY r.rating DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
