-- ==========================================
-- SECURE IN-DATABASE ADJUDICATION LOGIC
-- ==========================================
-- Use this function inside triggers or secure RPCs in Supabase to ensure 
-- the user cannot bypass policy math in the frontend.

-- MIGRATION NOTE: Ensure you add the group_name column first!
-- ALTER TABLE public.policy_rules ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'All';

CREATE OR REPLACE FUNCTION public.adjudicate_bill_item(
    p_policy_id UUID,
    p_visit_type TEXT,
    p_gender TEXT,
    p_item_type TEXT,
    p_item_code TEXT,
    p_class_name TEXT,
    p_group_name TEXT,
    p_unit_price NUMERIC,
    p_quantity NUMERIC
)
RETURNS TABLE (
    matched_rule_id UUID,
    total_amount NUMERIC,
    patient_share NUMERIC,
    sponsor_share NUMERIC,
    is_excluded BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to access configuration
AS $$
DECLARE
    v_total_amount NUMERIC := p_unit_price * p_quantity;
    v_best_rule RECORD;
    v_deductible NUMERIC := 0;
    v_after_deductible NUMERIC;
    v_copay_pct NUMERIC;
    v_patient_co NUMERIC;
    v_sponsor_co NUMERIC;
BEGIN
    -- 1. Find the Single "Winning" Rule using User Weights
    SELECT * INTO v_best_rule
    FROM public.policy_rules
    WHERE policy_id = p_policy_id
      AND active = TRUE
      AND (visit_type = 'All' OR LOWER(visit_type) = LOWER(p_visit_type))
      AND (gender = 'All' OR LOWER(gender) = LOWER(p_gender))
      AND (
         (alias_code = p_item_code) OR -- Weight 100
         (group_name = p_group_name AND group_name <> 'All') OR -- Weight 50
         (class_name = p_class_name) OR -- Weight 50
         (rule_type = p_item_type) OR -- Weight 10
         (rule_type = 'ALL') -- Weight 5
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

    -- Default behavior: if no rule, full patient responsibility
    IF v_best_rule IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, v_total_amount, v_total_amount, 0.00, FALSE;
        RETURN;
    END IF;

    -- Case Exclusion
    IF v_best_rule.exclude = TRUE THEN
        RETURN QUERY SELECT v_best_rule.id, v_total_amount, v_total_amount, 0.00, TRUE;
        RETURN;
    END IF;

    -- 2. Parse and apply Deductible
    v_deductible := COALESCE(NULLIF(regexp_replace(v_best_rule.patient_deductible, '[^\d.]', '', 'g'), '')::NUMERIC, 0);
    IF v_best_rule.patient_deductible_type = '%' THEN
        v_deductible := (v_deductible / 100.0) * v_total_amount;
    END IF;
    v_deductible := LEAST(v_deductible, v_total_amount);
    v_after_deductible := v_total_amount - v_deductible;

    -- 3. Apply Copay
    -- Heuristic parsing of percentage text "10%"
    v_copay_pct := COALESCE(NULLIF(regexp_replace(v_best_rule.patient_copay, '[^\d.]', '', 'g'), '')::NUMERIC, 0);
    v_patient_co := (v_copay_pct / 100.0) * v_after_deductible;
    v_sponsor_co := v_after_deductible - v_patient_co;

    -- 4. Apply Limits
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
$$;
