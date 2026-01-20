-- Migration: 010_gst_invoice
-- Description: Add GST-related fields for invoice generation

-- Add GST fields to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS gstin VARCHAR(15),
ADD COLUMN IF NOT EXISTS pan VARCHAR(10),
ADD COLUMN IF NOT EXISTS business_address TEXT;

-- Add HSN code to products (default for apparel)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(8) DEFAULT '6204';

-- Add invoice number to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
