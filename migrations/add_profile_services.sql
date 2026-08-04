-- ============================================================
-- Profile/Package Lab Services Migration
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1: lab_service_profile_components table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_service_profile_components (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_service_id    text NOT NULL REFERENCES service_definitions(id) ON DELETE CASCADE,
  component_service_id  text NOT NULL REFERENCES service_definitions(id) ON DELETE RESTRICT,
  display_order         integer NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_service_id, component_service_id),
  CHECK (profile_service_id != component_service_id)
);

ALTER TABLE lab_service_profile_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read access for authenticated users" ON lab_service_profile_components;
CREATE POLICY "Read access for authenticated users"
  ON lab_service_profile_components FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Write access for admin and lab managers" ON lab_service_profile_components;
CREATE POLICY "Write access for all roles"
  ON lab_service_profile_components FOR ALL
  TO public USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- STEP 2: No-nesting enforcement trigger
-- Prevents Profile/Package services from being added as
-- components of other profiles, even via direct API calls.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_no_nested_profiles()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM service_definitions
    WHERE id = NEW.component_service_id
      AND service_category = 'Profile/Package'
  ) THEN
    RAISE EXCEPTION
      'Nested profiles are not permitted: component_service_id % is itself a Profile/Package.',
      NEW.component_service_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_nested_profiles ON lab_service_profile_components;
CREATE TRIGGER trg_no_nested_profiles
  BEFORE INSERT OR UPDATE ON lab_service_profile_components
  FOR EACH ROW EXECUTE FUNCTION check_no_nested_profiles();

-- ────────────────────────────────────────────────────────────
-- STEP 3: Add new columns to lims_lab_orders
-- ────────────────────────────────────────────────────────────
ALTER TABLE lims_lab_orders
  ADD COLUMN IF NOT EXISTS service_id               text REFERENCES service_definitions(id),
  ADD COLUMN IF NOT EXISTS source_profile_service_id text REFERENCES service_definitions(id),
  ADD COLUMN IF NOT EXISTS profile_group_id          uuid;

-- ────────────────────────────────────────────────────────────
-- STEP 4: Legacy back-fill
-- Populates lims_lab_orders.service_id from service_orders
-- for all rows created before this migration.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS temp_unresolved_lab_orders (
  lab_order_id     uuid PRIMARY KEY,
  service_order_id text,
  logged_at        timestamptz DEFAULT now()
);

-- Back-fill service_id from linked service_orders
UPDATE lims_lab_orders l
SET service_id = s.service_id
FROM service_orders s
WHERE l.service_order_id::text = s.id::text
  AND l.service_id IS NULL;

-- Log any rows that couldn't be resolved
INSERT INTO temp_unresolved_lab_orders (lab_order_id, service_order_id)
SELECT id, service_order_id
FROM lims_lab_orders
WHERE service_id IS NULL
ON CONFLICT (lab_order_id) DO NOTHING;

-- IMPORTANT: Check this table before going live!
-- SELECT * FROM temp_unresolved_lab_orders;
-- Any rows here will raise an exception when their order is next certified.

-- ────────────────────────────────────────────────────────────
-- STEP 5: Updated billing trigger — UPDATE event
-- Handles profile explosion + specimen-wise barcode grouping
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_create_lims_lab_order_on_billing()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_service_type     TEXT;
  v_service_category TEXT;
  v_existing_count   INTEGER;
  v_profile_group_id UUID;
  v_specimen_id      UUID;
  v_barcode          TEXT;
  v_rec              RECORD;
  v_has_components   BOOLEAN := false;
BEGIN
  IF (NEW.billing_status = 'Billed' AND (OLD.billing_status IS DISTINCT FROM 'Billed')) THEN

    SELECT service_type, service_category
    INTO v_service_type, v_service_category
    FROM service_definitions WHERE id = NEW.service_id;

    IF v_service_type ILIKE 'laboratory' THEN

      SELECT COUNT(*) INTO v_existing_count
      FROM lims_lab_orders WHERE service_order_id = NEW.id;

      IF v_existing_count = 0 THEN
        IF v_service_category = 'Profile/Package' THEN
          v_profile_group_id := gen_random_uuid();

          FOR v_rec IN
            SELECT component_service_id
            FROM lab_service_profile_components
            WHERE profile_service_id = NEW.service_id AND is_active = true
            ORDER BY display_order
          LOOP
            -- Resolve specimen type for this component
            SELECT specimen_id INTO v_specimen_id
            FROM lims_service_configs
            WHERE service_id = v_rec.component_service_id;

            -- Reuse existing barcode if another component with same specimen was already inserted
            SELECT l.barcode_no INTO v_barcode
            FROM lims_lab_orders l
            LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
            WHERE l.service_order_id = NEW.id
              AND (
                (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
              )
            LIMIT 1;

            -- New specimen type — generate a new barcode
            IF v_barcode IS NULL THEN
              v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
            END IF;

            INSERT INTO lims_lab_orders (
              id, service_order_id, service_id, source_profile_service_id,
              profile_group_id, barcode_no, priority, status, ordered_at
            ) VALUES (
              gen_random_uuid(), NEW.id,
              v_rec.component_service_id,
              NEW.service_id,
              v_profile_group_id,
              v_barcode,
              COALESCE(NEW.priority, 'Routine'),
              'Ordered', NOW()
            );
            v_has_components := true;
          END LOOP;
        END IF;

        -- Fallback: Single service OR Profile with zero active components
        IF NOT v_has_components THEN
          INSERT INTO lims_lab_orders (
            id, service_order_id, service_id, source_profile_service_id,
            profile_group_id, barcode_no, priority, status, ordered_at
          ) VALUES (
            gen_random_uuid(), NEW.id,
            NEW.service_id, NULL, NULL,
            'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
            COALESCE(NEW.priority, 'Routine'),
            'Ordered', NOW()
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lims_lab_order_on_billing ON service_orders;
CREATE TRIGGER trg_lims_lab_order_on_billing
  AFTER UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION trg_create_lims_lab_order_on_billing();

-- ────────────────────────────────────────────────────────────
-- STEP 6: Updated billing trigger — INSERT event
-- Same logic for direct billing where rows are inserted already Billed.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_create_lims_lab_order_on_billing_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_service_type     TEXT;
  v_service_category TEXT;
  v_existing_count   INTEGER;
  v_profile_group_id UUID;
  v_specimen_id      UUID;
  v_barcode          TEXT;
  v_rec              RECORD;
  v_has_components   BOOLEAN := false;
BEGIN
  IF NEW.billing_status = 'Billed' THEN

    SELECT service_type, service_category
    INTO v_service_type, v_service_category
    FROM service_definitions WHERE id = NEW.service_id;

    IF v_service_type ILIKE 'laboratory' THEN

      SELECT COUNT(*) INTO v_existing_count
      FROM lims_lab_orders WHERE service_order_id = NEW.id;

      IF v_existing_count = 0 THEN
        IF v_service_category = 'Profile/Package' THEN
          v_profile_group_id := gen_random_uuid();

          FOR v_rec IN
            SELECT component_service_id
            FROM lab_service_profile_components
            WHERE profile_service_id = NEW.service_id AND is_active = true
            ORDER BY display_order
          LOOP
            SELECT specimen_id INTO v_specimen_id
            FROM lims_service_configs
            WHERE service_id = v_rec.component_service_id;

            SELECT l.barcode_no INTO v_barcode
            FROM lims_lab_orders l
            LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
            WHERE l.service_order_id = NEW.id
              AND (
                (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
              )
            LIMIT 1;

            IF v_barcode IS NULL THEN
              v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
            END IF;

            INSERT INTO lims_lab_orders (
              id, service_order_id, service_id, source_profile_service_id,
              profile_group_id, barcode_no, priority, status, ordered_at
            ) VALUES (
              gen_random_uuid(), NEW.id,
              v_rec.component_service_id,
              NEW.service_id,
              v_profile_group_id,
              v_barcode,
              COALESCE(NEW.priority, 'Routine'),
              'Ordered', NOW()
            );
            v_has_components := true;
          END LOOP;
        END IF;

        IF NOT v_has_components THEN
          INSERT INTO lims_lab_orders (
            id, service_order_id, service_id, source_profile_service_id,
            profile_group_id, barcode_no, priority, status, ordered_at
          ) VALUES (
            gen_random_uuid(), NEW.id,
            NEW.service_id, NULL, NULL,
            'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
            COALESCE(NEW.priority, 'Routine'),
            'Ordered', NOW()
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lims_lab_order_on_billing_insert ON service_orders;
CREATE TRIGGER trg_lims_lab_order_on_billing_insert
  AFTER INSERT ON service_orders
  FOR EACH ROW EXECUTE FUNCTION trg_create_lims_lab_order_on_billing_insert();

-- ────────────────────────────────────────────────────────────
-- STEP 7: Fix process_reagent_deduction service_id resolution
-- Prefer lims_lab_orders.service_id directly (correct for
-- profile component child orders) and fall back to the
-- service_orders join only for legacy rows.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_reagent_deduction(
  p_lab_order_id      UUID,
  p_override          BOOLEAN DEFAULT FALSE,
  p_override_reason   TEXT DEFAULT NULL,
  p_performed_by      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_id        TEXT;
  v_reagent           RECORD;
  v_lot               RECORD;
  v_deducted_qty      NUMERIC := 0;
  v_needed            NUMERIC;
  v_available         NUMERIC;
  v_remaining_deduct  NUMERIC;
  v_closing_stock     NUMERIC;
  v_prev_rate         NUMERIC;
  v_ledger_id         UUID;
  v_shortfalls        JSONB := '[]'::jsonb;
  v_warnings          JSONB := '[]'::jsonb;
  v_open_deductions   INTEGER;
BEGIN
  -- 1. Idempotency: count DEDUCT/OVERRIDE_DEDUCT rows for this order that have NOT yet been reversed
  SELECT COUNT(*) INTO v_open_deductions
  FROM lab_reagent_consumption_log
  WHERE lab_order_id = p_lab_order_id
    AND action IN ('DEDUCT', 'OVERRIDE_DEDUCT')
    AND reversed_by_log_id IS NULL;

  IF v_open_deductions > 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Reagents already deducted for this order.');
  END IF;

  -- 2. Resolve Service ID [FIX]: prefer the order's own service_id (correctly set per
  -- component for exploded profile orders), fall back to service_orders join for legacy rows.
  SELECT COALESCE(
    l.service_id,
    (SELECT s.service_id FROM service_orders s WHERE s.id::text = l.service_order_id::text)
  ) INTO v_service_id
  FROM lims_lab_orders l
  WHERE l.id = p_lab_order_id;

  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve service for lab order %.', p_lab_order_id;
  END IF;

  -- 3. Iterate through mapped reagents
  FOR v_reagent IN
    SELECT r.*, i.item_name, i.item_code
    FROM lab_service_reagents r
    JOIN inventory_items i ON r.item_id::text = i.id::text
    WHERE r.service_id = v_service_id
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext(v_reagent.item_id::text || ':' || v_reagent.store_id::text));

    PERFORM 1 FROM inventory_stock_ledger
    WHERE item_id::text = v_reagent.item_id::text AND store_id::text = v_reagent.store_id::text
    FOR UPDATE;

    v_needed := v_reagent.quantity_per_test;

    WITH lot_balances AS (
      SELECT
        l.batch_no, l.expiry_date,
        COALESCE(gi.qc_status, 'Passed') AS qc_status,
        SUM(l.stock_in_quantity - l.stock_out_quantity) AS native_balance
      FROM inventory_stock_ledger l
      LEFT JOIN procurement_grn_items gi
        ON gi.item_id::text = l.item_id::text AND gi.batch_code::text = l.batch_no::text
      WHERE l.item_id::text = v_reagent.item_id::text AND l.store_id::text = v_reagent.store_id::text
      GROUP BY l.batch_no, l.expiry_date, gi.qc_status
      HAVING SUM(l.stock_in_quantity - l.stock_out_quantity) > 0
    )
    SELECT COALESCE(SUM(native_balance), 0)
    INTO v_available
    FROM lot_balances
    WHERE qc_status = 'Passed'
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE);

    IF v_available < v_needed THEN
      IF v_reagent.is_mandatory THEN
        IF p_override = FALSE THEN
          v_shortfalls := v_shortfalls || jsonb_build_object(
            'item_id', v_reagent.item_id,
            'item_name', v_reagent.item_name,
            'item_code', v_reagent.item_code,
            'required_base_uom', v_needed,
            'available_base_uom', v_available
          );
        ELSE
          INSERT INTO lab_reagent_consumption_log (
            lab_order_id, service_id, item_id, store_id, quantity_deducted, action, override_reason, performed_by
          ) VALUES (
            p_lab_order_id, v_service_id, v_reagent.item_id, v_reagent.store_id, 0, 'OVERRIDE_DEDUCT', p_override_reason, p_performed_by
          );
        END IF;
      ELSE
        v_warnings := v_warnings || jsonb_build_object(
          'item_name', v_reagent.item_name,
          'message', 'Optional reagent has insufficient stock.'
        );
      END IF;
      CONTINUE;
    END IF;

    -- 4. Perform FEFO deduction from lots
    v_remaining_deduct := v_needed;

    FOR v_lot IN
      SELECT
        l.batch_no, l.expiry_date,
        SUM(l.stock_in_quantity - l.stock_out_quantity) AS native_balance,
        COALESCE(gi.qc_status, 'Passed') AS qc_status
      FROM inventory_stock_ledger l
      LEFT JOIN procurement_grn_items gi
        ON gi.item_id::text = l.item_id::text AND gi.batch_code::text = l.batch_no::text
      WHERE l.item_id::text = v_reagent.item_id::text AND l.store_id::text = v_reagent.store_id::text
      GROUP BY l.batch_no, l.expiry_date, gi.qc_status
      HAVING SUM(l.stock_in_quantity - l.stock_out_quantity) > 0
      ORDER BY l.expiry_date ASC NULLS LAST, l.batch_no ASC
    LOOP
      IF v_lot.qc_status != 'Passed' OR (v_lot.expiry_date IS NOT NULL AND v_lot.expiry_date < CURRENT_DATE) THEN
        CONTINUE;
      END IF;

      EXIT WHEN v_remaining_deduct <= 0;

      v_deducted_qty := LEAST(v_remaining_deduct, v_lot.native_balance);

      SELECT COALESCE(closing_stock, 0), COALESCE(closing_stock_rate, 0)
      INTO v_closing_stock, v_prev_rate
      FROM inventory_stock_ledger
      WHERE store_id::text = v_reagent.store_id::text AND item_id::text = v_reagent.item_id::text
      ORDER BY ref_doc_date DESC, created_at DESC
      LIMIT 1;

      v_ledger_id := gen_random_uuid();

      INSERT INTO inventory_stock_ledger (
        id, store_id, item_id, batch_no, expiry_date,
        transaction_type, ref_type, ref_doc_no, ref_doc_date,
        stock_in_quantity, stock_out_quantity,
        closing_stock, closing_stock_rate, closing_stock_value, currency
      ) VALUES (
        v_ledger_id, v_reagent.store_id, v_reagent.item_id, v_lot.batch_no, v_lot.expiry_date,
        'STOCKOUT', 'LAB CONSUMPTION', p_lab_order_id::text, NOW(),
        0, v_deducted_qty,
        v_closing_stock - v_deducted_qty, v_prev_rate, (v_closing_stock - v_deducted_qty) * v_prev_rate, 'SAR'
      );

      INSERT INTO lab_reagent_consumption_log (
        lab_order_id, service_id, item_id, store_id, quantity_deducted, ledger_ref_id, action, performed_by
      ) VALUES (
        p_lab_order_id, v_service_id, v_reagent.item_id, v_reagent.store_id, v_deducted_qty, v_ledger_id, 'DEDUCT', p_performed_by
      );

      v_remaining_deduct := v_remaining_deduct - v_deducted_qty;
    END LOOP;
  END LOOP;

  -- 5. Return shortfalls if any mandatory reagents are lacking
  IF jsonb_array_length(v_shortfalls) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK'
      USING DETAIL = v_shortfalls::text;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'shortfalls', v_shortfalls,
    'warnings', v_warnings
  );
END;
$$;
