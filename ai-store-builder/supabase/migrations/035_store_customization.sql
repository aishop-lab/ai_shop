-- Store UI Customization
-- Adds a JSONB column for extended appearance settings

ALTER TABLE stores ADD COLUMN IF NOT EXISTS customization JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN stores.customization IS 'Store UI customization: colors, typography, layout, announcement bar, custom CSS';
