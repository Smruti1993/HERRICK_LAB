-- ============================================================
-- DIAGNOSTIC: Check why INV-2026-39067 is missing a lab order
-- Run Step 1 first to diagnose, then Step 2 to fix.
-- Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
-- ============================================================

-- STEP 1: Find the bill and its items
-- This tells us whether the invoice exists and what items it has
SELECT 
  b.id AS bill_id,
  b.invoice_no,
  b.status AS bill_status,
  b.date AS bill_date,
  bi.id AS item_id,
  bi.description AS item_description,
  bi.item_type,
  bi.item_id AS service_definition_id,
  bi.total
FROM bills b
JOIN bill_items bi ON bi.bill_id = b.id
WHERE b.invoice_no = 'INV-2026-39067';

-- ============================================================
-- STEP 2: Check if a service_order was linked to this invoice
-- ============================================================
SELECT 
  so.*,
  sd.service_type
FROM service_orders so
LEFT JOIN service_definitions sd ON sd.id = so.service_id
WHERE so.billing_status = 'Billed'
  AND so.order_date >= NOW() - INTERVAL '1 day'
ORDER BY so.order_date DESC
LIMIT 20;

-- ============================================================
-- STEP 3: Check if any lims_lab_orders exist for recent orders
-- ============================================================
SELECT 
  lo.id,
  lo.barcode_no,
  lo.status,
  lo.ordered_at,
  so.service_name
FROM lims_lab_orders lo
JOIN service_orders so ON so.id = lo.service_order_id
ORDER BY lo.ordered_at DESC
LIMIT 10;

-- ============================================================
-- FIX: Manually create a lab order for INV-2026-39067
-- Only run this if Step 1 shows lab items but Step 3 has no
-- corresponding lab order.
-- Replace 'YOUR_APPOINTMENT_ID' if known, otherwise leave NULL.
-- ============================================================
DO $$
DECLARE
  v_service_order_id UUID;
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT bi.description, bi.total, bi.quantity, bi.unit_price, b.appointment_id
    FROM bills b
    JOIN bill_items bi ON bi.bill_id = b.id
    WHERE b.invoice_no = 'INV-2026-39067'
      AND (bi.item_type ILIKE '%lab%' OR bi.item_type ILIKE '%test%' OR bi.description ILIKE '%test%' OR bi.description ILIKE '%lab%')
  LOOP
    v_service_order_id := gen_random_uuid();

    -- Create a service_order stub
    INSERT INTO service_orders (
      id, appointment_id, service_name, quantity, unit_price,
      total_price, status, billing_status, priority, order_date
    ) VALUES (
      v_service_order_id,
      v_item.appointment_id,
      v_item.description,
      v_item.quantity,
      v_item.unit_price,
      v_item.total,
      'Billed',
      'Billed',
      'Routine',
      NOW()
    );

    -- Create the lims_lab_order
    INSERT INTO lims_lab_orders (
      id, service_order_id, barcode_no, priority, status, ordered_at
    ) VALUES (
      gen_random_uuid(),
      v_service_order_id,
      'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
      'Routine',
      'Ordered',
      NOW()
    );

    RAISE NOTICE 'Created lab order for item: %', v_item.description;
  END LOOP;
END $$;

-- Verify the fix
SELECT lo.id, lo.barcode_no, lo.status, so.service_name
FROM lims_lab_orders lo
JOIN service_orders so ON so.id = lo.service_order_id
ORDER BY lo.ordered_at DESC
LIMIT 5;
