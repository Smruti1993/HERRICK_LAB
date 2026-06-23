-- Run this script in your Supabase SQL Editor:

-- 1. Create Sequences for Return and Refund Numbers (starting safely)
CREATE SEQUENCE IF NOT EXISTS credit_note_seq START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS refund_seq START WITH 26000006; -- Starting after existing refund numbers

-- 2. Standardise bills.status constraint
ALTER TABLE bills 
  DROP CONSTRAINT IF EXISTS bills_status_check;

ALTER TABLE bills 
  ADD CONSTRAINT bills_status_check 
  CHECK (status IN (
    'Unpaid',
    'Partial',
    'Paid',
    'Partial_Return',
    'Cancelled'
  ));

-- 3. Standardise bills.refund_status constraint
ALTER TABLE bills
  DROP CONSTRAINT IF EXISTS bills_refund_status_check;

ALTER TABLE bills
  ADD CONSTRAINT bills_refund_status_check
  CHECK (refund_status IN (
    'Pending',
    'Partial Refund',
    'Refunded'
  ));

-- 4. Standardise pharmacy_returns.refund_status constraint
ALTER TABLE pharmacy_returns
  DROP CONSTRAINT IF EXISTS pharmacy_returns_refund_status_check;

ALTER TABLE pharmacy_returns
  ADD CONSTRAINT pharmacy_returns_refund_status_check
  CHECK (refund_status IN (
    'Pending',
    'Partial Refund',
    'Refunded'
  ));

-- 5. Create Supabase RPC: process_pharmacy_return
DROP FUNCTION IF EXISTS public.process_pharmacy_return(uuid, jsonb, uuid, text, text);
DROP FUNCTION IF EXISTS public.process_pharmacy_return(text, jsonb, text, text, text);

CREATE OR REPLACE FUNCTION process_pharmacy_return(
  p_original_bill_id    TEXT,     -- TEXT in actual DB
  p_return_items        JSONB,    -- [{item_id, quantity, unit_price, batch_no, tax_percentage, description}]
  p_store_id            TEXT,     -- TEXT in actual DB
  p_reason              TEXT,     
  p_created_by          TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  
  -- Stock ledger variables
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

  -- LOCK the bill row to prevent race conditions
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

  -- GUARD: Block new return if prior refund is still pending
  SELECT COUNT(*) INTO v_pending_refund
  FROM pharmacy_returns
  WHERE original_bill_id::text = p_original_bill_id::text
    AND refund_status = 'Pending';

  IF v_pending_refund > 0 THEN
    RAISE EXCEPTION 'Process pending refund before initiating another return on bill %', 
      v_bill_record.invoice_no;
  END IF;

  -- VALIDATE each return item against dispensed and already-returned qty
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items)
  LOOP
    v_item_id := (v_item->>'item_id')::TEXT;
    
    -- Get originally dispensed qty
    SELECT COALESCE(SUM(quantity), 0) INTO v_dispensed_qty
    FROM bill_items
    WHERE bill_id::text = p_original_bill_id::text
      AND item_id::text = v_item_id::text;

    -- Get already returned qty for this item
    SELECT COALESCE(SUM(pri.quantity), 0) INTO v_already_returned
    FROM pharmacy_return_items pri
    JOIN pharmacy_returns pr ON pr.id::text = pri.return_id::text
    WHERE pr.original_bill_id::text = p_original_bill_id::text
      AND pri.item_id::text = v_item_id::text;

    -- Validate
    IF (v_item->>'quantity')::NUMERIC > (v_dispensed_qty - v_already_returned) THEN
      RAISE EXCEPTION 'Return qty % exceeds available qty % for item ID %',
        (v_item->>'quantity')::NUMERIC,
        (v_dispensed_qty - v_already_returned),
        v_item_id;
    END IF;

    -- Accumulate return amount and tax
    v_tax_percent := COALESCE((v_item->>'tax_percentage')::NUMERIC, 0);
    v_item_total := (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC;
    v_item_tax := v_item_total * v_tax_percent / (100.0 + v_tax_percent);
    
    v_return_amount := v_return_amount + v_item_total;
    v_return_tax := v_return_tax + v_item_tax;
  END LOOP;

  -- Generate return number (compatible with RET-D-YYXXXXXX)
  v_return_no := 'RET-D-' || TO_CHAR(NOW(), 'YY') || LPAD(NEXTVAL('credit_note_seq')::TEXT, 6, '0');

  -- Create pharmacy_return header
  INSERT INTO pharmacy_returns (
    id, return_no, original_bill_id, patient_id, store_id,
    return_date, total_amount, tax_amount, refund_status,
    created_by
  ) VALUES (
    gen_random_uuid(), v_return_no, p_original_bill_id::uuid, v_bill_record.patient_id, p_store_id::uuid,
    NOW(), v_return_amount, v_return_tax, 'Pending',
    p_created_by
  ) RETURNING id INTO v_return_id;

  -- Insert pharmacy_return_items and write to inventory stock ledger
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items)
  LOOP
    v_item_id := (v_item->>'item_id')::TEXT;
    v_tax_percent := COALESCE((v_item->>'tax_percentage')::NUMERIC, 0);
    v_item_total := (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC;
    v_item_tax := v_item_total * v_tax_percent / (100.0 + v_tax_percent);

    -- Insert return item
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

    -- Restock inventory atomically by adding to ledger
    -- 1. Get latest closing stock info for item
    SELECT COALESCE(closing_stock, 0), COALESCE(closing_stock_rate, (v_item->>'unit_price')::NUMERIC)
    INTO v_closing_stock, v_closing_stock_rate
    FROM inventory_stock_ledger
    WHERE store_id::text = p_store_id::text AND item_id::text = v_item_id::text
    ORDER BY ref_doc_date DESC, created_at DESC
    LIMIT 1;

    -- 2. Get batch date/expiry from most recent dispense
    SELECT batch_date, expiry_date INTO v_batch_date, v_expiry_date
    FROM inventory_stock_ledger
    WHERE store_id::text = p_store_id::text AND item_id::text = v_item_id::text AND ref_type = 'PHARMACY DISPENSE'
    ORDER BY ref_doc_date DESC, created_at DESC
    LIMIT 1;

    -- 3. Get sales conversion factor
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

  -- Calculate total returned amount across ALL returns for this bill
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_returned_amt
  FROM pharmacy_returns
  WHERE original_bill_id::text = p_original_bill_id::text;

  v_original_total := v_bill_record.total_amount;

  -- Determine PARTIAL or FULL
  IF v_total_returned_amt >= (v_original_total - 0.01) THEN
    v_return_type := 'FULL';
  ELSE
    v_return_type := 'PARTIAL';
  END IF;

  -- Update original bill status atomically
  UPDATE bills SET
    status       = CASE WHEN v_return_type = 'FULL' THEN 'Cancelled' ELSE 'Partial_Return' END,
    cancelled_at = CASE WHEN v_return_type = 'FULL' THEN NOW() ELSE NULL END
  WHERE id::text = p_original_bill_id::text;

  -- Return result to caller
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
$$;


-- 6. Create Supabase RPC: process_patient_refund
DROP FUNCTION IF EXISTS public.process_patient_refund(uuid, uuid[], uuid[], text, text, text);
DROP FUNCTION IF EXISTS public.process_patient_refund(text, uuid[], uuid[], text, text, text);
DROP FUNCTION IF EXISTS public.process_patient_refund(text, uuid[], text[], text, text, text);

CREATE OR REPLACE FUNCTION process_patient_refund(
  p_patient_id      TEXT,
  p_return_ids      UUID[],   -- array of pharmacy_return IDs to refund
  p_bill_ids        TEXT[],   -- array of service bill IDs to refund (cancellations) - TEXT in actual DB
  p_refund_method   TEXT,     -- 'Cash' | 'UPI' | 'Card'
  p_remarks         TEXT,
  p_created_by      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Generate refund reference number
  v_refund_id := gen_random_uuid();
  v_ref_no    := 'REF-' || NEXTVAL('refund_seq')::TEXT;

  -- Create patient_refunds record with 0 amount first to satisfy foreign key constraints
  INSERT INTO patient_refunds (
    id, refund_no, patient_id,
    refund_date, total_amount, payment_method,
    remarks, created_by, created_at
  ) VALUES (
    v_refund_id, v_ref_no, p_patient_id,
    NOW(), 0, p_refund_method,
    p_remarks, p_created_by, NOW()
  );

  -- PROCESS pharmacy return refunds
  FOR v_return_record IN
    SELECT pr.*, b.paid_amount as bill_total, b.id as bill_id, b.invoice_no
    FROM pharmacy_returns pr
    JOIN bills b ON b.id::text = pr.original_bill_id::text
    WHERE pr.id = ANY(p_return_ids)
    FOR UPDATE  -- lock all rows
  LOOP
    IF v_return_record.refund_status = 'Refunded' THEN
      RAISE EXCEPTION 'Return % is already refunded', v_return_record.return_no;
    END IF;

    v_total_refund := v_total_refund + v_return_record.total_amount;

    -- Mark pharmacy_return as refunded
    UPDATE pharmacy_returns SET
      refund_status = 'Refunded',
      refund_id     = v_refund_id
    WHERE id::text = v_return_record.id::text;

    -- Check if all returns for this bill are now refunded
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_paid
    FROM pharmacy_returns
    WHERE original_bill_id::text = v_return_record.bill_id::text;

    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_refunded
    FROM pharmacy_returns
    WHERE original_bill_id::text = v_return_record.bill_id::text
      and refund_status = 'Refunded';

    -- Determine partial or full refund for the bill
    IF v_total_refunded >= (v_return_record.bill_total - 0.01) THEN
      v_refund_type := 'Refunded';
    ELSE
      v_refund_type := 'Partial Refund';
    END IF;

    -- Update original bill
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

  -- PROCESS service invoice refunds (full cancellations)
  FOR v_bill_record IN
    SELECT * FROM bills
    WHERE id::text = ANY(p_bill_ids::text[])
    FOR UPDATE
  LOOP
    IF v_bill_record.refund_status = 'Refunded' THEN
      RAISE EXCEPTION 'Bill % is already fully refunded', v_bill_record.invoice_no;
    END IF;

    v_total_refund := v_total_refund + v_bill_record.paid_amount;

    -- Update service bill
    UPDATE bills SET
      refund_status = 'Refunded',
      refund_id     = v_refund_id,
      status        = 'Cancelled',
      cancelled_at  = NOW()
    WHERE id::text = v_bill_record.id::text;

  END LOOP;

  -- Update the final calculated total refund amount in patient_refunds
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
$$;
