-- ============================================================
-- BACKFILL: Link existing direct billing service orders to patients
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
-- ============================================================
-- For direct billing rows created before the backend fix,
-- service_orders.appointment_id is NULL. This means we cannot
-- resolve the patient's name, MRN, or DOB.
--
-- This script creates a stub appointment for each direct bill
-- and updates service_orders to link them correctly.
-- ============================================================

DO $$
DECLARE
  v_bill RECORD;
  v_new_app_id TEXT;
BEGIN
  -- Loop through service orders that have appointment_id IS NULL
  -- and find their matching bill through bill_items
  FOR v_bill IN
    SELECT DISTINCT
      so.id AS service_order_id,
      b.patient_id::text AS patient_id,
      b.appointment_id::text AS bill_appointment_id,
      b.date AS bill_date
    FROM service_orders so
    JOIN bill_items bi ON (bi.description = so.service_name OR bi.item_id::text = so.service_id::text)
    JOIN bills b ON b.id::text = bi.bill_id::text
    WHERE so.appointment_id IS NULL
  LOOP
    -- If the bill itself has an appointment_id, use it
    IF v_bill.bill_appointment_id IS NOT NULL THEN
      UPDATE service_orders
      SET appointment_id = v_bill.bill_appointment_id
      WHERE id::text = v_bill.service_order_id;
    ELSE
      -- Create a new stub appointment for the patient
      v_new_app_id := gen_random_uuid()::text;
      
      INSERT INTO appointments (
        id,
        patient_id,
        date,
        time,
        status,
        visit_type
      ) VALUES (
        v_new_app_id,
        v_bill.patient_id,
        COALESCE(v_bill.bill_date::date, CURRENT_DATE),
        '09:00',
        'Completed',
        'Direct Billing'
      ) ON CONFLICT DO NOTHING;

      -- Update the service order to reference the stub appointment
      UPDATE service_orders
      SET appointment_id = v_new_app_id
      WHERE id::text = v_bill.service_order_id;
    END IF;
  END LOOP;
END $$;

-- Verify results
SELECT 
  so.id AS service_order_id,
  so.service_name,
  so.appointment_id,
  p.first_name || ' ' || p.last_name AS patient_name,
  p.dob
FROM service_orders so
JOIN appointments a ON a.id::text = so.appointment_id::text
JOIN patients p ON p.id::text = a.patient_id::text
ORDER BY so.order_date DESC;
