-- ============================================================
-- TABLE 1: loyalty_program_config
-- Single row — global program settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_program_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name          VARCHAR(100) NOT NULL DEFAULT 'MediPoints',
  program_status        VARCHAR(20) NOT NULL DEFAULT 'Active'
                        CHECK (program_status IN ('Active', 'Inactive')),
  effective_from        DATE NOT NULL DEFAULT CURRENT_DATE,
  point_value           NUMERIC(10,2) NOT NULL DEFAULT 1.00,
                        -- 1 point = ₹1.00
  earn_rate             NUMERIC(10,2) NOT NULL DEFAULT 1.00,
                        -- points per ₹100 spent
  min_bill_to_earn      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  points_rounding       VARCHAR(10) NOT NULL DEFAULT 'FLOOR'
                        CHECK (points_rounding IN ('FLOOR', 'ROUND', 'CEIL')),
  expiry_days           INTEGER NOT NULL DEFAULT 365,
  expiry_type           VARCHAR(10) NOT NULL DEFAULT 'ROLLING'
                        CHECK (expiry_type IN ('ROLLING', 'FIXED')),
  expiry_warning_days   INTEGER NOT NULL DEFAULT 30,
  sms_enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  sms_on_earn           BOOLEAN NOT NULL DEFAULT TRUE,
  sms_on_redeem         BOOLEAN NOT NULL DEFAULT TRUE,
  sms_on_expiry_warning BOOLEAN NOT NULL DEFAULT TRUE,
  auto_enroll           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config if empty
INSERT INTO public.loyalty_program_config (
  program_name, program_status, point_value, earn_rate,
  expiry_days, sms_enabled, auto_enroll
) 
SELECT 'MediPoints', 'Active', 1.00, 1.00, 365, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_program_config);

-- ============================================================
-- TABLE 2: loyalty_tiers
-- Three rows: Silver, Gold, Platinum
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name             VARCHAR(50) NOT NULL UNIQUE,
                        -- 'Silver' | 'Gold' | 'Platinum'
  min_lifetime_points   NUMERIC(15,2) NOT NULL DEFAULT 0,
  earn_multiplier       NUMERIC(5,2) NOT NULL DEFAULT 1.00,
                        -- Silver=1.0, Gold=1.5, Platinum=2.0
  downgrade_days        INTEGER,
                        -- NULL for Silver, 180 for Gold, 365 for Platinum
  birthday_bonus_points NUMERIC(10,2) DEFAULT 0,
  welcome_bonus_points  NUMERIC(10,2) DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed tiers if empty
INSERT INTO public.loyalty_tiers
  (tier_name, min_lifetime_points, earn_multiplier, downgrade_days, birthday_bonus_points, welcome_bonus_points)
SELECT 'Silver',   0,    1.00, NULL, 0,   50 WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_tiers WHERE tier_name = 'Silver');
INSERT INTO public.loyalty_tiers
  (tier_name, min_lifetime_points, earn_multiplier, downgrade_days, birthday_bonus_points, welcome_bonus_points)
SELECT 'Gold',     1000, 1.50, 180,  25,  0 WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_tiers WHERE tier_name = 'Gold');
INSERT INTO public.loyalty_tiers
  (tier_name, min_lifetime_points, earn_multiplier, downgrade_days, birthday_bonus_points, welcome_bonus_points)
SELECT 'Platinum', 5000, 2.00, 365,  100, 0 WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_tiers WHERE tier_name = 'Platinum');

-- ============================================================
-- TABLE 3: loyalty_redemption_rules
-- Single row — redemption configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_redemption_rules (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_points_to_redeem      NUMERIC(10,2) NOT NULL DEFAULT 50,
  max_redemption_pct        NUMERIC(5,2) NOT NULL DEFAULT 10.00,
                            -- 10% of bill value maximum
  max_points_per_bill       NUMERIC(10,2) NOT NULL DEFAULT 500,
  partial_redemption        BOOLEAN NOT NULL DEFAULT TRUE,
  block_on_discounted_bill  BOOLEAN NOT NULL DEFAULT TRUE,
  exclude_gst_from_redeem   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Seed redemption rules if empty
INSERT INTO public.loyalty_redemption_rules (
  min_points_to_redeem, max_redemption_pct, max_points_per_bill
) 
SELECT 50, 10.00, 500
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_redemption_rules);

-- ============================================================
-- TABLE 4: loyalty_bonus_rules
-- One row per bonus event type
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_bonus_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_type        VARCHAR(50) NOT NULL
                    CHECK (bonus_type IN (
                      'WELCOME', 'BIRTHDAY', 'REFERRAL_REFERRER',
                      'REFERRAL_REFEREE', 'FESTIVAL', 'MILESTONE'
                    )),
  points_awarded    NUMERIC(10,2),
                    -- Fixed points for WELCOME, BIRTHDAY, REFERRAL, MILESTONE
  earn_multiplier   NUMERIC(5,2) DEFAULT 1.00,
                    -- For FESTIVAL: 2.0 = 2x earn rate during period
  trigger_condition TEXT,
                    -- Description or JSON condition
  valid_from        DATE,
                    -- For FESTIVAL only
  valid_to          DATE,
                    -- For FESTIVAL only
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default bonus rules if empty
INSERT INTO public.loyalty_bonus_rules (bonus_type, points_awarded, earn_multiplier, trigger_condition, is_active)
SELECT 'WELCOME', 50, 1.00, 'First account enrolment', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_bonus_rules WHERE bonus_type = 'WELCOME');
INSERT INTO public.loyalty_bonus_rules (bonus_type, points_awarded, earn_multiplier, trigger_condition, is_active)
SELECT 'REFERRAL_REFERRER', 25, 1.00, 'When referred patient makes first purchase', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_bonus_rules WHERE bonus_type = 'REFERRAL_REFERRER');
INSERT INTO public.loyalty_bonus_rules (bonus_type, points_awarded, earn_multiplier, trigger_condition, is_active)
SELECT 'REFERRAL_REFEREE', 25, 1.00, 'New patient first purchase via referral', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_bonus_rules WHERE bonus_type = 'REFERRAL_REFEREE');
INSERT INTO public.loyalty_bonus_rules (bonus_type, points_awarded, earn_multiplier, trigger_condition, is_active)
SELECT 'MILESTONE', 20, 1.00, 'purchase_count = 5', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_bonus_rules WHERE bonus_type = 'MILESTONE' AND trigger_condition = 'purchase_count = 5');
INSERT INTO public.loyalty_bonus_rules (bonus_type, points_awarded, earn_multiplier, trigger_condition, is_active)
SELECT 'MILESTONE', 50, 1.00, 'purchase_count = 10', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_bonus_rules WHERE bonus_type = 'MILESTONE' AND trigger_condition = 'purchase_count = 10');
INSERT INTO public.loyalty_bonus_rules (bonus_type, points_awarded, earn_multiplier, trigger_condition, is_active)
SELECT 'MILESTONE', 100, 1.00, 'purchase_count = 25', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_bonus_rules WHERE bonus_type = 'MILESTONE' AND trigger_condition = 'purchase_count = 25');

-- ============================================================
-- TABLE 5: loyalty_accounts
-- One row per patient — the main loyalty account
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_no            VARCHAR(20) NOT NULL UNIQUE,
                        -- Format: LYL-YYYY-XXXXXX e.g. LYL-2026-000001
  mobile                VARCHAR(15) NOT NULL UNIQUE,
                        -- PRIMARY lookup key
  patient_name          VARCHAR(200) NOT NULL,
  date_of_birth         DATE,
                        -- Optional — required for birthday bonus
  gender                VARCHAR(10),
  email                 VARCHAR(200),
  patient_id            VARCHAR(100),
                        -- Link to HMS patients table (MR number) — optional
  enrolment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  enrolment_source      VARCHAR(50) DEFAULT 'Pharmacy'
                        CHECK (enrolment_source IN (
                          'Pharmacy', 'OPD', 'Receptionist', 'Online'
                        )),
  current_tier          VARCHAR(50) NOT NULL DEFAULT 'Silver'
                        REFERENCES loyalty_tiers(tier_name),
  account_status        VARCHAR(20) NOT NULL DEFAULT 'Active'
                        CHECK (account_status IN (
                          'Active', 'Suspended', 'Closed'
                        )),
  suspension_reason     TEXT,
  current_points        NUMERIC(15,2) NOT NULL DEFAULT 0,
  lifetime_points       NUMERIC(15,2) NOT NULL DEFAULT 0,
                        -- Never decreases — used for tier calculation
  lifetime_spend        NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_transactions    INTEGER NOT NULL DEFAULT 0,
  last_transaction_date DATE,
  referred_by_mobile    VARCHAR(15),
                        -- Mobile of referrer if applicable
  consent_given         BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence for account numbers
CREATE SEQUENCE IF NOT EXISTS loyalty_account_seq START WITH 1;

-- Auto-generate account number trigger
CREATE OR REPLACE FUNCTION generate_loyalty_account_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.account_no := 'LYL-' || TO_CHAR(NOW(), 'YYYY') || '-'
                    || LPAD(NEXTVAL('loyalty_account_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_loyalty_account_no ON public.loyalty_accounts;
CREATE TRIGGER trg_loyalty_account_no
  BEFORE INSERT ON public.loyalty_accounts
  FOR EACH ROW WHEN (NEW.account_no IS NULL OR NEW.account_no = '')
  EXECUTE FUNCTION generate_loyalty_account_no();

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_mobile ON public.loyalty_accounts(mobile);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_patient_id ON public.loyalty_accounts(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_last_txn ON public.loyalty_accounts(last_transaction_date) WHERE account_status = 'Active';

-- ============================================================
-- TABLE 6: loyalty_transactions
-- Every earn / redeem / adjust / expire / reverse event
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  transaction_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_type  VARCHAR(20) NOT NULL
                    CHECK (transaction_type IN (
                      'EARN', 'REDEEM', 'ADJUST_ADD', 'ADJUST_SUB',
                      'EXPIRE', 'REVERSE', 'WELCOME', 'BIRTHDAY',
                      'REFERRAL', 'MILESTONE', 'FESTIVAL'
                    )),
  points            NUMERIC(15,2) NOT NULL,
                    -- Positive for credits, negative for debits
  balance_before    NUMERIC(15,2) NOT NULL,
  balance_after     NUMERIC(15,2) NOT NULL,
  monetary_value    NUMERIC(15,2) DEFAULT 0,
                    -- ₹ value of points (points × point_value)
  reference_bill_no VARCHAR(100),
                    -- Pharmacy invoice number or bill reference
  reference_amount  NUMERIC(15,2),
                    -- Bill amount that triggered the earn/redeem
  description       TEXT,
  is_reversed       BOOLEAN NOT NULL DEFAULT FALSE,
  reversed_by_txn   UUID,
                    -- ID of the reversal transaction (for bill cancellation)
  created_by        VARCHAR(100) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_txn_account ON public.loyalty_transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_txn_bill_ref ON public.loyalty_transactions(reference_bill_no) WHERE reference_bill_no IS NOT NULL;

-- ============================================================
-- TABLE 7: loyalty_tier_history
-- Audit log of every tier change
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_tier_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              UUID NOT NULL REFERENCES loyalty_accounts(id),
  changed_from            VARCHAR(50) NOT NULL,
  changed_to              VARCHAR(50) NOT NULL,
  changed_on              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason                  VARCHAR(100),
                          -- 'Threshold crossed' | 'Inactivity downgrade' | 'Admin'
  lifetime_points_at_change NUMERIC(15,2)
);

-- ============================================================
-- TABLE 8: loyalty_sms_log
-- Track every SMS sent to patients
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_sms_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES loyalty_accounts(id),
  mobile          VARCHAR(15) NOT NULL,
  template_type   VARCHAR(50) NOT NULL
                  CHECK (template_type IN (
                    'ENROLMENT', 'EARN', 'REDEEM', 'EXPIRY_WARNING',
                    'TIER_UPGRADE', 'TIER_DOWNGRADE', 'ADJUSTMENT'
                  )),
  message_text    TEXT NOT NULL,
  sent_on         TIMESTAMPTZ DEFAULT NOW(),
  status          VARCHAR(20) DEFAULT 'Pending'
                  CHECK (status IN ('Pending', 'Sent', 'Failed')),
  gateway_ref     VARCHAR(200)
);

-- ============================================================
-- RPC 1: enroll_or_fetch_loyalty_account
-- ============================================================
CREATE OR REPLACE FUNCTION enroll_or_fetch_loyalty_account(
  p_mobile       VARCHAR,
  p_name         VARCHAR,
  p_patient_id   VARCHAR DEFAULT NULL,
  p_created_by   VARCHAR DEFAULT 'system'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account       loyalty_accounts%ROWTYPE;
  v_tier          loyalty_tiers%ROWTYPE;
  v_welcome_pts   NUMERIC := 0;
  v_is_new        BOOLEAN := FALSE;
BEGIN
  -- Try to find existing account
  SELECT * INTO v_account
  FROM loyalty_accounts
  WHERE mobile = p_mobile;

  IF NOT FOUND THEN
    -- Get welcome bonus
    SELECT COALESCE(points_awarded, 0) INTO v_welcome_pts
    FROM loyalty_bonus_rules
    WHERE bonus_type = 'WELCOME' AND is_active = TRUE
    LIMIT 1;

    -- Create new account
    INSERT INTO loyalty_accounts (
      mobile, patient_name, patient_id,
      current_points, lifetime_points,
      enrolment_source, current_tier
    ) VALUES (
      p_mobile, p_name, p_patient_id,
      v_welcome_pts, v_welcome_pts,
      'Pharmacy', 'Silver'
    ) RETURNING * INTO v_account;

    -- Log welcome bonus transaction
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

  -- Get tier details
  SELECT * INTO v_tier
  FROM loyalty_tiers
  WHERE tier_name = v_account.current_tier;

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
$$;

-- ============================================================
-- RPC 2: calculate_loyalty_redemption
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_loyalty_redemption(
  p_account_id   UUID,
  p_bill_amount  NUMERIC
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account       loyalty_accounts%ROWTYPE;
  v_rules         loyalty_redemption_rules%ROWTYPE;
  v_max_by_pct    NUMERIC;
  v_max_redeemable NUMERIC;
BEGIN
  SELECT * INTO v_account FROM loyalty_accounts WHERE id = p_account_id;
  SELECT * INTO v_rules FROM loyalty_redemption_rules LIMIT 1;

  -- Check eligibility
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

  -- Calculate max redeemable
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
$$;

-- ============================================================
-- RPC 3: process_loyalty_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION process_loyalty_transaction(
  p_account_id      UUID,
  p_bill_no         VARCHAR,
  p_bill_amount     NUMERIC,   -- Total bill amount
  p_cash_paid       NUMERIC,   -- Amount paid in cash/UPI/card (excl. redeemed)
  p_points_redeemed NUMERIC,   -- Points patient chose to redeem (0 if none)
  p_created_by      VARCHAR
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
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
  -- Lock account row
  SELECT * INTO v_account
  FROM loyalty_accounts
  WHERE id = p_account_id
  FOR UPDATE;

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

  -- Check program is active
  IF COALESCE(v_config.program_status, 'Active') != 'Active' THEN
    RAISE EXCEPTION 'Loyalty program is currently inactive';
  END IF;

  SELECT * INTO v_tier
  FROM loyalty_tiers WHERE tier_name = v_account.current_tier;
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

  -- STEP 1: Process redemption first (debit)
  IF p_points_redeemed > 0 THEN
    -- Validate redemption
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

  -- STEP 2: Calculate and credit earned points
  -- Earn on cash paid amount only (not redeemed amount, not GST)
  -- Use configuration earn_rate per 100 spent and tier earn_multiplier
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
      v_new_balance - v_points_earned, v_new_balance,
      v_points_earned * v_config.point_value,
      p_bill_no, p_bill_amount,
      'Points earned on purchase ₹' || p_cash_paid, p_created_by
    ) RETURNING id INTO v_earn_txn_id;
  END IF;

  -- STEP 3: Check milestone bonus
  DECLARE
    v_milestone_pts NUMERIC;
    v_new_txn_count INTEGER;
  BEGIN
    v_new_txn_count := v_account.total_transactions + 1;
    SELECT points_awarded INTO v_milestone_pts
    FROM loyalty_bonus_rules
    WHERE bonus_type = 'MILESTONE'
      AND trigger_condition = 'purchase_count = ' || v_new_txn_count
      AND is_active = TRUE
    LIMIT 1;

    IF FOUND AND v_milestone_pts > 0 THEN
      v_new_balance  := v_new_balance + v_milestone_pts;
      v_new_lifetime := v_new_lifetime + v_milestone_pts;
      INSERT INTO loyalty_transactions (
        account_id, transaction_type, points,
        balance_before, balance_after, monetary_value,
        reference_bill_no, description, created_by
      ) VALUES (
        p_account_id, 'MILESTONE', v_milestone_pts,
        v_new_balance - v_milestone_pts, v_new_balance,
        v_milestone_pts * v_config.point_value,
        p_bill_no,
        'Milestone bonus — purchase #' || v_new_txn_count, p_created_by
      );
    END IF;
  END;

  -- STEP 4: Check tier upgrade
  v_new_tier := v_account.current_tier;
  SELECT tier_name INTO v_new_tier
  FROM loyalty_tiers
  WHERE min_lifetime_points <= v_new_lifetime
    AND is_active = TRUE
  ORDER BY min_lifetime_points DESC
  LIMIT 1;

  IF v_new_tier != v_account.current_tier THEN
    INSERT INTO loyalty_tier_history (
      account_id, changed_from, changed_to,
      reason, lifetime_points_at_change
    ) VALUES (
      p_account_id, v_account.current_tier, v_new_tier,
      'Threshold crossed', v_new_lifetime
    );
  END IF;

  -- STEP 5: Update account
  UPDATE loyalty_accounts SET
    current_points        = v_new_balance,
    lifetime_points       = v_new_lifetime,
    lifetime_spend        = lifetime_spend + p_bill_amount,
    total_transactions    = total_transactions + 1,
    last_transaction_date = CURRENT_DATE,
    current_tier          = v_new_tier,
    updated_at            = NOW()
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'success',          TRUE,
    'points_redeemed',  p_points_redeemed,
    'points_earned',    v_points_earned,
    'new_balance',      v_new_balance,
    'new_tier',         v_new_tier,
    'tier_upgraded',    v_new_tier != v_account.current_tier,
    'earn_txn_id',      v_earn_txn_id,
    'redeem_txn_id',    v_redeem_txn_id
  );
END;
$$;

-- ============================================================
-- RPC 4: reverse_loyalty_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION reverse_loyalty_transaction(
  p_bill_no    VARCHAR,
  p_created_by VARCHAR
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn         loyalty_transactions%ROWTYPE;
  v_account     loyalty_accounts%ROWTYPE;
  v_net_points  NUMERIC := 0;
BEGIN
  -- Find all non-reversed transactions for this bill
  FOR v_txn IN
    SELECT * FROM loyalty_transactions
    WHERE reference_bill_no = p_bill_no
      AND is_reversed = FALSE
    FOR UPDATE
  LOOP
    -- Reverse each transaction (flip the sign)
    v_net_points := v_net_points + (-v_txn.points);

    UPDATE loyalty_transactions
    SET is_reversed = TRUE
    WHERE id = v_txn.id;
  END LOOP;

  IF v_net_points = 0 THEN
    RETURN jsonb_build_object('success', TRUE, 'message', 'No transactions to reverse');
  END IF;

  -- Apply net reversal to account
  SELECT * INTO v_account
  FROM loyalty_accounts
  WHERE id = (SELECT account_id FROM loyalty_transactions
              WHERE reference_bill_no = p_bill_no LIMIT 1)
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
$$;

-- ============================================================
-- RPC 5: manual_points_adjustment
-- ============================================================
CREATE OR REPLACE FUNCTION manual_points_adjustment(
  p_account_id   UUID,
  p_type         VARCHAR,   -- 'ADJUST_ADD' | 'ADJUST_SUB'
  p_points       NUMERIC,
  p_reason       TEXT,
  p_created_by   VARCHAR
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account   loyalty_accounts%ROWTYPE;
  v_new_bal   NUMERIC;
  v_config    loyalty_program_config%ROWTYPE;
BEGIN
  SELECT * INTO v_account FROM loyalty_accounts
  WHERE id = p_account_id FOR UPDATE;

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
    p_account_id,
    p_type,
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
$$;

-- Grant permissions to anon and authenticated roles
GRANT ALL ON public.loyalty_program_config TO anon, authenticated;
GRANT ALL ON public.loyalty_tiers TO anon, authenticated;
GRANT ALL ON public.loyalty_redemption_rules TO anon, authenticated;
GRANT ALL ON public.loyalty_bonus_rules TO anon, authenticated;
GRANT ALL ON public.loyalty_accounts TO anon, authenticated;
GRANT ALL ON public.loyalty_transactions TO anon, authenticated;
GRANT ALL ON public.loyalty_tier_history TO anon, authenticated;
GRANT ALL ON public.loyalty_sms_log TO anon, authenticated;

ALTER TABLE public.loyalty_program_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemption_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_bonus_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tier_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_sms_log DISABLE ROW LEVEL SECURITY;
