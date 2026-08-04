-- Migration to change bill_items.item_id from UUID to TEXT
-- This allows storing both UUIDs (from inventory_items) and TEXT IDs (from service_definitions)
ALTER TABLE bill_items ALTER COLUMN item_id TYPE text;
