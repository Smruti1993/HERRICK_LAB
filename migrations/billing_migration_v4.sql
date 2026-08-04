-- ============================================================
-- BILLING & REFUND MODULE — Schema Migration v4
-- MediCore HMS
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
-- ============================================================
-- This is idempotent (safe to re-run). Uses IF NOT EXISTS /
-- ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE throughout.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Invoice Numbering Sequence
-- ─────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS billing_invoice_seq
  START WITH 100001
  INCREMENT BY 1
  NO CYCLE;

-- ─────────────────────────────────────────────────────────────
-- 2. Extend bills table
--    Note: finance_organizations.id is UUID → sponsor_id is UUID
--    Note: branches.id is UUID → branch_id is UUID
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS branch_id       UUID    REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payer_type      TEXT    NOT NULL DEFAULT 'Self'
                                                    CHECK (payer_type IN ('Self', 'Sponsor')),
  ADD COLUMN IF NOT EXISTS sponsor_id      UUID    REFERENCES public.finance_organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_due_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS sponsor_due_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- ─────────────────────────────────────────────────────────────
-- 3. Extend finance_organizations (sponsor master)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.finance_organizations
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 4. Service Approvals
--    order_id is TEXT to match service_orders.id (TEXT type confirmed)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_approvals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        TEXT        NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  sponsor_id      UUID        REFERENCES public.finance_organizations(id) ON DELETE SET NULL,
  approval_status TEXT        NOT NULL DEFAULT 'Pending'
                              CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
  approval_code   TEXT,
  amount_approved NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  remarks         TEXT,
  requested_by    TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 5. Credit Memos
--    bill_id is TEXT to match bills.id (TEXT type confirmed)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_memos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         TEXT        NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
  refund_id       UUID,       -- Populated after cash payout; FK added below after patient_refunds is confirmed
  credit_memo_no  TEXT        UNIQUE NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  reason          TEXT        NOT NULL,
  created_by      TEXT        NOT NULL,
  approved_by     TEXT,
  status          TEXT        NOT NULL DEFAULT 'Approved'
                              CHECK (status IN ('Pending_Approval', 'Approved', 'Rejected')),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 6. Bill Status History (audit trail)
--    bill_id is TEXT to match bills.id
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bill_status_history (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     TEXT    NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT    NOT NULL,
  changed_by  TEXT    NOT NULL,
  reason      TEXT,
  changed_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 7. Extend existing patient_refunds table
--    The table already exists with: id, refund_no, patient_id,
--    refund_date, total_amount, payment_method, remarks,
--    created_by, created_at.
--    We add: status column (missing), keep it as a header table
--    (bills.refund_id FK already points to it — preserved).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.patient_refunds
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending'
                                  CHECK (status IN ('Pending', 'Processed', 'Rejected'));

-- FK: credit_memos → patient_refunds (safe to run after both tables exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_credit_memos_refund_id'
  ) THEN
    ALTER TABLE public.credit_memos
      ADD CONSTRAINT fk_credit_memos_refund_id
      FOREIGN KEY (refund_id)
      REFERENCES public.patient_refunds(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 8. Immutability Trigger on bills.total_amount
--    Uses current_setting('role', true) rather than auth.jwt()
--    because the Express backend connects via the service_role key
--    which bypasses PostgREST's JWT claim resolution entirely.
--    Writes from the service_role Supabase client set role = 'service_role'
--    at the session level so this guard is reliable.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_bill_amount_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.total_amount IS DISTINCT FROM NEW.total_amount
     AND current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION
      'Bill total_amount is immutable after creation. Use credit_memos to record adjustments. (bill_id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bills_amount_immutable ON public.bills;
CREATE TRIGGER bills_amount_immutable
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_bill_amount_update();

-- ─────────────────────────────────────────────────────────────
-- 9. Trigger: auto-log status changes to bill_status_history
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_bill_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.bill_status_history
      (bill_id, old_status, new_status, changed_by, reason, changed_at)
    VALUES
      (NEW.id, OLD.status, NEW.status, COALESCE(NEW.created_by, 'system'), 'Status transition', NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bills_status_audit ON public.bills;
CREATE TRIGGER bills_status_audit
  AFTER UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.log_bill_status_change();

-- ─────────────────────────────────────────────────────────────
-- 10. Row-Level Security Policies
--     Writes are intentionally blocked for the authenticated role;
--     all writes route through the Express backend using the
--     service_role key, which bypasses RLS entirely.
-- ─────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.bills              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_memos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_refunds    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_approvals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing blanket-true policies if present
DROP POLICY IF EXISTS "Allow all bills" ON public.bills;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.bills;

-- ── bills ──────────────────────────────────────────────────
-- Billing staff read their own branch invoices
CREATE POLICY "billing_staff_read_branch_bills"
  ON public.bills FOR SELECT TO authenticated
  USING (
    branch_id = (auth.jwt() ->> 'branch_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('billing_staff', 'billing_admin', 'branch_admin', 'admin')
  );

-- Billing admin / admin can read all bills (cross-branch)
CREATE POLICY "billing_admin_read_all_bills"
  ON public.bills FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('billing_admin', 'admin', 'super_admin')
  );

-- ── bill_items ──────────────────────────────────────────────
CREATE POLICY "billing_read_bill_items"
  ON public.bill_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_items.bill_id
    )
  );

-- ── payments ────────────────────────────────────────────────
CREATE POLICY "billing_read_payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = payments.bill_id
    )
  );

-- ── credit_memos ────────────────────────────────────────────
CREATE POLICY "billing_read_credit_memos"
  ON public.credit_memos FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('billing_staff', 'billing_admin', 'branch_admin', 'admin', 'super_admin')
  );

-- ── patient_refunds ─────────────────────────────────────────
CREATE POLICY "billing_read_patient_refunds"
  ON public.patient_refunds FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('billing_staff', 'billing_admin', 'branch_admin', 'admin', 'super_admin')
  );

-- ── service_approvals ───────────────────────────────────────
CREATE POLICY "billing_read_service_approvals"
  ON public.service_approvals FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('billing_staff', 'billing_admin', 'branch_admin', 'admin', 'super_admin')
  );

-- ── bill_status_history (audit; read-only for all authed) ──
CREATE POLICY "billing_read_status_history"
  ON public.bill_status_history FOR SELECT TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 11. Indexes for query performance
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bills_branch_id    ON public.bills(branch_id);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor_id   ON public.bills(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_bills_payer_type   ON public.bills(payer_type);
CREATE INDEX IF NOT EXISTS idx_bills_status       ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_credit_memos_bill  ON public.credit_memos(bill_id);
CREATE INDEX IF NOT EXISTS idx_status_hist_bill   ON public.bill_status_history(bill_id);
CREATE INDEX IF NOT EXISTS idx_service_approvals_order ON public.service_approvals(order_id);

-- ─────────────────────────────────────────────────────────────
-- Done. Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'bills';
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
--     AND table_name IN ('credit_memos','bill_status_history','service_approvals');
-- ─────────────────────────────────────────────────────────────
