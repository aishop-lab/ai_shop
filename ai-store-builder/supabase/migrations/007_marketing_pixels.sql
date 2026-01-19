-- Marketing Pixels & Analytics Integration
-- Adds marketing pixel configuration to stores

-- Add marketing_pixels column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS marketing_pixels JSONB DEFAULT '{
  "facebook_pixel_id": null,
  "google_analytics_id": null,
  "google_ads_conversion_id": null,
  "google_ads_conversion_label": null
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN stores.marketing_pixels IS 'Marketing pixel IDs for Facebook, Google Analytics, and Google Ads tracking';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_marketing_pixels
ON stores USING gin (marketing_pixels);
