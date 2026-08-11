-- =============================================================
-- HIS-WEB5 DATABASE FUNCTIONS, TRIGGERS & PROGRAMMABLE OBJECTS
-- Generated: 2026-08-11
--
-- HOW TO RESTORE:
--   Run this file in your new database after restoring tables and data:
--   psql -f db_functions_triggers.sql
-- =============================================================

-- =============================================================
-- SECTION 1: SEQUENCES
-- =============================================================

CREATE SEQUENCE IF NOT EXISTS public.loyalty_account_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.credit_note_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.refund_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.patient_demographics_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.billing_invoice_seq START WITH 1;

-- =============================================================
-- SECTION 2: USER-DEFINED FUNCTIONS
-- =============================================================

-- ─── rls_auto_enable ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- ─── check_no_nested_profiles ───────────────────────────────
CREATE OR REPLACE FUNCTION public.check_no_nested_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM service_definitions WHERE id = NEW.component_service_id AND service_category = 'Profile/Package') THEN
    RAISE EXCEPTION 'Nested profiles are not permitted: component_service_id % is itself a Profile/Package.', NEW.component_service_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- ─── log_bill_status_change ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_bill_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.bill_status_history (bill_id, old_status, new_status, changed_by, reason, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.created_by, 'system'), 'Status transition', NOW());
  END IF;
  RETURN NEW;
END;
$function$;

-- ─── prevent_bill_amount_update ──────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_bill_amount_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.total_amount IS DISTINCT FROM NEW.total_amount AND current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Bill total_amount is immutable after creation. Use credit_memos to record adjustments. (bill_id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- ─── update_updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ─── generate_loyalty_account_no ─────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_loyalty_account_no()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.account_no := 'LYL-' || TO_CHAR(NOW(), 'YYYY') || '-'
                    || LPAD(NEXTVAL('loyalty_account_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;

-- ─── is_admin ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM app_users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = uid::text
      AND r.role_code IN ('ADMIN', 'ADMINISTRATOR')
      AND u.is_active = true
  );
$function$;

-- ─── adjudicate_bill_item (8 params) ─────────────────────────
CREATE OR REPLACE FUNCTION public.adjudicate_bill_item(p_policy_id uuid, p_visit_type text, p_gender text, p_item_type text, p_item_code text, p_class_name text, p_unit_price numeric, p_quantity numeric)
 RETURNS TABLE(matched_rule_id uuid, total_amount numeric, patient_share numeric, sponsor_share numeric, is_excluded boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_total_amount NUMERIC := p_unit_price * p_quantity;
    v_best_rule RECORD;
    v_deductible NUMERIC := 0;
    v_after_deductible NUMERIC;
    v_copay_pct NUMERIC;
    v_patient_co NUMERIC;
    v_sponsor_co NUMERIC;
BEGIN
    SELECT * INTO v_best_rule
    FROM public.policy_rules
    WHERE policy_id = p_policy_id
      AND active = TRUE
      AND (visit_type = 'All' OR LOWER(visit_type) = LOWER(p_visit_type))
      AND (gender = 'All' OR LOWER(gender) = LOWER(p_gender))
      AND (
         (alias_code = p_item_code) OR
         (class_name = p_class_name) OR
         (rule_type = p_item_type) OR
         (rule_type = 'ALL')
      )
    ORDER BY 
        CASE 
            WHEN alias_code = p_item_code THEN 100 
            WHEN class_name = p_class_name THEN 50
            WHEN rule_type = p_item_type THEN 10
            ELSE 5 
        END DESC
    LIMIT 1;

    IF v_best_rule IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, v_total_amount, v_total_amount, 0.00, FALSE;
        RETURN;
    END IF;

    IF v_best_rule.exclude = TRUE THEN
        RETURN QUERY SELECT v_best_rule.id, v_total_amount, v_total_amount, 0.00, TRUE;
        RETURN;
    END IF;

    v_deductible := COALESCE(NULLIF(regexp_replace(v_best_rule.patient_deductible, '[^\d.]', '', 'g'), '')::NUMERIC, 0);
    IF v_best_rule.patient_deductible_type = '%' THEN
        v_deductible := (v_deductible / 100.0) * v_total_amount;
    END IF;
    v_deductible := LEAST(v_deductible, v_total_amount);
    v_after_deductible := v_total_amount - v_deductible;

    v_copay_pct := COALESCE(NULLIF(regexp_replace(v_best_rule.patient_copay, '[^\d.]', '', 'g'), '')::NUMERIC, 0);
    v_patient_co := (v_copay_pct / 100.0) * v_after_deductible;
    v_sponsor_co := v_after_deductible - v_patient_co;

    IF v_best_rule.amount_limit > 0 AND v_sponsor_co > v_best_rule.amount_limit THEN
        v_patient_co := v_patient_co + (v_sponsor_co - v_best_rule.amount_limit);
        v_sponsor_co := v_best_rule.amount_limit;
    END IF;

    RETURN QUERY SELECT 
        v_best_rule.id, 
        ROUND(v_total_amount, 2), 
        ROUND(v_patient_co + v_deductible, 2), 
        ROUND(v_sponsor_co, 2), 
        FALSE;
END;
$function$;

-- ─── adjudicate_bill_item (9 params) ─────────────────────────
CREATE OR REPLACE FUNCTION public.adjudicate_bill_item(p_policy_id uuid, p_visit_type text, p_gender text, p_item_type text, p_item_code text, p_class_name text, p_group_name text, p_unit_price numeric, p_quantity numeric)
 RETURNS TABLE(matched_rule_id uuid, total_amount numeric, patient_share numeric, sponsor_share numeric, is_excluded boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_total_amount NUMERIC := p_unit_price * p_quantity;
    v_best_rule RECORD;
    v_deductible NUMERIC := 0;
    v_after_deductible NUMERIC;
    v_copay_pct NUMERIC;
    v_patient_co NUMERIC;
    v_sponsor_co NUMERIC;
BEGIN
    SELECT * INTO v_best_rule
    FROM public.policy_rules
    WHERE policy_id = p_policy_id
      AND active = TRUE
      AND (visit_type = 'All' OR LOWER(visit_type) = LOWER(p_visit_type))
      AND (gender = 'All' OR LOWER(gender) = LOWER(p_gender))
      AND (
         (alias_code = p_item_code) OR
         (group_name = p_group_name AND group_name <> 'All') OR
         (class_name = p_class_name) OR
         (rule_type = p_item_type) OR
         (rule_type = 'ALL')
      )
    ORDER BY 
        CASE 
            WHEN alias_code = p_item_code THEN 100 
            WHEN (group_name = p_group_name AND group_name <> 'All') THEN 50
            WHEN class_name = p_class_name THEN 50
            WHEN rule_type = p_item_type THEN 10
            ELSE 5 
        END DESC
    LIMIT 1;

    IF v_best_rule IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, v_total_amount, v_total_amount, 0.00, FALSE;
        RETURN;
    END IF;

    IF v_best_rule.exclude = TRUE THEN
        RETURN QUERY SELECT v_best_rule.id, v_total_amount, v_total_amount, 0.00, TRUE;
        RETURN;
    END IF;

    v_deductible := COALESCE(NULLIF(regexp_replace(v_best_rule.patient_deductible, '[^\d.]', '', 'g'), '')::NUMERIC, 0);
    IF v_best_rule.patient_deductible_type = '%' THEN
        v_deductible := (v_deductible / 100.0) * v_total_amount;
    END IF;
    v_deductible := LEAST(v_deductible, v_total_amount);
    v_after_deductible := v_total_amount - v_deductible;

    v_copay_pct := COALESCE(NULLIF(regexp_replace(v_best_rule.patient_copay, '[^\d.]', '', 'g'), '')::NUMERIC, 0);
    v_patient_co := (v_copay_pct / 100.0) * v_after_deductible;
    v_sponsor_co := v_after_deductible - v_patient_co;

    IF v_best_rule.amount_limit > 0 AND v_sponsor_co > v_best_rule.amount_limit THEN
        v_patient_co := v_patient_co + (v_sponsor_co - v_best_rule.amount_limit);
        v_sponsor_co := v_best_rule.amount_limit;
    END IF;

    RETURN QUERY SELECT 
        v_best_rule.id, 
        ROUND(v_total_amount, 2), 
        ROUND(v_patient_co + v_deductible, 2), 
        ROUND(v_sponsor_co, 2), 
        FALSE;
END;
$function$;

-- ─── get_doctor_schedule_stats ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_doctor_schedule_stats(p_doctor_id text, p_week_start date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_active_days     INTEGER;
  v_total_slots     INTEGER;
  v_booked_slots    INTEGER;
BEGIN
  SELECT COUNT(DISTINCT day_of_week) INTO v_active_days
  FROM doctor_schedules
  WHERE doctor_id = p_doctor_id
    AND slot_type = 'available'
    AND is_active = true;

  SELECT COUNT(*) INTO v_total_slots
  FROM doctor_schedules
  WHERE doctor_id = p_doctor_id
    AND slot_type = 'available'
    AND is_active = true;

  SELECT COUNT(*) INTO v_booked_slots
  FROM appointments
  WHERE doctor_id = p_doctor_id
    AND date >= p_week_start::text
    AND date < (p_week_start + INTERVAL '7 days')::date::text
    AND status NOT IN ('Cancelled', 'No Show');

  RETURN jsonb_build_object(
    'active_days',   v_active_days,
    'total_slots',   v_total_slots,
    'booked_slots',  v_booked_slots
  );
END;
$function$;

-- ─── save_doctor_schedule ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_doctor_schedule(p_doctor_id text, p_slots jsonb, p_week_start date, p_created_by text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_slot          JSONB;
  v_inserted      INTEGER := 0;
  v_template_id   UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_doctor_id AND role = 'Doctor') THEN
    RAISE EXCEPTION 'Doctor not found: %', p_doctor_id;
  END IF;

  DELETE FROM doctor_schedules WHERE doctor_id = p_doctor_id;

  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO doctor_schedules (
      doctor_id, day_of_week,
      start_time, end_time, slot_type,
      slot_duration, is_active,
      created_by, created_at
    ) VALUES (
      p_doctor_id,
      (v_slot->>'day_of_week')::INTEGER,
      (v_slot->>'start_time')::TIME,
      (v_slot->>'end_time')::TIME,
      COALESCE(v_slot->>'slot_type', 'available'),
      COALESCE((v_slot->>'slot_duration')::INTEGER, 30),
      true,
      p_created_by,
      NOW()
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  INSERT INTO schedule_templates (
    doctor_id, template_name, week_start, created_by, created_at
  ) VALUES (
    p_doctor_id, 'Default', p_week_start, p_created_by, NOW()
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO v_template_id;

  RETURN jsonb_build_object(
    'success',      true,
    'slots_saved',  v_inserted,
    'template_id',  v_template_id
  );
END;
$function$;

-- ─── process_patient_refund ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_patient_refund(p_patient_id text, p_return_ids uuid[], p_bill_ids text[], p_refund_method text, p_remarks text, p_created_by text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_refund_id       UUID;
  v_ref_no          TEXT;
  v_total_refund    NUMERIC := 0;
  v_return_record   RECORD;
  v_bill_record     RECORD;
  v_total_paid      NUMERIC;
  v_total_refunded  NUMERIC;
  v_refund_type     TEXT;
BEGIN
  v_refund_id := gen_random_uuid();
  v_ref_no    := 'REF-' || NEXTVAL('refund_seq')::TEXT;

  INSERT INTO patient_refunds (
    id, refund_no, patient_id,
    refund_date, total_amount, payment_method,
    remarks, created_by, created_at
  ) VALUES (
    v_refund_id, v_ref_no, p_patient_id,
    NOW(), 0, p_refund_method,
    p_remarks, p_created_by, NOW()
  );

  FOR v_return_record IN
    SELECT pr.*, b.paid_amount as bill_total, b.id as bill_id, b.invoice_no
    FROM pharmacy_returns pr
    JOIN bills b ON b.id::text = pr.original_bill_id::text
    WHERE pr.id = ANY(p_return_ids)
    FOR UPDATE
  LOOP
    IF v_return_record.refund_status = 'Refunded' THEN
      RAISE EXCEPTION 'Return % is already refunded', v_return_record.return_no;
    END IF;

    v_total_refund := v_total_refund + v_return_record.total_amount;

    UPDATE pharmacy_returns SET
      refund_status = 'Refunded',
      refund_id     = v_refund_id
    WHERE id::text = v_return_record.id::text;

    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_paid
    FROM pharmacy_returns
    WHERE original_bill_id::text = v_return_record.bill_id::text;

    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_refunded
    FROM pharmacy_returns
    WHERE original_bill_id::text = v_return_record.bill_id::text
      and refund_status = 'Refunded';

    IF v_total_refunded >= (v_return_record.bill_total - 0.01) THEN
      v_refund_type := 'Refunded';
    ELSE
      v_refund_type := 'Partial Refund';
    END IF;

    UPDATE bills SET
      refund_status = v_refund_type,
      refund_id     = v_refund_id,
      status        = CASE 
                        WHEN v_refund_type = 'Refunded' THEN 'Cancelled'
                        ELSE 'Partial_Return'
                      END,
      cancelled_at  = CASE
                        WHEN v_refund_type = 'Refunded' THEN NOW()
                        ELSE NULL
                      END
    WHERE id::text = v_return_record.bill_id::text;
  END LOOP;

  FOR v_bill_record IN
    SELECT * FROM bills
    WHERE id::text = ANY(p_bill_ids::text[])
    FOR UPDATE
  LOOP
    IF v_bill_record.refund_status = 'Refunded' THEN
      RAISE EXCEPTION 'Bill % is already fully refunded', v_bill_record.invoice_no;
    END IF;

    v_total_refund := v_total_refund + v_bill_record.paid_amount;

    UPDATE bills SET
      refund_status = 'Refunded',
      refund_id     = v_refund_id,
      status        = 'Cancelled',
      cancelled_at  = NOW()
    WHERE id::text = v_bill_record.id::text;
  END LOOP;

  UPDATE patient_refunds SET
    total_amount = v_total_refund
  WHERE id = v_refund_id;

  RETURN jsonb_build_object(
    'success',       true,
    'refund_id',     v_refund_id,
    'ref_no',        v_ref_no,
    'total_refund',  v_total_refund
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;

-- ─── process_pharmacy_return ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_pharmacy_return(p_original_bill_id text, p_return_items jsonb, p_store_id text, p_reason text, p_created_by text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_return_id           UUID;
  v_return_no           TEXT;
  v_return_amount       NUMERIC := 0;
  v_return_tax          NUMERIC := 0;
  v_original_total      NUMERIC;
  v_total_returned_amt  NUMERIC;
  v_return_type         TEXT;
  v_item                JSONB;
  v_dispensed_qty       NUMERIC := 0;
  v_already_returned    NUMERIC := 0;
  v_pending_refund      INTEGER := 0;
  v_bill_record         RECORD;
  v_item_id             TEXT;
  v_closing_stock       NUMERIC := 0;
  v_closing_stock_rate  NUMERIC := 0;
  v_batch_date          DATE;
  v_expiry_date         DATE;
  v_sales_cf            NUMERIC := 1.0;
  v_returned_qty_base   NUMERIC := 0;
  v_new_stock           NUMERIC := 0;
  v_tax_percent         NUMERIC := 0;
  v_item_total          NUMERIC := 0;
  v_item_tax            NUMERIC := 0;
BEGIN
  SELECT * INTO v_bill_record
  FROM bills
  WHERE id::text = p_original_bill_id::text
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found: %', p_original_bill_id;
  END IF;

  IF v_bill_record.status = 'Cancelled' THEN
    RAISE EXCEPTION 'Bill % is already fully cancelled', v_bill_record.invoice_no;
  END IF;

  SELECT COUNT(*) INTO v_pending_refund
  FROM pharmacy_returns
  WHERE original_bill_id::text = p_original_bill_id::text
    AND refund_status = 'Pending';

  IF v_pending_refund > 0 THEN
    RAISE EXCEPTION 'Process pending refund before initiating another return on bill %', 
      v_bill_record.invoice_no;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items)
  LOOP
    v_item_id := (v_item->>'item_id')::TEXT;
    
    SELECT COALESCE(SUM(quantity), 0) INTO v_dispensed_qty
    FROM bill_items
    WHERE bill_id::text = p_original_bill_id::text
      AND item_id::text = v_item_id::text;

    SELECT COALESCE(SUM(pri.quantity), 0) INTO v_already_returned
    FROM pharmacy_return_items pri
    JOIN pharmacy_returns pr ON pr.id::text = pri.return_id::text
    WHERE pr.original_bill_id::text = p_original_bill_id::text
      AND pri.item_id::text = v_item_id::text;

    IF (v_item->>'quantity')::NUMERIC > (v_dispensed_qty - v_already_returned) THEN
      RAISE EXCEPTION 'Return qty % exceeds available qty % for item ID %',
        (v_item->>'quantity')::NUMERIC,
        (v_dispensed_qty - v_already_returned),
        v_item_id;
    END IF;

    v_tax_percent := COALESCE((v_item->>'tax_percentage')::NUMERIC, 0);
    v_item_total := (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC;
    v_item_tax := v_item_total * v_tax_percent / (100.0 + v_tax_percent);
    
    v_return_amount := v_return_amount + v_item_total;
    v_return_tax := v_return_tax + v_item_tax;
  END LOOP;

  v_return_no := 'RET-D-' || TO_CHAR(NOW(), 'YY') || LPAD(NEXTVAL('credit_note_seq')::TEXT, 6, '0');

  INSERT INTO pharmacy_returns (
    id, return_no, original_bill_id, patient_id, store_id,
    return_date, total_amount, tax_amount, refund_status,
    created_by
  ) VALUES (
    gen_random_uuid(), v_return_no, p_original_bill_id::uuid, v_bill_record.patient_id, p_store_id::uuid,
    NOW(), v_return_amount, v_return_tax, 'Pending',
    p_created_by
  ) RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items)
  LOOP
    v_item_id := (v_item->>'item_id')::TEXT;
    v_tax_percent := COALESCE((v_item->>'tax_percentage')::NUMERIC, 0);
    v_item_total := (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC;
    v_item_tax := v_item_total * v_tax_percent / (100.0 + v_tax_percent);

    INSERT INTO pharmacy_return_items (
      id, return_id, item_id,
      batch_no, quantity, unit_price, tax_percentage, tax_amount, total_amount,
      description
    ) VALUES (
      gen_random_uuid(), v_return_id, v_item_id::uuid,
      (v_item->>'batch_no')::TEXT, (v_item->>'quantity')::NUMERIC, (v_item->>'unit_price')::NUMERIC,
      v_tax_percent, v_item_tax, v_item_total,
      (v_item->>'description')::TEXT
    );

    SELECT COALESCE(closing_stock, 0), COALESCE(closing_stock_rate, (v_item->>'unit_price')::NUMERIC)
    INTO v_closing_stock, v_closing_stock_rate
    FROM inventory_stock_ledger
    WHERE store_id::text = p_store_id::text AND item_id::text = v_item_id::text
    ORDER BY ref_doc_date DESC, created_at DESC
    LIMIT 1;

    SELECT batch_date, expiry_date INTO v_batch_date, v_expiry_date
    FROM inventory_stock_ledger
    WHERE store_id::text = p_store_id::text AND item_id::text = v_item_id::text AND ref_type = 'PHARMACY DISPENSE'
    ORDER BY ref_doc_date DESC, created_at DESC
    LIMIT 1;

    SELECT COALESCE(sales_conversion_factor, 1.0) INTO v_sales_cf
    FROM inventory_items
    WHERE id::text = v_item_id::text;

    v_returned_qty_base := (v_item->>'quantity')::NUMERIC * v_sales_cf;
    v_new_stock := v_closing_stock + v_returned_qty_base;

    INSERT INTO inventory_stock_ledger (
      id, store_id, item_id, batch_no, batch_date, expiry_date,
      transaction_type, ref_type, ref_doc_no, ref_doc_date,
      stock_in_quantity, stock_out_quantity,
      closing_stock, closing_stock_rate, closing_stock_value,
      currency
    ) VALUES (
      gen_random_uuid(), p_store_id::uuid, v_item_id::uuid, (v_item->>'batch_no')::TEXT, v_batch_date, v_expiry_date,
      'Return', 'PHARMACY RETURN', v_return_no, NOW(),
      v_returned_qty_base, 0,
      v_new_stock, v_closing_stock_rate, v_new_stock * v_closing_stock_rate,
      'SAR'
    );
  END LOOP;

  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_returned_amt
  FROM pharmacy_returns
  WHERE original_bill_id::text = p_original_bill_id::text;

  v_original_total := v_bill_record.total_amount;

  IF v_total_returned_amt >= (v_original_total - 0.01) THEN
    v_return_type := 'FULL';
  ELSE
    v_return_type := 'PARTIAL';
  END IF;

  UPDATE bills SET
    status       = CASE WHEN v_return_type = 'FULL' THEN 'Cancelled' ELSE 'Partial_Return' END,
    cancelled_at = CASE WHEN v_return_type = 'FULL' THEN NOW() ELSE NULL END
  WHERE id::text = p_original_bill_id::text;

  RETURN jsonb_build_object(
    'success',       true,
    'return_id',     v_return_id,
    'return_no',     v_return_no,
    'return_type',   v_return_type,
    'return_amount', v_return_amount
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;

-- ─── enroll_or_fetch_loyalty_account ─────────────────────────
CREATE OR REPLACE FUNCTION public.enroll_or_fetch_loyalty_account(p_mobile character varying, p_name character varying, p_patient_id character varying DEFAULT NULL::character varying, p_created_by character varying DEFAULT 'system'::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_account       loyalty_accounts%ROWTYPE;
  v_tier          loyalty_tiers%ROWTYPE;
  v_welcome_pts   NUMERIC := 0;
  v_is_new        BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_account FROM loyalty_accounts WHERE mobile = p_mobile;

  IF NOT FOUND THEN
    SELECT COALESCE(points_awarded, 0) INTO v_welcome_pts
    FROM loyalty_bonus_rules
    WHERE bonus_type = 'WELCOME' AND is_active = TRUE
    LIMIT 1;

    INSERT INTO loyalty_accounts (
      mobile, patient_name, patient_id,
      current_points, lifetime_points,
      enrolment_source, current_tier
    ) VALUES (
      p_mobile, p_name, p_patient_id,
      v_welcome_pts, v_welcome_pts,
      'Pharmacy', 'Silver'
    ) RETURNING * INTO v_account;

    IF v_welcome_pts > 0 THEN
      INSERT INTO loyalty_transactions (
        account_id, transaction_type, points,
        balance_before, balance_after, monetary_value,
        description, created_by
      ) VALUES (
        v_account.id, 'WELCOME', v_welcome_pts,
        0, v_welcome_pts, v_welcome_pts,
        'Welcome bonus on enrolment', p_created_by
      );
    END IF;

    v_is_new := TRUE;
  END IF;

  SELECT * INTO v_tier FROM loyalty_tiers WHERE tier_name = v_account.current_tier;

  RETURN jsonb_build_object(
    'account_id',       v_account.id,
    'account_no',       v_account.account_no,
    'patient_name',     v_account.patient_name,
    'mobile',           v_account.mobile,
    'current_tier',     v_account.current_tier,
    'earn_multiplier',  v_tier.earn_multiplier,
    'current_points',   v_account.current_points,
    'lifetime_points',  v_account.lifetime_points,
    'point_value',      (SELECT COALESCE(point_value, 1.00) FROM loyalty_program_config LIMIT 1),
    'account_status',   v_account.account_status,
    'is_new_account',   v_is_new,
    'welcome_points',   v_welcome_pts
  );
END;
$function$;

-- ─── calculate_loyalty_redemption ────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_loyalty_redemption(p_account_id uuid, p_bill_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_account       loyalty_accounts%ROWTYPE;
  v_rules         loyalty_redemption_rules%ROWTYPE;
  v_max_by_pct    NUMERIC;
  v_max_redeemable NUMERIC;
BEGIN
  SELECT * INTO v_account FROM loyalty_accounts WHERE id = p_account_id;
  SELECT * INTO v_rules FROM loyalty_redemption_rules LIMIT 1;

  IF v_account.account_status != 'Active' THEN
    RETURN jsonb_build_object('eligible', FALSE, 'reason', 'Account is not active');
  END IF;

  IF v_account.current_points < v_rules.min_points_to_redeem THEN
    RETURN jsonb_build_object(
      'eligible', FALSE,
      'reason', 'Minimum ' || v_rules.min_points_to_redeem || ' points required to redeem',
      'current_points', v_account.current_points
    );
  END IF;

  v_max_by_pct    := FLOOR(p_bill_amount * v_rules.max_redemption_pct / 100);
  v_max_redeemable := LEAST(
    v_account.current_points,
    v_max_by_pct,
    v_rules.max_points_per_bill
  );

  RETURN jsonb_build_object(
    'eligible',         TRUE,
    'current_points',   v_account.current_points,
    'max_redeemable',   v_max_redeemable,
    'max_by_pct',       v_max_by_pct,
    'max_absolute',     v_rules.max_points_per_bill,
    'point_value',      (SELECT COALESCE(point_value, 1.00) FROM loyalty_program_config LIMIT 1),
    'discount_value',   v_max_redeemable * (SELECT COALESCE(point_value, 1.00) FROM loyalty_program_config LIMIT 1)
  );
END;
$function$;

-- ─── reverse_loyalty_transaction ─────────────────────────────
CREATE OR REPLACE FUNCTION public.reverse_loyalty_transaction(p_bill_no character varying, p_created_by character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_txn         loyalty_transactions%ROWTYPE;
  v_account     loyalty_accounts%ROWTYPE;
  v_net_points  NUMERIC := 0;
BEGIN
  FOR v_txn IN
    SELECT * FROM loyalty_transactions
    WHERE reference_bill_no = p_bill_no
      AND is_reversed = FALSE
    FOR UPDATE
  LOOP
    v_net_points := v_net_points + (-v_txn.points);
    UPDATE loyalty_transactions SET is_reversed = TRUE WHERE id = v_txn.id;
  END LOOP;

  IF v_net_points = 0 THEN
    RETURN jsonb_build_object('success', TRUE, 'message', 'No transactions to reverse');
  END IF;

  SELECT * INTO v_account
  FROM loyalty_accounts
  WHERE id = (SELECT account_id FROM loyalty_transactions WHERE reference_bill_no = p_bill_no LIMIT 1)
  FOR UPDATE;

  INSERT INTO loyalty_transactions (
    account_id, transaction_type, points,
    balance_before, balance_after, monetary_value,
    reference_bill_no, description, created_by
  ) VALUES (
    v_account.id, 'REVERSE', v_net_points,
    v_account.current_points,
    GREATEST(0, v_account.current_points + v_net_points),
    v_net_points * (SELECT COALESCE(point_value, 1.00) FROM loyalty_program_config LIMIT 1),
    p_bill_no,
    'Reversal for cancelled bill ' || p_bill_no, p_created_by
  );

  UPDATE loyalty_accounts SET
    current_points = GREATEST(0, current_points + v_net_points),
    updated_at     = NOW()
  WHERE id = v_account.id;

  RETURN jsonb_build_object(
    'success',          TRUE,
    'net_points_reversed', v_net_points,
    'new_balance',      GREATEST(0, v_account.current_points + v_net_points)
  );
END;
$function$;

-- ─── manual_points_adjustment ────────────────────────────────
CREATE OR REPLACE FUNCTION public.manual_points_adjustment(p_account_id uuid, p_type character varying, p_points numeric, p_reason text, p_created_by character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_account   loyalty_accounts%ROWTYPE;
  v_new_bal   NUMERIC;
  v_config    loyalty_program_config%ROWTYPE;
BEGIN
  SELECT * INTO v_account FROM loyalty_accounts WHERE id = p_account_id FOR UPDATE;
  SELECT * INTO v_config FROM loyalty_program_config LIMIT 1;

  IF p_type = 'ADJUST_ADD' THEN
    v_new_bal := v_account.current_points + p_points;
  ELSE
    v_new_bal := GREATEST(0, v_account.current_points - p_points);
  END IF;

  INSERT INTO loyalty_transactions (
    account_id, transaction_type, points,
    balance_before, balance_after, monetary_value,
    description, created_by
  ) VALUES (
    p_account_id, p_type,
    CASE WHEN p_type = 'ADJUST_ADD' THEN p_points ELSE -p_points END,
    v_account.current_points, v_new_bal,
    p_points * v_config.point_value,
    p_reason, p_created_by
  );

  UPDATE loyalty_accounts SET
    current_points = v_new_bal,
    updated_at     = NOW()
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'success',      TRUE,
    'new_balance',  v_new_bal,
    'adjusted_by',  CASE WHEN p_type = 'ADJUST_ADD' THEN p_points ELSE -p_points END
  );
END;
$function$;

-- ─── process_loyalty_transaction ─────────────────────────────
CREATE OR REPLACE FUNCTION public.process_loyalty_transaction(p_account_id uuid, p_bill_no character varying, p_bill_amount numeric, p_cash_paid numeric, p_points_redeemed numeric, p_created_by character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_account         loyalty_accounts%ROWTYPE;
  v_config          loyalty_program_config%ROWTYPE;
  v_tier            loyalty_tiers%ROWTYPE;
  v_points_earned   NUMERIC;
  v_new_balance     NUMERIC;
  v_new_lifetime    NUMERIC;
  v_new_tier        VARCHAR;
  v_redeemed_value  NUMERIC;
  v_earn_txn_id     UUID;
  v_redeem_txn_id   UUID;
BEGIN
  SELECT * INTO v_account FROM loyalty_accounts WHERE id = p_account_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loyalty account not found: %', p_account_id;
  END IF;

  IF v_account.account_status != 'Active' THEN
    RAISE EXCEPTION 'Loyalty account is not active';
  END IF;

  SELECT * INTO v_config FROM loyalty_program_config LIMIT 1;
  IF v_config.id IS NULL THEN
    v_config.program_status := 'Active';
    v_config.earn_rate := 1.00;
    v_config.point_value := 1.00;
    v_config.points_rounding := 'FLOOR';
  END IF;

  IF COALESCE(v_config.program_status, 'Active') != 'Active' THEN
    RAISE EXCEPTION 'Loyalty program is currently inactive';
  END IF;

  SELECT * INTO v_tier FROM loyalty_tiers WHERE tier_name = v_account.current_tier;
  IF v_tier.id IS NULL THEN
    IF v_account.current_tier = 'Silver' THEN
      v_tier.earn_multiplier := 1.00;
    ELSIF v_account.current_tier = 'Gold' THEN
      v_tier.earn_multiplier := 1.50;
    ELSIF v_account.current_tier = 'Platinum' THEN
      v_tier.earn_multiplier := 2.00;
    ELSE
      v_tier.earn_multiplier := 1.00;
    END IF;
  END IF;

  v_new_balance  := v_account.current_points;
  v_new_lifetime := v_account.lifetime_points;

  IF p_points_redeemed > 0 THEN
    IF p_points_redeemed > v_account.current_points THEN
      RAISE EXCEPTION 'Insufficient points. Available: %, Requested: %',
        v_account.current_points, p_points_redeemed;
    END IF;

    v_redeemed_value := p_points_redeemed * v_config.point_value;
    v_new_balance    := v_new_balance - p_points_redeemed;

    INSERT INTO loyalty_transactions (
      account_id, transaction_type, points,
      balance_before, balance_after, monetary_value,
      reference_bill_no, reference_amount,
      description, created_by
    ) VALUES (
      p_account_id, 'REDEEM', -p_points_redeemed,
      v_account.current_points, v_new_balance, -v_redeemed_value,
      p_bill_no, p_bill_amount,
      'Points redeemed against bill ' || p_bill_no, p_created_by
    ) RETURNING id INTO v_redeem_txn_id;
  END IF;

  DECLARE
    v_raw_points NUMERIC;
  BEGIN
    v_raw_points := (p_cash_paid * COALESCE(v_config.earn_rate, 1.00) / 100.0) * COALESCE(v_tier.earn_multiplier, 1.00);
    
    IF COALESCE(v_config.points_rounding, 'FLOOR') = 'CEIL' THEN
      v_points_earned := CEIL(v_raw_points);
    ELSIF COALESCE(v_config.points_rounding, 'FLOOR') = 'ROUND' THEN
      v_points_earned := ROUND(v_raw_points);
    ELSE
      v_points_earned := FLOOR(v_raw_points);
    END IF;
  END;

  IF v_points_earned > 0 THEN
    v_new_balance  := v_new_balance + v_points_earned;
    v_new_lifetime := v_new_lifetime + v_points_earned;

    INSERT INTO loyalty_transactions (
      account_id, transaction_type, points,
      balance_before, balance_after, monetary_value,
      reference_bill_no, reference_amount,
      description, created_by
    ) VALUES (
      p_account_id, 'EARN', v_points_earned,
      v_account.current_points - CASE WHEN p_points_redeemed > 0 THEN p_points_redeemed ELSE 0 END,
      v_new_balance, 0,
      p_bill_no, p_bill_amount,
      'Points earned on transaction ' || p_bill_no, p_created_by
    ) RETURNING id INTO v_earn_txn_id;
  END IF;

  SELECT tier_name INTO v_new_tier
  FROM loyalty_tiers
  WHERE is_active = TRUE AND v_new_lifetime >= min_lifetime_points
  ORDER BY min_lifetime_points DESC
  LIMIT 1;

  IF v_new_tier IS NOT NULL AND v_new_tier != v_account.current_tier THEN
    INSERT INTO loyalty_tier_history (
      account_id, changed_from, changed_to, changed_on, reason
    ) VALUES (
      p_account_id, v_account.current_tier, v_new_tier, NOW(), 'Automatic milestone upgrade'
    );
  ELSE
    v_new_tier := v_account.current_tier;
  END IF;

  UPDATE loyalty_accounts SET
    current_points   = v_new_balance,
    lifetime_points  = v_new_lifetime,
    lifetime_spend   = lifetime_spend + p_bill_amount,
    total_transactions = total_transactions + 1,
    last_transaction_date = CURRENT_DATE,
    current_tier     = v_new_tier,
    updated_at       = NOW()
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'success',         TRUE,
    'points_earned',   v_points_earned,
    'points_redeemed', p_points_redeemed,
    'new_balance',     v_new_balance,
    'current_tier',    v_new_tier,
    'is_tier_upgraded', (v_new_tier != v_account.current_tier)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;

-- ─── trg_create_lims_lab_order_on_billing ───────────────────
CREATE OR REPLACE FUNCTION public.trg_create_lims_lab_order_on_billing()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
            SELECT specimen_id INTO v_specimen_id
            FROM lims_service_configs
            WHERE service_id = v_rec.component_service_id;

            v_barcode := NULL;
            IF NEW.appointment_id IS NOT NULL THEN
              SELECT l.barcode_no INTO v_barcode
              FROM lims_lab_orders l
              JOIN service_orders s ON l.service_order_id = s.id
              LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
              WHERE s.appointment_id = NEW.appointment_id
                AND (
                  (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                  OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
                )
              LIMIT 1;
            END IF;

            IF v_barcode IS NULL THEN
              SELECT l.barcode_no INTO v_barcode
              FROM lims_lab_orders l
              LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
              WHERE l.service_order_id = NEW.id
                AND (
                  (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                  OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
                )
              LIMIT 1;
            END IF;

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
          SELECT specimen_id INTO v_specimen_id
          FROM lims_service_configs
          WHERE service_id = NEW.service_id;

          v_barcode := NULL;
          IF NEW.appointment_id IS NOT NULL THEN
            SELECT l.barcode_no INTO v_barcode
            FROM lims_lab_orders l
            JOIN service_orders s ON l.service_order_id = s.id
            LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
            WHERE s.appointment_id = NEW.appointment_id
              AND (
                (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
              )
            LIMIT 1;
          END IF;

          IF v_barcode IS NULL THEN
            v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
          END IF;

          INSERT INTO lims_lab_orders (
            id, service_order_id, service_id, source_profile_service_id,
            profile_group_id, barcode_no, priority, status, ordered_at
          ) VALUES (
            gen_random_uuid(), NEW.id,
            NEW.service_id, NULL, NULL,
            v_barcode,
            COALESCE(NEW.priority, 'Routine'),
            'Ordered', NOW()
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ─── trg_create_lims_lab_order_on_billing_insert ────────────
CREATE OR REPLACE FUNCTION public.trg_create_lims_lab_order_on_billing_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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

            v_barcode := NULL;
            IF NEW.appointment_id IS NOT NULL THEN
              SELECT l.barcode_no INTO v_barcode
              FROM lims_lab_orders l
              JOIN service_orders s ON l.service_order_id = s.id
              LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
              WHERE s.appointment_id = NEW.appointment_id
                AND (
                  (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                  OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
                )
              LIMIT 1;
            END IF;

            IF v_barcode IS NULL THEN
              SELECT l.barcode_no INTO v_barcode
              FROM lims_lab_orders l
              LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
              WHERE l.service_order_id = NEW.id
                AND (
                  (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                  OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
                )
              LIMIT 1;
            END IF;

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
          SELECT specimen_id INTO v_specimen_id
          FROM lims_service_configs
          WHERE service_id = NEW.service_id;

          v_barcode := NULL;
          IF NEW.appointment_id IS NOT NULL THEN
            SELECT l.barcode_no INTO v_barcode
            FROM lims_lab_orders l
            JOIN service_orders s ON l.service_order_id = s.id
            LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
            WHERE s.appointment_id = NEW.appointment_id
              AND (
                (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
              )
            LIMIT 1;
          END IF;

          IF v_barcode IS NULL THEN
            v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
          END IF;

          INSERT INTO lims_lab_orders (
            id, service_order_id, service_id, source_profile_service_id,
            profile_group_id, barcode_no, priority, status, ordered_at
          ) VALUES (
            gen_random_uuid(), NEW.id,
            NEW.service_id, NULL, NULL,
            v_barcode,
            COALESCE(NEW.priority, 'Routine'),
            'Ordered', NOW()
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ─── process_reagent_deduction ───────────────────────────────
CREATE OR REPLACE FUNCTION public.process_reagent_deduction(p_lab_order_id uuid, p_override boolean DEFAULT false, p_override_reason text DEFAULT NULL::text, p_performed_by text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_service_id TEXT;
  v_reagent RECORD;
  v_lot RECORD;
  v_deducted_qty NUMERIC := 0;
  v_needed NUMERIC;
  v_available NUMERIC;
  v_remaining_deduct NUMERIC;
  v_closing_stock NUMERIC;
  v_prev_rate NUMERIC;
  v_ledger_id UUID;
  v_shortfalls JSONB := '[]'::jsonb;
  v_warnings JSONB := '[]'::jsonb;
  v_open_deductions INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_open_deductions
  FROM lab_reagent_consumption_log
  WHERE lab_order_id = p_lab_order_id AND action IN ('DEDUCT', 'OVERRIDE_DEDUCT') AND reversed_by_log_id IS NULL;

  IF v_open_deductions > 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Reagents already deducted for this order.');
  END IF;

  SELECT COALESCE(l.service_id, (SELECT s.service_id FROM service_orders s WHERE s.id::text = l.service_order_id::text))
  INTO v_service_id
  FROM lims_lab_orders l
  WHERE l.id = p_lab_order_id;

  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve service for lab order %.', p_lab_order_id;
  END IF;

  FOR v_reagent IN
    SELECT r.*, i.item_name, i.item_code
    FROM lab_service_reagents r
    JOIN inventory_items i ON r.item_id::text = i.id::text
    WHERE r.service_id = v_service_id
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext(v_reagent.item_id::text || ':' || v_reagent.store_id::text));
    PERFORM 1 FROM inventory_stock_ledger WHERE item_id::text = v_reagent.item_id::text AND store_id::text = v_reagent.store_id::text FOR UPDATE;
    
    v_needed := v_reagent.quantity_per_test;
    
    WITH lot_balances AS (
      SELECT l.batch_no, l.expiry_date, COALESCE(gi.qc_status, 'Passed') AS qc_status, SUM(l.stock_in_quantity - l.stock_out_quantity) AS native_balance
      FROM inventory_stock_ledger l
      LEFT JOIN procurement_grn_items gi ON gi.item_id::text = l.item_id::text AND gi.batch_code::text = l.batch_no::text
      WHERE l.item_id::text = v_reagent.item_id::text AND l.store_id::text = v_reagent.store_id::text
      GROUP BY l.batch_no, l.expiry_date, gi.qc_status
      HAVING SUM(l.stock_in_quantity - l.stock_out_quantity) > 0
    )
    SELECT COALESCE(SUM(native_balance), 0) INTO v_available
    FROM lot_balances
    WHERE qc_status = 'Passed' AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE);

    IF v_available < v_needed THEN
      IF v_reagent.is_mandatory THEN
        IF p_override = FALSE THEN
          v_shortfalls := v_shortfalls || jsonb_build_object('item_id', v_reagent.item_id, 'item_name', v_reagent.item_name, 'item_code', v_reagent.item_code, 'required_base_uom', v_needed, 'available_base_uom', v_available);
        ELSE
          INSERT INTO lab_reagent_consumption_log (lab_order_id, service_id, item_id, store_id, quantity_deducted, action, override_reason, performed_by)
          VALUES (p_lab_order_id, v_service_id, v_reagent.item_id, v_reagent.store_id, 0, 'OVERRIDE_DEDUCT', p_override_reason, p_performed_by);
        END IF;
      ELSE
        v_warnings := v_warnings || jsonb_build_object('item_name', v_reagent.item_name, 'message', 'Optional reagent has insufficient stock.');
      END IF;
      CONTINUE;
    END IF;

    v_remaining_deduct := v_needed;
    
    FOR v_lot IN
      SELECT l.batch_no, l.expiry_date, SUM(l.stock_in_quantity - l.stock_out_quantity) AS native_balance, COALESCE(gi.qc_status, 'Passed') AS qc_status
      FROM inventory_stock_ledger l
      LEFT JOIN procurement_grn_items gi ON gi.item_id::text = l.item_id::text AND gi.batch_code::text = l.batch_no::text
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
      
      INSERT INTO inventory_stock_ledger (id, store_id, item_id, batch_no, expiry_date, transaction_type, ref_type, ref_doc_no, ref_doc_date, stock_in_quantity, stock_out_quantity, closing_stock, closing_stock_rate, closing_stock_value, currency)
      VALUES (v_ledger_id, v_reagent.store_id, v_reagent.item_id, v_lot.batch_no, v_lot.expiry_date, 'STOCKOUT', 'LAB CONSUMPTION', p_lab_order_id::text, NOW(), 0, v_deducted_qty, v_closing_stock - v_deducted_qty, v_prev_rate, (v_closing_stock - v_deducted_qty) * v_prev_rate, 'SAR');
      
      INSERT INTO lab_reagent_consumption_log (lab_order_id, service_id, item_id, store_id, quantity_deducted, ledger_ref_id, action, performed_by)
      VALUES (p_lab_order_id, v_service_id, v_reagent.item_id, v_reagent.store_id, v_deducted_qty, v_ledger_id, 'DEDUCT', p_performed_by);
      
      v_remaining_deduct := v_remaining_deduct - v_deducted_qty;
    END LOOP;
  END LOOP;

  IF jsonb_array_length(v_shortfalls) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING DETAIL = v_shortfalls::text;
  END IF;

  RETURN jsonb_build_object('success', true, 'shortfalls', v_shortfalls, 'warnings', v_warnings);
END;
$function$;

-- ─── process_reagent_reversal ────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_reagent_reversal(p_lab_order_id uuid, p_performed_by text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_log               RECORD;
  v_orig_ledger       RECORD;
  v_closing_stock     NUMERIC;
  v_new_ledger_id     UUID;
  v_reverse_log_id    UUID;
BEGIN
  FOR v_log IN
    SELECT * FROM lab_reagent_consumption_log
    WHERE lab_order_id::text = p_lab_order_id::text 
      AND action IN ('DEDUCT', 'OVERRIDE_DEDUCT')
      AND reversed_by_log_id IS NULL
  LOOP
    IF v_log.action = 'OVERRIDE_DEDUCT' AND v_log.ledger_ref_id IS NULL THEN
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
      SELECT COALESCE(closing_stock, 0) INTO v_closing_stock
      FROM inventory_stock_ledger
      WHERE store_id::text = v_orig_ledger.store_id::text AND item_id::text = v_orig_ledger.item_id::text
      ORDER BY ref_doc_date DESC, created_at DESC
      LIMIT 1;

      v_new_ledger_id := gen_random_uuid();

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
$function$;

-- =============================================================
-- SECTION 3: VIEWS
-- =============================================================

CREATE OR REPLACE VIEW public.vw_batch_locations AS
 SELECT bl.id,
    bl.store_id,
    bl.item_id,
    bl.batch_no,
    bl.shelf_no,
    bl.bin_no,
    bl.is_primary,
    bl.notes,
    bl.created_by,
    bl.updated_at,
    pz.id AS zone_id,
    pz.zone_code,
    pz.zone_name,
    pz.temperature,
    pr.id AS rack_id,
    pr.rack_code,
    pr.rack_name,
    ii.item_name,
    ii.item_code,
    ((((((((('Zone '::text || (pz.zone_code)::text) || ' › '::text) || (pr.rack_code)::text) || ' › '::text) || 'Shelf '::text) || bl.shelf_no) || ' › '::text) || 'Bin '::text) || (bl.bin_no)::text) AS location_display,
    (((((((pz.zone_code)::text || '-'::text) || (pr.rack_code)::text) || '-S'::text) || bl.shelf_no) || '-B'::text) || lpad((bl.bin_no)::text, 2, '0'::text)) AS location_code
   FROM (((inventory_batch_locations bl
     JOIN pharmacy_zones pz ON ((pz.id = bl.zone_id)))
     JOIN pharmacy_racks pr ON ((pr.id = bl.rack_id)))
     JOIN inventory_items ii ON ((ii.id = bl.item_id)));

-- =============================================================
-- SECTION 4: TRIGGERS
-- =============================================================

CREATE TRIGGER doctor_schedules_updated_at BEFORE UPDATE ON public.doctor_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_loyalty_account_no BEFORE INSERT ON public.loyalty_accounts FOR EACH ROW WHEN (((new.account_no IS NULL) OR ((new.account_no)::text = ''::text))) EXECUTE FUNCTION generate_loyalty_account_no();
CREATE TRIGGER bills_amount_immutable BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION prevent_bill_amount_update();
CREATE TRIGGER bills_status_audit AFTER UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION log_bill_status_change();
CREATE TRIGGER trg_no_nested_profiles BEFORE INSERT OR UPDATE ON public.lab_service_profile_components FOR EACH ROW EXECUTE FUNCTION check_no_nested_profiles();
CREATE TRIGGER trg_lims_lab_order_on_billing AFTER UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION trg_create_lims_lab_order_on_billing();
CREATE TRIGGER trg_lims_lab_order_on_billing_insert AFTER INSERT ON public.service_orders FOR EACH ROW EXECUTE FUNCTION trg_create_lims_lab_order_on_billing_insert();
