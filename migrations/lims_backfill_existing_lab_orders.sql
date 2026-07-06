-- ============================================================
-- LIMS BACKFILL: Create lab orders for all already-billed
-- Laboratory service orders that are missing lims_lab_orders.
-- 
-- Run this ONCE in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
--
-- This fixes invoices that were billed BEFORE the trigger was deployed.
-- ============================================================

INSERT INTO lims_lab_orders (
  id,
  service_order_id,
  barcode_no,
  priority,
  status,
  ordered_at
)
SELECT
  gen_random_uuid(),
  so.id AS service_order_id,
  'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0') AS barcode_no,
  COALESCE(so.priority, 'Routine') AS priority,
  'Ordered' AS status,
  COALESCE(so.order_date, NOW()) AS ordered_at
FROM service_orders so
JOIN service_definitions sd ON sd.id = so.service_id
WHERE
  so.billing_status = 'Billed'
  AND sd.service_type = 'Laboratory'
  AND NOT EXISTS (
    SELECT 1
    FROM lims_lab_orders lo
    WHERE lo.service_order_id = so.id
  );

-- Confirm what was created
SELECT 
  lo.id AS lab_order_id,
  lo.barcode_no,
  lo.status,
  so.service_name,
  so.cpt_code,
  lo.ordered_at
FROM lims_lab_orders lo
JOIN service_orders so ON so.id = lo.service_order_id
JOIN service_definitions sd ON sd.id = so.service_id
WHERE sd.service_type = 'Laboratory'
ORDER BY lo.ordered_at DESC
LIMIT 20;
