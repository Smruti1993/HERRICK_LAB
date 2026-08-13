-- ============================================================
-- MIGRATION: Repair Missing lims_samples + Specimen-Grouped Barcode Logic
-- ============================================================
-- Run this file in the Supabase SQL Editor (or DBeaver) against
-- your target database.
--
-- SECTION 0: Drop unique constraint on lims_samples.sample_no
--            (required for specimen-grouped barcodes where multiple
--             tests share one physical tube / one barcode number).
-- SECTION 1: Repair missing lims_samples rows for already-
--            Collected / Accepted lab orders that have no sample.
-- SECTION 2: Drop and recreate billing triggers so that from now
--            on, tests sharing the same specimen within the same
--            patient visit receive ONE shared barcode.
-- ============================================================


-- ============================================================
-- SECTION 0: DROP UNIQUE CONSTRAINT ON lims_samples.sample_no
-- With specimen-grouped barcodes, the same barcode (sample_no)
-- will appear on multiple lims_samples rows (one per test that
-- shares that physical tube).  The unique constraint is therefore
-- incorrect and must be dropped.
-- ============================================================
ALTER TABLE lims_samples
  DROP CONSTRAINT IF EXISTS lims_samples_sample_no_key;


-- ============================================================
-- SECTION 1: DATA REPAIR
-- Inserts a lims_samples row for every lab order whose status
-- is 'Collected' or 'Accepted' but has no matching sample row.
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_specimen_id  UUID;
  v_container_id UUID;
BEGIN
  FOR r IN
    SELECT l.id       AS lab_order_id,
           l.barcode_no,
           l.status,
           so.service_id
    FROM   lims_lab_orders l
    JOIN   service_orders  so ON so.id = l.service_order_id
    WHERE  l.status IN ('Collected', 'Accepted')
      AND  NOT EXISTS (
             SELECT 1 FROM lims_samples s WHERE s.lab_order_id = l.id
           )
  LOOP
    -- Resolve specimen & container from lims_service_configs
    SELECT sc.specimen_id, sc.container_id
      INTO v_specimen_id, v_container_id
    FROM   lims_service_configs sc
    WHERE  sc.service_id = r.service_id
    LIMIT  1;

    INSERT INTO lims_samples (
      id,
      lab_order_id,
      specimen_id,
      container_id,
      sample_no,
      status,
      collection_site,
      volume_ml,
      temp_req
    ) VALUES (
      gen_random_uuid(),
      r.lab_order_id,
      v_specimen_id,   -- from lims_service_configs; NULL if test not yet configured
      v_container_id,  -- same
      r.barcode_no,    -- reuse the lab order's existing barcode as the sample number
      r.status,        -- 'Collected' or 'Accepted' — mirrors the lab order status
      'Unknown',       -- placeholder; phlebotomist can update later
      NULL,
      NULL
    );

    RAISE NOTICE 'Repaired sample for lab_order_id=% barcode=% status=%',
                 r.lab_order_id, r.barcode_no, r.status;
  END LOOP;
END;
$$;


-- ============================================================
-- SECTION 2: UPDATE BILLING TRIGGERS — SPECIMEN-GROUPED BARCODES
--
-- Logic (same for both UPDATE and INSERT triggers):
--  1. When a service_order transitions to billing_status = 'Billed':
--     a. Confirm the linked service_definition is 'laboratory' type.
--     b. Resolve specimen_id from lims_service_configs for this service.
--     c. Look for an existing barcode already assigned to another
--        lab_order for the SAME appointment that uses the SAME specimen.
--     d. If found  →  reuse that barcode (same tube, same label).
--     e. If not    →  generate a new barcode BAR-XXXXXX.
--  2. Insert the lims_lab_orders row (duplicate guard still in place).
-- ============================================================

-- ── UPDATE trigger (billing_status changes to 'Billed') ─────────────────
CREATE OR REPLACE FUNCTION trg_create_lims_lab_order_on_billing()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_service_type   TEXT;
  v_existing_count INTEGER;
  v_specimen_id    UUID;
  v_container_id   UUID;
  v_barcode        TEXT;
BEGIN
  -- Only fire when billing_status transitions TO 'Billed'
  IF NOT (NEW.billing_status = 'Billed' AND
          (OLD.billing_status IS DISTINCT FROM 'Billed')) THEN
    RETURN NEW;
  END IF;

  -- Confirm Laboratory service type
  SELECT service_type
    INTO v_service_type
  FROM service_definitions
  WHERE id = NEW.service_id;

  IF v_service_type NOT ILIKE 'laboratory' THEN
    RETURN NEW;
  END IF;

  -- Guard: prevent duplicate lab orders for the same service_order
  SELECT COUNT(*) INTO v_existing_count
  FROM lims_lab_orders
  WHERE service_order_id = NEW.id;

  IF v_existing_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Resolve specimen & container for this service
  SELECT sc.specimen_id, sc.container_id
    INTO v_specimen_id, v_container_id
  FROM lims_service_configs sc
  WHERE sc.service_id = NEW.service_id
  LIMIT 1;

  -- ── Barcode grouping lookup ──────────────────────────────────────────────
  -- If another test in the same appointment already has a barcode
  -- for the same specimen → reuse it (one tube = one barcode).
  IF v_specimen_id IS NOT NULL AND NEW.appointment_id IS NOT NULL THEN
    SELECT l.barcode_no
      INTO v_barcode
    FROM lims_lab_orders       l
    JOIN service_orders        s  ON s.id           = l.service_order_id
    JOIN lims_service_configs  sc ON sc.service_id  = s.service_id
    WHERE s.appointment_id = NEW.appointment_id
      AND sc.specimen_id   = v_specimen_id
      AND l.barcode_no IS NOT NULL
    LIMIT 1;
  END IF;

  -- Generate a new barcode only when no existing one was found
  IF v_barcode IS NULL THEN
    v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END IF;
  -- ── End barcode grouping lookup ──────────────────────────────────────────

  INSERT INTO lims_lab_orders (
    id, service_order_id, barcode_no, priority, status, ordered_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    v_barcode,
    COALESCE(NEW.priority, 'Routine'),
    'Ordered',
    NOW()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lims_lab_order_on_billing ON service_orders;
CREATE TRIGGER trg_lims_lab_order_on_billing
AFTER UPDATE ON service_orders
FOR EACH ROW
EXECUTE FUNCTION trg_create_lims_lab_order_on_billing();


-- ── INSERT trigger (row inserted already with billing_status='Billed') ───
CREATE OR REPLACE FUNCTION trg_create_lims_lab_order_on_billing_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_service_type   TEXT;
  v_existing_count INTEGER;
  v_specimen_id    UUID;
  v_container_id   UUID;
  v_barcode        TEXT;
BEGIN
  IF NEW.billing_status != 'Billed' THEN
    RETURN NEW;
  END IF;

  SELECT service_type
    INTO v_service_type
  FROM service_definitions
  WHERE id = NEW.service_id;

  IF v_service_type NOT ILIKE 'laboratory' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_existing_count
  FROM lims_lab_orders
  WHERE service_order_id = NEW.id;

  IF v_existing_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Resolve specimen & container for this service
  SELECT sc.specimen_id, sc.container_id
    INTO v_specimen_id, v_container_id
  FROM lims_service_configs sc
  WHERE sc.service_id = NEW.service_id
  LIMIT 1;

  -- ── Barcode grouping lookup ──────────────────────────────────────────────
  IF v_specimen_id IS NOT NULL AND NEW.appointment_id IS NOT NULL THEN
    SELECT l.barcode_no
      INTO v_barcode
    FROM lims_lab_orders       l
    JOIN service_orders        s  ON s.id           = l.service_order_id
    JOIN lims_service_configs  sc ON sc.service_id  = s.service_id
    WHERE s.appointment_id = NEW.appointment_id
      AND sc.specimen_id   = v_specimen_id
      AND l.barcode_no IS NOT NULL
    LIMIT 1;
  END IF;

  IF v_barcode IS NULL THEN
    v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END IF;
  -- ── End barcode grouping lookup ──────────────────────────────────────────

  INSERT INTO lims_lab_orders (
    id, service_order_id, barcode_no, priority, status, ordered_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    v_barcode,
    COALESCE(NEW.priority, 'Routine'),
    'Ordered',
    NOW()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lims_lab_order_on_billing_insert ON service_orders;
CREATE TRIGGER trg_lims_lab_order_on_billing_insert
AFTER INSERT ON service_orders
FOR EACH ROW
EXECUTE FUNCTION trg_create_lims_lab_order_on_billing_insert();
