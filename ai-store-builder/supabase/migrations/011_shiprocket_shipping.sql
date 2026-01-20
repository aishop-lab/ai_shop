-- Migration: 011_shiprocket_shipping
-- Description: Add Shiprocket integration columns to orders table

-- Add Shiprocket-specific columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shiprocket_order_id INTEGER,
ADD COLUMN IF NOT EXISTS shiprocket_shipment_id INTEGER,
ADD COLUMN IF NOT EXISTS awb_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS label_url TEXT,
ADD COLUMN IF NOT EXISTS manifest_url TEXT,
ADD COLUMN IF NOT EXISTS pickup_scheduled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pickup_token VARCHAR(100),
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS shipping_provider VARCHAR(50) DEFAULT 'manual';

-- Create index for Shiprocket lookups
CREATE INDEX IF NOT EXISTS idx_orders_shiprocket_order_id ON orders(shiprocket_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_shiprocket_shipment_id ON orders(shiprocket_shipment_id);
CREATE INDEX IF NOT EXISTS idx_orders_awb_code ON orders(awb_code);

-- Add shipping_settings JSONB column to stores for pickup location config
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS shipping_settings JSONB DEFAULT '{
  "pickup_location": "Primary",
  "default_package_dimensions": {
    "length": 20,
    "breadth": 15,
    "height": 10,
    "weight": 0.5
  },
  "auto_generate_label": false,
  "auto_schedule_pickup": false
}'::jsonb;

-- Create shipment_events table for tracking history
CREATE TABLE IF NOT EXISTS shipment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  awb_code VARCHAR(100),
  event_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(100) NOT NULL,
  activity TEXT,
  location VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for shipment events
CREATE INDEX IF NOT EXISTS idx_shipment_events_order_id ON shipment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_awb_code ON shipment_events(awb_code);
CREATE INDEX IF NOT EXISTS idx_shipment_events_event_date ON shipment_events(event_date DESC);

-- Enable RLS on shipment_events
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;

-- Store owners can view shipment events for their orders
CREATE POLICY "Store owners can view shipment events"
  ON shipment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.id = shipment_events.order_id
      AND s.owner_id = auth.uid()
    )
  );

-- Store owners can insert shipment events
CREATE POLICY "Store owners can insert shipment events"
  ON shipment_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.id = shipment_events.order_id
      AND s.owner_id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON COLUMN orders.shiprocket_order_id IS 'Shiprocket internal order ID';
COMMENT ON COLUMN orders.shiprocket_shipment_id IS 'Shiprocket shipment ID for tracking';
COMMENT ON COLUMN orders.awb_code IS 'Air Waybill code - the tracking number';
COMMENT ON COLUMN orders.label_url IS 'URL to download shipping label PDF';
COMMENT ON COLUMN orders.manifest_url IS 'URL to download shipping manifest PDF';
COMMENT ON COLUMN orders.pickup_scheduled_date IS 'Date when pickup is scheduled';
COMMENT ON COLUMN orders.pickup_token IS 'Shiprocket pickup token number';
COMMENT ON COLUMN orders.estimated_delivery_date IS 'Estimated delivery date from courier';
COMMENT ON COLUMN orders.shipping_provider IS 'Shipping provider: manual, shiprocket, etc';
