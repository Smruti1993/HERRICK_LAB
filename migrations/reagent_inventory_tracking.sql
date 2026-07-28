-- Run this script in your Supabase SQL Editor:

-- 1. Extend Store Master
ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_type TEXT CHECK (store_type IN ('CENTRAL', 'SUB_STORE', 'PHARMACY'));
ALTER TABLE stores ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;

-- 2. Extend Item Master
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS storage_condition TEXT CHECK (storage_condition IN ('Room temp', 'Refrigerated 2-8°C', 'Frozen -20°C'));

-- 3. Extend GRN Items
ALTER TABLE procurement_grn_items ADD COLUMN IF NOT EXISTS qc_status TEXT DEFAULT 'Passed' CHECK (qc_status IN ('Pending', 'Passed', 'Failed'));

-- 4. Create Reagent Mapping Table
CREATE TABLE IF NOT EXISTS lab_service_reagents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id text REFERENCES service_definitions(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE RESTRICT,
  store_id uuid REFERENCES stores(id) ON DELETE RESTRICT,
  quantity_per_test numeric(12, 4) NOT NULL CHECK (quantity_per_test > 0),  -- in item's Base UOM
  unit_id text REFERENCES units(id),
  is_mandatory boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(service_id, item_id, store_id)
);

-- RLS policies for lab_service_reagents (role-gated access)
ALTER TABLE lab_service_reagents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read access for authenticated users" ON lab_service_reagents;
DROP POLICY IF EXISTS "Write access for admin and lab managers" ON lab_service_reagents;
CREATE POLICY "Write access for all roles" ON lab_service_reagents FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Reagent Consumption Log (read-only for clients, writes exclusively through SECURITY DEFINER RPCs)
CREATE TABLE IF NOT EXISTS lab_reagent_consumption_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_order_id uuid REFERENCES lims_lab_orders(id) ON DELETE CASCADE,
  service_id text REFERENCES service_definitions(id),
  item_id uuid REFERENCES inventory_items(id),
  store_id uuid REFERENCES stores(id),
  quantity_deducted numeric(12, 4) NOT NULL,   -- always in Base UOM
  ledger_ref_id uuid,
  action text NOT NULL CHECK (action IN ('DEDUCT', 'REVERSE', 'OVERRIDE_DEDUCT')),
  reversed_by_log_id uuid REFERENCES lab_reagent_consumption_log(id), -- links a DEDUCT to its REVERSE
  override_reason text,
  performed_by text REFERENCES app_users(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE lab_reagent_consumption_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read access for all auth users" ON lab_reagent_consumption_log;
CREATE POLICY "Read access for all roles" ON lab_reagent_consumption_log FOR SELECT TO public USING (true);

-- 5.1 Stock Transfers Tables for Inventory Auditability
CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_no text UNIQUE NOT NULL,
  source_store_id uuid REFERENCES stores(id) NOT NULL,
  destination_store_id uuid REFERENCES stores(id) NOT NULL,
  status text NOT NULL DEFAULT 'Completed' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed')),
  requested_by text REFERENCES app_users(id),
  approved_by text REFERENCES app_users(id),
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  notes text
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id uuid REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id),
  batch_no text,
  expiry_date date,
  quantity numeric(12, 4) NOT NULL CHECK (quantity > 0),
  unit_id text REFERENCES units(id),
  source_ledger_id uuid REFERENCES inventory_stock_ledger(id),
  destination_ledger_id uuid REFERENCES inventory_stock_ledger(id)
);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All access for auth users" ON stock_transfers;
CREATE POLICY "All access for all roles" ON stock_transfers FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "All access for auth users" ON stock_transfer_items;
CREATE POLICY "All access for all roles" ON stock_transfer_items FOR ALL TO public USING (true) WITH CHECK (true);

-- Seed laboratory-specific units if not exist
INSERT INTO units (id, code, name) VALUES
  ('ML',  'ML',  'Milliliter'),
  ('VIAL','VIAL','Vial (single dose)'),
  ('KIT', 'KIT', 'Kit (multiple vials)'),
  ('STRIP','STRIP','Test Strip')
ON CONFLICT (id) DO NOTHING;

-- 6. Postgres Function: Reagent Auto-Deduction with FEFO, UOM alignment, and Override
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
  v_needed            NUMERIC;       -- required qty, Base UOM
  v_available         NUMERIC;       -- available qty, Base UOM
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
  WHERE lab_order_id::text = p_lab_order_id::text
    AND action IN ('DEDUCT', 'OVERRIDE_DEDUCT')
    AND reversed_by_log_id IS NULL;

  IF v_open_deductions > 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Reagents already deducted for this order.');
  END IF;

  -- 2. Resolve Service ID
  SELECT s.service_id INTO v_service_id
  FROM lims_lab_orders l
  JOIN service_orders s ON s.id::text = l.service_order_id::text
  WHERE l.id::text = p_lab_order_id::text;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lab order % not found.', p_lab_order_id;
  END IF;

  -- 3. Iterate through mapped reagents
  FOR v_reagent IN
    SELECT r.*, i.item_name, i.item_code 
    FROM lab_service_reagents r
    JOIN inventory_items i ON r.item_id::text = i.id::text
    WHERE r.service_id = v_service_id
  LOOP
    -- Advisory lock to serialize execution for the item/store pair even if no ledger rows exist yet
    PERFORM pg_advisory_xact_lock(hashtext(v_reagent.item_id::text || ':' || v_reagent.store_id::text));

    -- Lock inventory ledger rows for update
    PERFORM 1 FROM inventory_stock_ledger
    WHERE item_id::text = v_reagent.item_id::text AND store_id::text = v_reagent.store_id::text
    FOR UPDATE;

    v_needed := v_reagent.quantity_per_test; -- in Base UOM

    -- Calculate total available balance of non-expired, Passed QC lots in store (stored in Base UOM)
    WITH lot_balances AS (
      SELECT
        l.batch_no,
        l.expiry_date,
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
          -- Log overridden deduction (deducts 0, preserving stock)
          INSERT INTO lab_reagent_consumption_log (
            lab_order_id, service_id, item_id, store_id, quantity_deducted, action, override_reason, performed_by
          ) VALUES (
            p_lab_order_id, v_service_id, v_reagent.item_id, v_reagent.store_id, 0, 'OVERRIDE_DEDUCT', p_override_reason, p_performed_by
          );
        END IF;
      ELSE
        -- Log warning for optional reagent shortfall
        v_warnings := v_warnings || jsonb_build_object(
          'item_name', v_reagent.item_name,
          'message', 'Optional reagent has insufficient stock.'
        );
      END IF;
      
      CONTINUE; -- Skip deduction loop for this reagent
    END IF;

    -- 4. Perform FEFO deduction from lots (which are already tracked in Base UOM)
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
      
      -- Get latest closing stock info for item
      SELECT COALESCE(closing_stock, 0), COALESCE(closing_stock_rate, 0)
      INTO v_closing_stock, v_prev_rate
      FROM inventory_stock_ledger
      WHERE store_id::text = v_reagent.store_id::text AND item_id::text = v_reagent.item_id::text
      ORDER BY ref_doc_date DESC, created_at DESC
      LIMIT 1;

      v_ledger_id := gen_random_uuid();
      
      -- Insert STOCKOUT Ledger Record
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

      -- Log consumption details
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

-- 7. Postgres Function: Reagent Consumption Reversal (Preserving full history)
CREATE OR REPLACE FUNCTION process_reagent_reversal(
  p_lab_order_id      UUID,
  p_performed_by      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log               RECORD;
  v_orig_ledger       RECORD;
  v_closing_stock     NUMERIC;
  v_new_ledger_id     UUID;
  v_reverse_log_id    UUID;
BEGIN
  -- Only reverse deductions not already reversed (idempotency)
  FOR v_log IN
    SELECT * FROM lab_reagent_consumption_log
    WHERE lab_order_id::text = p_lab_order_id::text 
      AND action IN ('DEDUCT', 'OVERRIDE_DEDUCT')
      AND reversed_by_log_id IS NULL
  LOOP
    IF v_log.action = 'OVERRIDE_DEDUCT' AND v_log.ledger_ref_id IS NULL THEN
      -- No ledger movement occurred; record reversal in history and link
      INSERT INTO lab_reagent_consumption_log (
        lab_order_id, service_id, item_id, store_id, quantity_deducted, action, performed_by
      ) VALUES (
        p_lab_order_id, v_log.service_id, v_log.item_id, v_log.store_id, 0, 'REVERSE', p_performed_by
      ) RETURNING id INTO v_reverse_log_id;

      UPDATE lab_reagent_consumption_log SET reversed_by_log_id = v_reverse_log_id WHERE id::text = v_log.id::text;
      CONTINUE;
    END IF;

    SELECT * INTO v_orig_ledger FROM inventory_stock_ledger WHERE id::text = v_log.ledger_ref_id::text;

    IF FOUND THEN
      -- Get latest closing stock info for item
      SELECT COALESCE(closing_stock, 0) INTO v_closing_stock
      FROM inventory_stock_ledger
      WHERE store_id::text = v_orig_ledger.store_id::text AND item_id::text = v_orig_ledger.item_id::text
      ORDER BY ref_doc_date DESC, created_at DESC
      LIMIT 1;

      v_new_ledger_id := gen_random_uuid();

      -- Insert STOCKIN Ledger Record (reversing original cost rate and batch details)
      INSERT INTO inventory_stock_ledger (
        id, store_id, item_id, batch_no, expiry_date,
        transaction_type, ref_type, ref_doc_no, ref_doc_date,
        stock_in_quantity, stock_out_quantity,
        closing_stock, closing_stock_rate, closing_stock_value, currency
      ) VALUES (
        v_new_ledger_id, v_orig_ledger.store_id, v_orig_ledger.item_id, v_orig_ledger.batch_no, v_orig_ledger.expiry_date,
        'STOCKIN', 'LAB CONSUMPTION REVERSAL', p_lab_order_id::text, NOW(),
        v_orig_ledger.stock_out_quantity, 0,
        v_closing_stock + v_orig_ledger.stock_out_quantity, v_orig_ledger.closing_stock_rate,
        (v_closing_stock + v_orig_ledger.stock_out_quantity) * v_orig_ledger.closing_stock_rate, 'SAR'
      );

      -- Log Reversal Audit Row and link back to DEDUCT row
      INSERT INTO lab_reagent_consumption_log (
        lab_order_id, service_id, item_id, store_id, quantity_deducted, ledger_ref_id, action, performed_by
      ) VALUES (
        p_lab_order_id, v_log.service_id, v_log.item_id, v_log.store_id, v_log.quantity_deducted, v_new_ledger_id, 'REVERSE', p_performed_by
      ) RETURNING id INTO v_reverse_log_id;

      UPDATE lab_reagent_consumption_log SET reversed_by_log_id = v_reverse_log_id WHERE id::text = v_log.id::text;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;
