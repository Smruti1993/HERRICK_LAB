-- ============================================================
-- LIMS Billing Trigger Migration
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
-- ============================================================
-- This trigger fires whenever a service_order row has its
-- billing_status updated to 'Billed'. If the associated service
-- definition has service_type = 'Laboratory', a corresponding
-- lims_lab_orders record is automatically created.
-- ============================================================

-- Step 1: Trigger function
CREATE OR REPLACE FUNCTION trg_create_lims_lab_order_on_billing()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_service_type TEXT;
  v_existing_count INTEGER;
BEGIN
  -- Only act when billing_status transitions to 'Billed'
  IF (NEW.billing_status = 'Billed' AND (OLD.billing_status IS DISTINCT FROM 'Billed')) THEN

    -- Resolve service type from service_definitions
    SELECT service_type INTO v_service_type
    FROM service_definitions
    WHERE id = NEW.service_id;

    -- Only create lab order for Laboratory services
    IF v_service_type = 'Laboratory' THEN

      -- Prevent duplicate lab orders for the same service order
      SELECT COUNT(*) INTO v_existing_count
      FROM lims_lab_orders
      WHERE service_order_id = NEW.id;

      IF v_existing_count = 0 THEN
        INSERT INTO lims_lab_orders (
          id,
          service_order_id,
          barcode_no,
          priority,
          status,
          ordered_at
        ) VALUES (
          gen_random_uuid(),
          NEW.id,
          'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
          COALESCE(NEW.priority, 'Routine'),
          'Ordered',
          NOW()
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 2: Drop old trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trg_lims_lab_order_on_billing ON service_orders;

-- Step 3: Attach trigger to service_orders AFTER UPDATE
CREATE TRIGGER trg_lims_lab_order_on_billing
AFTER UPDATE ON service_orders
FOR EACH ROW
EXECUTE FUNCTION trg_create_lims_lab_order_on_billing();


-- ============================================================
-- Optional: Also handle DIRECT BILLING - orders coming from
-- billing module (not the DoctorWorkbench) where service_orders
-- may be inserted already with billing_status = 'Billed'.
-- This fires on INSERT as well.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_create_lims_lab_order_on_billing_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_service_type TEXT;
  v_existing_count INTEGER;
BEGIN
  IF (NEW.billing_status = 'Billed') THEN
    SELECT service_type INTO v_service_type
    FROM service_definitions
    WHERE id = NEW.service_id;

    IF v_service_type = 'Laboratory' THEN
      SELECT COUNT(*) INTO v_existing_count
      FROM lims_lab_orders
      WHERE service_order_id = NEW.id;

      IF v_existing_count = 0 THEN
        INSERT INTO lims_lab_orders (
          id,
          service_order_id,
          barcode_no,
          priority,
          status,
          ordered_at
        ) VALUES (
          gen_random_uuid(),
          NEW.id,
          'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
          COALESCE(NEW.priority, 'Routine'),
          'Ordered',
          NOW()
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lims_lab_order_on_billing_insert ON service_orders;

CREATE TRIGGER trg_lims_lab_order_on_billing_insert
AFTER INSERT ON service_orders
FOR EACH ROW
EXECUTE FUNCTION trg_create_lims_lab_order_on_billing_insert();
