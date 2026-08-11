-- =============================================================
-- HIS-WEB5 DATABASE BACKUP
-- Generated: 2026-08-11 (via Supabase catalog queries)
-- 
-- SCOPE:
--   · CREATE TABLE statements for ALL 108 tables (schema first, no constraints)
--   · All INSERT data for requested tables + lookup dependencies
--   · All PRIMARY KEY, UNIQUE, CHECK, and FOREIGN KEY constraints at the end
--   · All non-system indexes at the end
--
-- HOW TO RESTORE:
--   1. Create a fresh PostgreSQL database
--   2. Run this file: psql -c "\i db_backup.sql"
--   3. Or paste in Supabase SQL Editor (split into sections if needed)
-- =============================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- SECTION 1: CREATE TABLES (schema only, no constraints or indexes)
-- =============================================================

-- ─── app_users ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_users (
  id text DEFAULT gen_random_uuid(),
  username text,
  password text,
  role text,
  employee_id text,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  user_code text,
  email text,
  mobile text,
  is_active boolean DEFAULT true,
  force_password_change boolean DEFAULT false,
  last_login timestamp with time zone,
  role_id uuid,
  updated_at timestamp with time zone DEFAULT now(),
  location_id text,
  department_id text
);

-- ─── appointments ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id text,
  patient_id text,
  doctor_id text,
  department_id text,
  date text,
  time text,
  status text DEFAULT 'Scheduled'::text,
  symptoms text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  visit_type text DEFAULT 'New Visit'::text,
  payment_mode text DEFAULT 'CASH'::text
);

-- ─── bill_items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bill_items (
  id text,
  bill_id text,
  description text,
  quantity integer DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  tax_percentage numeric(5,2) DEFAULT 0,
  item_id text,
  batch_no text,
  item_type text,
  discount_percentage numeric(5,2) DEFAULT 0
);

-- ─── bill_status_history ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bill_status_history (
  id uuid DEFAULT gen_random_uuid(),
  bill_id text,
  old_status text,
  new_status text,
  changed_by text,
  reason text,
  changed_at timestamp with time zone DEFAULT now()
);

-- ─── bills ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bills (
  id text,
  patient_id text,
  appointment_id text,
  date timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Unpaid'::text,
  total_amount numeric(10,2) DEFAULT 0,
  paid_amount numeric(10,2) DEFAULT 0,
  invoice_no text,
  is_pharmacy boolean DEFAULT false,
  discount_amount numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  prescription_id uuid,
  created_by text,
  round_off numeric(10,2) DEFAULT 0,
  doctor_id text,
  department_id text,
  payment_mode text,
  amount_received numeric(10,2) DEFAULT 0,
  reference_no text,
  notes text,
  refund_status text DEFAULT 'Pending'::text,
  refund_id uuid,
  cancelled_at timestamp with time zone,
  branch_id uuid,
  payer_type text DEFAULT 'Self'::text,
  sponsor_id uuid,
  patient_due_amount numeric(10,2) DEFAULT 0.00,
  sponsor_due_amount numeric(10,2) DEFAULT 0.00
);

-- ─── branches ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid DEFAULT uuid_generate_v4(),
  name text,
  code text,
  status text DEFAULT 'Active'::text,
  vat_reg_no text,
  logo_url text
);

-- ─── clinical_allergies ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinical_allergies (
  id text,
  patient_id text,
  allergen text,
  severity text,
  reaction text,
  status text DEFAULT 'Active'::text,
  recorded_at timestamp with time zone DEFAULT now(),
  allergy_type text,
  onset_date date,
  resolved_date date,
  remarks text
);

-- ─── clinical_diagnoses ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinical_diagnoses (
  id text,
  appointment_id text,
  code text,
  description text,
  type text DEFAULT 'Provisional'::text,
  added_at timestamp with time zone DEFAULT now(),
  is_poa boolean DEFAULT false,
  icd_code text
);

-- ─── clinical_narrative_diagnoses ────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinical_narrative_diagnoses (
  id text,
  appointment_id text,
  illness text,
  illness_duration_value integer,
  illness_duration_unit text,
  behavioural_activity text,
  narrative text,
  recorded_at timestamp with time zone DEFAULT now()
);

-- ─── clinical_notes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id text,
  appointment_id text,
  note_type text,
  description text,
  recorded_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone
);

-- ─── clinical_vitals ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinical_vitals (
  id text,
  appointment_id text,
  recorded_at timestamp with time zone DEFAULT now(),
  bp_systolic integer,
  bp_diastolic integer,
  temperature numeric(4,1),
  pulse integer,
  respiratory_rate integer,
  weight numeric(5,2),
  height numeric(5,2),
  bmi numeric(4,1),
  spo2 integer
);

-- ─── credit_memos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_memos (
  id uuid DEFAULT gen_random_uuid(),
  bill_id text,
  refund_id uuid,
  credit_memo_no text,
  amount numeric(10,2),
  reason text,
  created_by text,
  approved_by text,
  status text DEFAULT 'Approved'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── currency_master ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.currency_master (
  id uuid DEFAULT gen_random_uuid(),
  code text,
  name text,
  symbol text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ─── dental_icd_master ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dental_icd_master (
  id uuid DEFAULT uuid_generate_v4(),
  code text,
  description text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── departments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id text,
  name text,
  code text,
  status text DEFAULT 'Active'::text
);

-- ─── doctor_availability ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_availability (
  id text,
  doctor_id text,
  day_of_week integer,
  start_time text,
  end_time text,
  slot_duration_minutes integer DEFAULT 30
);

-- ─── doctor_schedules ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id uuid DEFAULT gen_random_uuid(),
  doctor_id text,
  day_of_week integer,
  start_time time without time zone,
  end_time time without time zone,
  slot_type text DEFAULT 'available'::text,
  slot_duration integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── employees ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id text,
  first_name text,
  last_name text,
  email text,
  phone text,
  role text,
  department_id text,
  specialization text,
  status text DEFAULT 'Active'::text
);

-- ─── finance_chart_of_accounts ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_chart_of_accounts (
  id uuid DEFAULT uuid_generate_v4(),
  code text,
  name text,
  account_type text,
  account_group text,
  balance_nature text,
  system_purpose text,
  parent_id uuid,
  is_group boolean DEFAULT false,
  description text,
  status text DEFAULT 'Active'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── finance_journal_voucher_items ───────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_journal_voucher_items (
  id uuid DEFAULT uuid_generate_v4(),
  voucher_id uuid,
  account_id uuid,
  posting_nature text,
  amount numeric(14,2),
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── finance_journal_vouchers ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_journal_vouchers (
  id uuid DEFAULT uuid_generate_v4(),
  voucher_no text,
  voucher_date date,
  ref_type text,
  ref_doc_id uuid,
  ref_doc_no text,
  narration text,
  total_debit numeric(14,2) DEFAULT 0.00,
  total_credit numeric(14,2) DEFAULT 0.00,
  status text DEFAULT 'Draft'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── finance_organizations ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_organizations (
  id uuid DEFAULT gen_random_uuid(),
  code text,
  name text,
  sponsor_type text,
  payer_id text,
  vat_not_required boolean DEFAULT false,
  contract_created_by text DEFAULT 'SMRUTI RANJAN MISHRA'::character varying,
  organization_type text DEFAULT 'With MOU'::character varying,
  account_no text,
  organization_group text,
  receiver_id text,
  gateway_configuration text DEFAULT '--Select--'::character varying,
  vat_no text,
  active boolean DEFAULT true,
  is_daman_or_thiqa boolean DEFAULT false,
  max_approval_time integer DEFAULT 0,
  address_details text,
  building_no text,
  city text DEFAULT 'RIYADH'::character varying,
  country text DEFAULT 'Saudi Arabia'::character varying,
  postal_code text,
  state text DEFAULT 'ar-Riyad'::character varying,
  dist text DEFAULT 'ar-Riyad'::character varying,
  contacts jsonb DEFAULT '[]'::jsonb,
  insurance_id text,
  branch_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  approval_required boolean DEFAULT false
);

-- ─── insurance_policies ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id uuid DEFAULT uuid_generate_v4(),
  policy_no text,
  policy_name text,
  sponsor_type text,
  sponsor_id uuid,
  insurance_id uuid,
  service_tax text DEFAULT 'VAT 15 PERCENT'::text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  sponsor_pay_tax boolean DEFAULT true,
  is_sponsor_price boolean DEFAULT true,
  patient_amt numeric(10,2) DEFAULT 0.00,
  active boolean DEFAULT true,
  restricted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── inventory_batch_locations ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_batch_locations (
  id uuid DEFAULT gen_random_uuid(),
  store_id uuid,
  item_id uuid,
  batch_no text,
  zone_id uuid,
  rack_id uuid,
  shelf_no integer,
  bin_no text,
  is_primary boolean DEFAULT true,
  notes text,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── inventory_item_pricing ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_item_pricing (
  id uuid DEFAULT uuid_generate_v4(),
  item_id uuid,
  branch_id uuid,
  branch_name text,
  pricing_method text DEFAULT 'MRP'::text,
  price numeric(15,2) DEFAULT 0,
  markup_percentage numeric(5,2) DEFAULT 0
);

-- ─── inventory_item_stocks ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_item_stocks (
  id uuid DEFAULT uuid_generate_v4(),
  item_id uuid,
  ved_category text,
  is_reusable boolean DEFAULT false,
  item_rate numeric DEFAULT 1.0,
  fsn_type text,
  is_bulky boolean DEFAULT false,
  cycle_count_frequency text
);

-- ─── inventory_items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid,
  item_code text,
  item_name text,
  item_description text,
  arabic_name text,
  item_type text,
  item_category text,
  item_group text,
  manufacturer text,
  brand text,
  hsn_sac_code text,
  reorder_level numeric,
  standard_price numeric,
  distribution_category text,
  purchase_organisation text,
  is_active boolean DEFAULT true,
  is_taxable boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  base_uom text,
  alternate_uom text,
  alternate_conversion_factor numeric DEFAULT 1,
  deleted_at timestamp with time zone,
  expiry_tracking boolean DEFAULT false,
  storage_condition text,
  requires_batch_no boolean DEFAULT false,
  purchase_uom text,
  sales_uom text,
  purchase_conversion_factor numeric DEFAULT 1,
  sales_conversion_factor numeric DEFAULT 1,
  purchase_inventory_acc text,
  cost_of_sales_acc text,
  sale_account text,
  stock_account text,
  tax_preference text
);

-- ─── inventory_opening_stock_items ───────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_opening_stock_items (
  id uuid DEFAULT uuid_generate_v4(),
  opening_stock_id uuid,
  item_id uuid,
  batch_no text,
  expiry_date date,
  quantity numeric,
  rate numeric,
  amount numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── inventory_opening_stocks ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_opening_stocks (
  id uuid DEFAULT uuid_generate_v4(),
  store_id uuid,
  doc_no text,
  doc_date date,
  remarks text,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'Draft'::text,
  created_by text,
  approved_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── inventory_stock_ledger ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_stock_ledger (
  id uuid DEFAULT uuid_generate_v4(),
  store_id uuid,
  item_id uuid,
  batch_no text,
  transaction_type text,
  quantity numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  reference_doc_no text,
  reference_doc_type text,
  transaction_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  expiry_date date,
  closing_quantity numeric,
  closing_amount numeric
);

-- ─── item_tax_mappings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.item_tax_mappings (
  id uuid DEFAULT uuid_generate_v4(),
  item_id uuid,
  tax_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── lab_reagent_consumption_log ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_reagent_consumption_log (
  id uuid DEFAULT gen_random_uuid(),
  lab_order_id uuid,
  service_id uuid,
  item_id uuid,
  store_id uuid,
  quantity_deducted numeric,
  batch_no text,
  action text,
  performed_by uuid,
  reversed_by_log_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── lab_service_import_log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_service_import_log (
  id uuid DEFAULT gen_random_uuid(),
  filename text,
  import_type text,
  total_rows integer,
  created_count integer,
  updated_count integer,
  skipped_count integer,
  error_count integer,
  row_results jsonb,
  performed_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── lab_service_profile_components ─────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_service_profile_components (
  id uuid DEFAULT gen_random_uuid(),
  profile_service_id uuid,
  component_service_id uuid,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── lab_service_reagents ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_service_reagents (
  id uuid DEFAULT gen_random_uuid(),
  service_id uuid,
  item_id uuid,
  store_id uuid,
  unit_id uuid,
  quantity_per_test numeric,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_antibiotics ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_antibiotics (
  id uuid DEFAULT gen_random_uuid(),
  name text,
  code text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_containers ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_containers (
  id uuid DEFAULT gen_random_uuid(),
  name text,
  code text,
  color text,
  description text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_equipment ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_equipment (
  id uuid DEFAULT gen_random_uuid(),
  name text,
  code text,
  model text,
  manufacturer text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_lab_orders ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_lab_orders (
  id uuid DEFAULT gen_random_uuid(),
  service_order_id uuid,
  service_id uuid,
  barcode_no text,
  status text DEFAULT 'Ordered'::text,
  ordered_at timestamp with time zone DEFAULT now(),
  received_at timestamp with time zone,
  accepted_at timestamp with time zone,
  resulted_at timestamp with time zone,
  reported_at timestamp with time zone,
  collected_at timestamp with time zone,
  collected_by text,
  received_by text,
  accepted_by text,
  resulted_by text,
  reported_by text,
  priority text DEFAULT 'Routine'::text,
  remarks text,
  is_outsourced boolean DEFAULT false,
  outsource_lab_id uuid,
  source_profile_service_id uuid,
  result_verified_at timestamp with time zone,
  result_verified_by text
);

-- ─── lims_organisms ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_organisms (
  id uuid DEFAULT gen_random_uuid(),
  name text,
  code text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_outsource_labs ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_outsource_labs (
  id uuid DEFAULT gen_random_uuid(),
  name text,
  code text,
  address text,
  contact text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_parameter_options ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_parameter_options (
  id uuid DEFAULT gen_random_uuid(),
  parameter_id uuid,
  option_value text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── lims_reference_ranges ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_reference_ranges (
  id uuid DEFAULT gen_random_uuid(),
  parameter_id uuid,
  equipment_id uuid,
  gender text,
  age_min numeric,
  age_max numeric,
  age_unit text DEFAULT 'years'::text,
  normal_low numeric,
  normal_high numeric,
  critical_low numeric,
  critical_high numeric,
  unit text,
  reference_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_reference_remarks ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_reference_remarks (
  id uuid DEFAULT gen_random_uuid(),
  service_id uuid,
  parameter_id uuid,
  equipment_id uuid,
  remark_type text,
  remark_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_results ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_results (
  id uuid DEFAULT gen_random_uuid(),
  lab_order_id uuid,
  parameter_id uuid,
  equipment_id uuid,
  result_value text,
  unit text,
  status text DEFAULT 'Pending'::text,
  abnormal_flag text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_samples ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_samples (
  id uuid DEFAULT gen_random_uuid(),
  lab_order_id uuid,
  specimen_id uuid,
  container_id uuid,
  sample_no text,
  collected_at timestamp with time zone,
  received_at timestamp with time zone,
  received_by uuid,
  sent_at timestamp with time zone,
  sent_by uuid,
  condition text,
  rejection_reason text,
  status text DEFAULT 'Pending'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── lims_service_configs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_service_configs (
  service_id uuid,
  specimen_id uuid,
  container_id uuid,
  sample_volume numeric,
  tat_hours integer,
  report_template text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  service_type text DEFAULT 'Test'::text,
  methodology text,
  sample_stability text,
  storage_condition text
);

-- ─── lims_service_parameters ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_service_parameters (
  id uuid DEFAULT gen_random_uuid(),
  service_id uuid,
  name text,
  code text,
  parameter_type text DEFAULT 'Numeric'::text,
  unit text,
  decimal_places integer DEFAULT 2,
  display_order integer DEFAULT 0,
  is_reportable boolean DEFAULT true,
  parent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_specimens ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_specimens (
  id uuid DEFAULT gen_random_uuid(),
  name text,
  code text,
  description text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_stains ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_stains (
  id uuid DEFAULT gen_random_uuid(),
  name text,
  code text,
  description text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── lims_test_results ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_test_results (
  id uuid DEFAULT gen_random_uuid(),
  lab_order_id uuid,
  parameter_id uuid,
  equipment_id uuid,
  result_value text,
  unit text,
  status text DEFAULT 'Pending'::text,
  abnormal_flag text,
  result_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  remarks text
);

-- ─── loyalty_accounts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id uuid DEFAULT gen_random_uuid(),
  account_no text,
  mobile text,
  patient_name text,
  dob date,
  gender text,
  email text,
  address text,
  patient_id text,
  enrolment_date date,
  current_tier text,
  account_status text,
  enrolment_source text,
  current_points numeric DEFAULT 0,
  lifetime_points numeric DEFAULT 0,
  lifetime_spend numeric DEFAULT 0,
  total_transactions integer DEFAULT 0,
  last_transaction_date date,
  expiry_date date,
  consent_given boolean DEFAULT false,
  consent_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── loyalty_bonus_rules ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_bonus_rules (
  id uuid DEFAULT gen_random_uuid(),
  bonus_type text,
  bonus_points integer,
  bonus_multiplier numeric,
  conditions jsonb,
  valid_from date,
  valid_to date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── loyalty_program_config ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_program_config (
  id uuid DEFAULT gen_random_uuid(),
  program_name text,
  program_status text,
  effective_from date,
  point_value numeric,
  earn_rate numeric,
  min_bill_to_earn numeric,
  points_rounding text,
  expiry_days integer,
  expiry_type text,
  expiry_warning_days integer,
  sms_enabled boolean DEFAULT false,
  sms_on_earn boolean DEFAULT false,
  sms_on_redeem boolean DEFAULT false,
  sms_on_expiry_warning boolean DEFAULT false,
  auto_enroll boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── loyalty_redemption_rules ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_redemption_rules (
  id uuid DEFAULT gen_random_uuid(),
  min_points_to_redeem integer,
  max_redemption_pct numeric,
  max_points_per_bill integer,
  partial_redemption boolean DEFAULT true,
  block_on_discounted_bill boolean DEFAULT false,
  exclude_gst_from_redeem boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── loyalty_sms_log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_sms_log (
  id uuid DEFAULT gen_random_uuid(),
  account_id uuid,
  mobile text,
  template_type text,
  message_text text,
  status text DEFAULT 'Pending'::text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── loyalty_tier_history ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_tier_history (
  id uuid DEFAULT gen_random_uuid(),
  account_id uuid,
  changed_from text,
  changed_to text,
  changed_on timestamp with time zone,
  reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── loyalty_tiers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id uuid DEFAULT gen_random_uuid(),
  tier_name text,
  min_lifetime_points integer,
  earn_multiplier numeric DEFAULT 1,
  benefits jsonb,
  sort_order integer,
  tier_color text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── loyalty_transactions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid DEFAULT gen_random_uuid(),
  account_id uuid,
  transaction_date timestamp with time zone,
  transaction_type text,
  points numeric,
  balance_before numeric,
  balance_after numeric,
  reference_bill_no text,
  reference_amount numeric,
  notes text,
  is_reversed boolean DEFAULT false,
  reversal_id uuid,
  created_by text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── master_diagnoses ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.master_diagnoses (
  id uuid DEFAULT gen_random_uuid(),
  code text,
  description text,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── patient_demographics ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_demographics (
  id uuid DEFAULT gen_random_uuid(),
  abha_number text,
  abha_address text,
  mobile text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── patient_documents ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id uuid DEFAULT gen_random_uuid(),
  patient_id text,
  category text,
  name text,
  file_type text,
  file_data text,
  uploaded_at timestamp with time zone DEFAULT now()
);

-- ─── patient_refunds ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_refunds (
  id uuid DEFAULT gen_random_uuid(),
  refund_no text,
  patient_id text,
  refund_amount numeric,
  refund_mode text,
  refund_date timestamp with time zone DEFAULT now(),
  reason text,
  notes text,
  created_by text,
  approved_by text,
  status text
);

-- ─── patients ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patients (
  id text,
  first_name text,
  last_name text,
  date_of_birth text,
  gender text,
  phone text,
  email text,
  address text,
  blood_group text,
  created_at timestamp with time zone DEFAULT now(),
  mrn text,
  nationality text,
  marital_status text,
  occupation text,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_provider text,
  insurance_id text,
  updated_at timestamp with time zone DEFAULT now(),
  branch_id uuid,
  patient_type text DEFAULT 'OP'::text,
  iqama_no text,
  national_id text,
  passport_no text,
  primary_doctor_id text,
  age integer,
  age_unit text
);

-- ─── payments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id text,
  bill_id text,
  amount numeric,
  payment_date timestamp with time zone DEFAULT now(),
  payment_mode text,
  reference_no text,
  notes text,
  created_by text
);

-- ─── pharmacy_direct_sale_items ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_direct_sale_items (
  id uuid DEFAULT gen_random_uuid(),
  sale_id uuid,
  item_id uuid,
  batch_no text,
  quantity numeric,
  unit_price numeric,
  total_price numeric,
  discount_pct numeric DEFAULT 0,
  tax_pct numeric DEFAULT 0,
  expiry_date date
);

-- ─── pharmacy_direct_sales ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_direct_sales (
  id uuid DEFAULT gen_random_uuid(),
  sale_no text,
  sale_date timestamp with time zone DEFAULT now(),
  store_id uuid,
  first_name text,
  last_name text,
  mobile text,
  total_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  payment_mode text DEFAULT 'Cash'::text,
  reference_no text,
  notes text,
  created_by text,
  status text DEFAULT 'Completed'::text
);

-- ─── pharmacy_drug_generics ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_drug_generics (
  id uuid DEFAULT gen_random_uuid(),
  generic_code text,
  generic_name text,
  therapeutic_class text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── pharmacy_drug_master ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_drug_master (
  id uuid DEFAULT gen_random_uuid(),
  item_id uuid,
  item_code text,
  drug_name text,
  generic_id uuid,
  dosage_form text,
  strength text,
  route_of_administration text,
  controlled_drug boolean DEFAULT false,
  storage_condition text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── pharmacy_racks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_racks (
  id uuid DEFAULT gen_random_uuid(),
  zone_id uuid,
  rack_code text,
  rack_name text,
  no_of_shelves integer DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── pharmacy_return_items ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_return_items (
  id uuid DEFAULT gen_random_uuid(),
  return_id uuid,
  item_id uuid,
  batch_no text,
  expiry_date date,
  quantity numeric,
  unit_price numeric,
  total_amount numeric,
  return_reason text
);

-- ─── pharmacy_returns ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_returns (
  id uuid DEFAULT gen_random_uuid(),
  return_no text,
  return_date timestamp with time zone DEFAULT now(),
  patient_id text,
  bill_id text,
  store_id uuid,
  total_amount numeric,
  refund_mode text,
  refund_status text DEFAULT 'Pending'::text,
  refund_id uuid,
  notes text,
  created_by text
);

-- ─── pharmacy_zones ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_zones (
  id uuid DEFAULT gen_random_uuid(),
  store_id uuid,
  zone_code text,
  zone_name text,
  temperature text,
  humidity_controlled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── policy_mapped_branches ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.policy_mapped_branches (
  id uuid DEFAULT gen_random_uuid(),
  policy_id uuid,
  branch_code text,
  branch_name text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── policy_patient_max_amounts ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.policy_patient_max_amounts (
  id uuid DEFAULT gen_random_uuid(),
  policy_id uuid,
  class_name text,
  pat_max_per_visit numeric,
  pat_max_per_year numeric,
  pat_max_amt numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── policy_rules ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.policy_rules (
  id uuid DEFAULT gen_random_uuid(),
  policy_id uuid,
  rule_type text,
  visit_type text,
  coverage_pct numeric DEFAULT 100,
  co_pay_pct numeric DEFAULT 0,
  co_pay_fixed numeric DEFAULT 0,
  deductible numeric DEFAULT 0,
  max_per_visit numeric,
  max_per_year numeric,
  requires_pre_auth boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── prescription_items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id uuid DEFAULT gen_random_uuid(),
  prescription_id uuid,
  drug_name text,
  generic_name text,
  dosage text,
  frequency text,
  duration text,
  quantity integer,
  instructions text,
  item_id uuid,
  is_dispensed boolean DEFAULT false
);

-- ─── prescriptions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid DEFAULT gen_random_uuid(),
  appointment_id text,
  patient_id text,
  doctor_id text,
  prescribed_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Active'::text,
  notes text,
  diagnosis text
);

-- ─── procurement_expiry_return_items ─────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_expiry_return_items (
  id uuid DEFAULT gen_random_uuid(),
  return_id uuid,
  item_id uuid,
  batch_code text,
  expiry_date date,
  manufacture_date date,
  quantity numeric,
  rate numeric,
  value numeric,
  remarks text
);

-- ─── procurement_expiry_returns ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_expiry_returns (
  id uuid DEFAULT gen_random_uuid(),
  doc_no text,
  doc_date date,
  vendor_id uuid,
  store_id uuid,
  no_of_days integer,
  total_value numeric DEFAULT 0,
  purchase_organisation text,
  notes text,
  status text DEFAULT 'Draft'::character varying,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── procurement_grn_items ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_grn_items (
  id uuid DEFAULT gen_random_uuid(),
  grn_id uuid,
  item_id uuid,
  po_item_id uuid,
  batch_no text,
  expiry_date date,
  manufacture_date date,
  received_quantity numeric DEFAULT 0,
  accepted_quantity numeric,
  rate numeric,
  mrp numeric,
  unit_cost numeric,
  discount_pct numeric DEFAULT 0,
  tax_pct numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  storage_condition text,
  remarks text
);

-- ─── procurement_grns ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_grns (
  id uuid DEFAULT gen_random_uuid(),
  grn_no text,
  grn_date date,
  vendor_id uuid,
  store_id uuid,
  po_id uuid,
  supplier_invoice_no text,
  supplier_invoice_date date,
  total_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  status text DEFAULT 'Draft'::text,
  notes text,
  created_by text,
  approved_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── procurement_gstr2b_invoices ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_gstr2b_invoices (
  id uuid DEFAULT gen_random_uuid(),
  upload_id uuid,
  supplier_gstin text,
  supplier_name text,
  invoice_no text,
  invoice_date date,
  invoice_value numeric,
  place_of_supply text,
  reverse_charge boolean DEFAULT false,
  invoice_type text,
  taxable_value numeric,
  igst numeric,
  cgst numeric,
  sgst numeric,
  cess numeric,
  status text DEFAULT 'Unmatched'::text,
  matched_grn_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── procurement_gstr2b_uploads ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_gstr2b_uploads (
  id uuid DEFAULT gen_random_uuid(),
  filename text,
  period text,
  upload_date timestamp with time zone DEFAULT now(),
  total_invoices integer DEFAULT 0,
  matched_invoices integer DEFAULT 0,
  unmatched_invoices integer DEFAULT 0,
  status text DEFAULT 'Processed'::text,
  uploaded_by text
);

-- ─── procurement_purchase_order_items ────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_purchase_order_items (
  id uuid DEFAULT gen_random_uuid(),
  po_id uuid,
  item_id uuid,
  quantity numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  discount_pct numeric DEFAULT 0,
  tax_pct numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  received_quantity numeric DEFAULT 0,
  pending_quantity numeric DEFAULT 0,
  remarks text
);

-- ─── procurement_purchase_orders ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_purchase_orders (
  id uuid DEFAULT gen_random_uuid(),
  po_no text,
  po_date date,
  vendor_id uuid,
  store_id uuid,
  tax_code uuid,
  total_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  status text DEFAULT 'Draft'::text,
  delivery_date date,
  payment_terms text,
  notes text,
  created_by text,
  approved_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── procurement_purchase_receipt_items ──────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_purchase_receipt_items (
  id uuid DEFAULT gen_random_uuid(),
  receipt_id uuid,
  item_id uuid,
  batch_no text,
  expiry_date date,
  quantity numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  mrp numeric,
  unit_cost numeric DEFAULT 0,
  discount_pct numeric DEFAULT 0,
  tax_pct numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0
);

-- ─── procurement_purchase_receipts ───────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_purchase_receipts (
  id uuid DEFAULT gen_random_uuid(),
  receipt_no text,
  receipt_date date,
  vendor_id uuid,
  store_id uuid,
  grn_id uuid,
  supplier_invoice_no text,
  supplier_invoice_date date,
  total_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  status text DEFAULT 'Draft'::text,
  notes text,
  created_by text,
  approved_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── procurement_purchase_return_items ───────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_purchase_return_items (
  id uuid DEFAULT gen_random_uuid(),
  return_id uuid,
  item_id uuid,
  batch_no text,
  expiry_date date,
  quantity numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  total_amount numeric DEFAULT 0
);

-- ─── procurement_purchase_returns ────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_purchase_returns (
  id uuid DEFAULT gen_random_uuid(),
  return_no text,
  return_date date,
  vendor_id uuid,
  store_id uuid,
  source_grn_id uuid,
  source_prn_id uuid,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'Draft'::text,
  notes text,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── procurement_vendor_terms ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_vendor_terms (
  id uuid DEFAULT gen_random_uuid(),
  vendor_id uuid,
  payment_days integer,
  credit_limit numeric,
  discount_pct numeric DEFAULT 0,
  tax_applicable boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── procurement_vendors ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_vendors (
  id uuid DEFAULT gen_random_uuid(),
  code text,
  name text,
  vendor_type text,
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  gstin text,
  pan text,
  bank_name text,
  account_no text,
  ifsc_code text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── role_privileges ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_privileges (
  id uuid DEFAULT gen_random_uuid(),
  role_id uuid,
  screen_id uuid,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_export boolean DEFAULT false
);

-- ─── roles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid(),
  role_code text,
  role_name text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── schedule_templates ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id uuid DEFAULT gen_random_uuid(),
  doctor_id text,
  template_name text,
  schedule_data jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── screens ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.screens (
  id uuid DEFAULT gen_random_uuid(),
  module text,
  screen_code text,
  screen_name text,
  screen_url text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── service_approvals ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_approvals (
  id uuid DEFAULT gen_random_uuid(),
  order_id uuid,
  sponsor_id uuid,
  approval_status text DEFAULT 'Pending'::text,
  approval_code text,
  approved_at timestamp with time zone,
  approved_by text,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── service_centres ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_centres (
  id text,
  name text,
  code text,
  department_id text,
  branch_id text,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── service_definitions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_definitions (
  id uuid DEFAULT gen_random_uuid(),
  code text,
  name text,
  category text,
  sub_category text,
  service_type text DEFAULT 'Test'::text,
  base_price numeric DEFAULT 0,
  tax_percentage numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  department_id text,
  service_centre_id text,
  cpt_code text,
  loinc_code text,
  is_profile boolean DEFAULT false,
  tat_hours integer
);

-- ─── service_location_mappings ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_location_mappings (
  id uuid DEFAULT gen_random_uuid(),
  service_id uuid,
  branch_id uuid,
  service_centre_id text,
  department_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── service_orders ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_orders (
  id uuid DEFAULT gen_random_uuid(),
  appointment_id text,
  service_id uuid,
  ordering_doctor_id text,
  order_date timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Ordered'::text,
  priority text DEFAULT 'Routine'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  patient_id text,
  bill_id text,
  payer_type text DEFAULT 'Self'::text,
  sponsor_id uuid,
  price numeric DEFAULT 0,
  discount_pct numeric DEFAULT 0,
  tax_pct numeric DEFAULT 0
);

-- ─── service_tariffs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_tariffs (
  id uuid DEFAULT gen_random_uuid(),
  service_id uuid,
  branch_id uuid,
  tariff_class text DEFAULT 'Standard'::text,
  price numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  effective_from date,
  effective_to date,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── sponsor_tariffs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sponsor_tariffs (
  id uuid DEFAULT gen_random_uuid(),
  sponsor_id uuid,
  item_type text,
  item_code text,
  item_name text,
  class_name text,
  price numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── stock_transfer_items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
  id uuid DEFAULT gen_random_uuid(),
  transfer_id uuid,
  item_id uuid,
  batch_no text,
  expiry_date date,
  quantity numeric DEFAULT 0,
  unit_id uuid,
  source_ledger_id uuid,
  destination_ledger_id uuid,
  notes text
);

-- ─── stock_transfers ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid DEFAULT gen_random_uuid(),
  transfer_no text,
  transfer_date date,
  source_store_id uuid,
  destination_store_id uuid,
  status text DEFAULT 'Draft'::text,
  notes text,
  requested_by uuid,
  approved_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── store_item_mappings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_item_mappings (
  id uuid DEFAULT gen_random_uuid(),
  store_id uuid,
  item_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── stores ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid DEFAULT gen_random_uuid(),
  store_code text,
  store_name text,
  store_type text,
  branch_id uuid,
  department_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ─── tax_masters ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tax_masters (
  id uuid DEFAULT gen_random_uuid(),
  code text,
  name text,
  rate numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── temp_unresolved_lab_orders ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.temp_unresolved_lab_orders (
  lab_order_id uuid,
  service_order_id uuid,
  bill_id text,
  patient_id text,
  ordered_at timestamp with time zone,
  notes text
);

-- ─── units ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.units (
  id uuid DEFAULT gen_random_uuid(),
  code text,
  name text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── user_privilege_overrides ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_privilege_overrides (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid,
  screen_id uuid,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_export boolean DEFAULT false
);

-- ─── vital_sign_groups ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vital_sign_groups (
  id uuid DEFAULT gen_random_uuid(),
  name text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── vital_sign_parameters ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vital_sign_parameters (
  id uuid DEFAULT gen_random_uuid(),
  group_id uuid,
  code text,
  name text,
  unit text,
  data_type text DEFAULT 'numeric'::text,
  min_value numeric,
  max_value numeric,
  decimal_places integer DEFAULT 1,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- =============================================================
-- SECTION 2: DATA INSERTIONS
-- =============================================================

-- ─── departments ─────────────────────────────────────────────
INSERT INTO public.departments (id, name, code, status) VALUES
('1769694907292', 'DENTAL', 'DEN001', 'Active'),
('28dd0060-717f-4250-9c6c-5faffc289158', 'GM', 'GM001', 'Active'),
('1579db62-f6e6-45e3-b1ee-fe1d6ca29d8c', 'LA001', 'LAB', 'Active')
ON CONFLICT DO NOTHING;

-- ─── service_centres ─────────────────────────────────────────
INSERT INTO public.service_centres (id, name, code, department_id, branch_id, status) VALUES
('1769694923156', 'DENTAL', 'SC001', NULL, NULL, 'Active'),
('6aa4126b-7b5b-4f79-a497-357521094fcf', 'GM', 'SC003', '28dd0060-717f-4250-9c6c-5faffc289158', NULL, 'Active'),
('a6904921-e8eb-4f96-9ef3-b5dd9c1d1d93', 'SC004', 'LAB1', '1579db62-f6e6-45e3-b1ee-fe1d6ca29d8c', NULL, 'Active')
ON CONFLICT DO NOTHING;

-- ─── branches ────────────────────────────────────────────────
INSERT INTO public.branches (id, name, code, status, vat_reg_no, logo_url) VALUES
('7222fe57-1ba1-40fd-9942-ecd8907faccb', 'HERRICK HEALTHCARE - HIMS', 'HOSP-001', 'Active', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ─── roles ───────────────────────────────────────────────────
INSERT INTO public.roles (id, role_code, role_name, description, created_at, updated_at) VALUES
('9c602d0c-d4d0-45b4-946f-7a1e7bc268fc', 'ADMIN', 'Administrator', 'Full system access, bypasses all privilege checks', '2026-07-23T15:24:47.639376+00:00', '2026-07-23T15:24:47.639376+00:00'),
('e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'LAB001', 'LAB', NULL, '2026-08-04T16:24:23.127099+00:00', '2026-08-04T16:24:23.127099+00:00'),
('5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'LAB002', 'LAB-REPORT', NULL, '2026-08-04T16:31:15.85464+00:00', '2026-08-04T16:31:15.85464+00:00'),
('65853bae-c66f-410f-b14f-0fa76009dbac', 'IN001', 'INVENTORY', NULL, '2026-08-05T07:55:15.814977+00:00', '2026-08-05T07:55:15.814977+00:00')
ON CONFLICT DO NOTHING;

-- ─── screens ─────────────────────────────────────────────────
INSERT INTO public.screens (id, module, screen_code, screen_name, screen_url, display_order, created_at) VALUES
('0385e23d-bac9-4953-81ad-5d311fa23c0e', 'Finance', 'FIN_PLAN', 'Plan Definition', '/finance/masters/plan-definition', 6, '2026-07-23T15:25:01.155905+00:00'),
('093e0d33-32b4-46fa-99f5-404ca289a863', 'Lab', 'LIMS_COLLECT', 'Collect Sample', '/lims/collect', 2, '2026-07-23T15:24:55.266156+00:00'),
('1135164a-3c11-414d-bbe8-aa4c19eb926d', 'System', 'EMPLOYEES', 'Doctors & Staff Management', '/employees', 7, '2026-07-24T04:21:18.322122+00:00'),
('135622ec-275b-46c1-a0d6-9e7233f2d613', 'System', 'RBAC_CONFIG', 'RBAC Control Center', '/rbac', 10, '2026-07-24T04:21:19.042282+00:00'),
('22766351-d68b-4cda-bd60-4e67ec6ae922', 'Finance', 'FIN_TARIFF', 'Sponsor Tariff', '/finance/masters/sponsor-tariff', 7, '2026-07-23T15:25:01.155905+00:00'),
('30354377-810c-4e1f-9d78-f934e102c97d', 'Lab', 'LIMS_ACCEPT', 'Accept Sample', '/lims/accept', 3, '2026-07-23T15:24:55.266156+00:00'),
('50356998-5601-4335-851d-d24387bfe55b', 'Pharmacy', 'PHARMACY_DASHBOARD', 'Pharmacy Module Access', '/pharmacy', 1, '2026-07-24T04:21:19.437314+00:00'),
('5968ab30-c687-4d59-98bf-405881a201ce', 'System', 'MASTERS', 'Administration Masters', '/masters', 9, '2026-07-24T04:21:18.837718+00:00'),
('6a8e5a29-88cd-4ded-9abf-88f12760f7c1', 'System', 'APPOINTMENTS', 'Appointments Page', '/appointments', 2, '2026-07-24T04:21:17.077634+00:00'),
('736a5423-86e0-4e6d-ac5e-06c110be862a', 'Finance', 'FIN_COA', 'Chart of Accounts', '/finance/masters/chart-of-accounts', 3, '2026-07-23T15:25:01.155905+00:00'),
('7a4ba429-d68a-4efe-8906-ea3f6e5dc64a', 'Finance', 'FIN_ORG', 'Organization Master', '/finance/masters/organization', 5, '2026-07-23T15:25:01.155905+00:00'),
('7a99fd79-c4a6-43d0-aed0-5a5e18410fa1', 'Lab', 'LIMS_MASTERS', 'LIMS Masters Configuration', '/lims/masters', 7, '2026-07-23T15:24:55.266156+00:00'),
('89e81b90-b238-4f3a-991b-4d84557c06c5', 'Finance', 'FIN_BILLING', 'Billing Workbench', '/finance/billing', 1, '2026-07-23T15:25:01.155905+00:00'),
('8dcb62b6-4e02-4409-896f-2043b138c3d5', 'Finance', 'FIN_JV', 'Journal Vouchers', '/finance/transactions/journal-vouchers', 4, '2026-07-23T15:25:01.155905+00:00'),
('930d6b49-a55f-47cf-b477-a78c7263c0eb', 'System', 'AVAILABILITY', 'Availability Scheduler', '/availability', 8, '2026-07-24T04:21:18.542129+00:00'),
('934be39a-1e26-4d51-a106-9951f9dae56d', 'System', 'REPORTS', 'System Reports', '/reports', 6, '2026-07-24T04:21:18.06021+00:00'),
('a13d1a9a-7c44-40ce-9ede-18d6893a72ce', 'Lab', 'LIMS_ANALYTICS', 'Compliance & Analytics', '/lims/analytics', 6, '2026-07-23T15:24:55.266156+00:00'),
('b2544a55-5fff-4ccf-818d-a0dedee059e6', 'System', 'DOCTOR_WORKBENCH', 'Doctor Workbench', '/doctor-workbench', 4, '2026-07-24T04:21:17.455527+00:00'),
('b85487fc-bd1e-4366-9cc3-989192cb2eb4', 'Lab', 'LIMS_PERFORM', 'Perform Test', '/lims/perform', 4, '2026-07-23T15:24:55.266156+00:00'),
('c6548f06-a74d-4baf-8821-4d7052274be1', 'Finance', 'FIN_REFUND', 'Refund Workbench', '/finance/transactions/refund', 2, '2026-07-23T15:25:01.155905+00:00'),
('d17cd2b9-5be6-49ff-931b-2eca51ba9115', 'Procurement', 'PROCUREMENT_DASHBOARD', 'Procurement Module Access', '/procurement', 1, '2026-07-24T04:21:19.619015+00:00'),
('d1c139e9-4c71-4ff9-8366-8245458cae67', 'System', 'DASHBOARD', 'Main Dashboard', '/', 1, '2026-07-24T04:21:16.885023+00:00'),
('d8381010-6c20-441a-977c-9241950d13fc', 'System', 'ABDM_PROFILES', 'ABDM Profiles', '/abdm-profiles', 5, '2026-07-24T04:21:17.784308+00:00'),
('e344fdd4-c5e2-4d81-b3c2-5ff25a285174', 'Inventory', 'INVENTORY_DASHBOARD', 'Inventory Module Access', '/inventory', 1, '2026-07-24T04:21:19.239345+00:00'),
('e4767e46-8c9e-4a44-b0f8-7658ca54c76b', 'System', 'PATIENTS', 'Patients Registration', '/patients', 3, '2026-07-24T04:21:17.288995+00:00'),
('efbadbc8-fd9e-4768-b2c7-8f61345010bd', 'Lab', 'LIMS_AMENDMENTS', 'Pathology Amendments', '/lims/amendments', 5, '2026-07-23T15:24:55.266156+00:00'),
('f2fe8cb4-982e-4458-9d19-53a24af3d4b6', 'Lab', 'LIMS_DASHBOARD', 'LIMS Dashboard', '/lims/dashboard', 1, '2026-07-23T15:24:55.266156+00:00')
ON CONFLICT DO NOTHING;

-- ─── app_users ───────────────────────────────────────────────
INSERT INTO public.app_users (id, username, password, role, employee_id, full_name, created_at, user_code, email, mobile, is_active, force_password_change, last_login, role_id, updated_at, location_id, department_id) VALUES
('9185e6a4-8ae8-4c60-b3c7-793d89b4700e', 'admin', 'admin123', 'Admin', NULL, 'Dr. System Administrator', '2026-02-03T16:44:01.411992+00:00', NULL, NULL, NULL, true, false, NULL, '9c602d0c-d4d0-45b4-946f-7a1e7bc268fc', '2026-07-23T15:08:27.738372+00:00', NULL, NULL),
('7c21a325-633c-4026-a982-3c5a4d87a888', 'lab1', '1234', 'LAB', NULL, 'LAB USER', '2026-08-04T16:25:10.213+00:00', '', '', '', true, false, NULL, 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '2026-08-04T16:25:10.213+00:00', 'a6904921-e8eb-4f96-9ef3-b5dd9c1d1d93', '1579db62-f6e6-45e3-b1ee-fe1d6ca29d8c'),
('50ee2898-0065-437b-ab99-284d7f148f38', 'lab2', '1234', 'LAB-REPORT', NULL, 'LABUSE 2', '2026-08-04T16:31:53.201+00:00', '', '', '', true, false, NULL, '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '2026-08-04T16:32:58.225+00:00', 'a6904921-e8eb-4f96-9ef3-b5dd9c1d1d93', '1579db62-f6e6-45e3-b1ee-fe1d6ca29d8c'),
('957ae821-52d0-4bfd-bb83-0082dfc1f242', 'in001', '1234', 'INVENTORY', NULL, 'INVENTORY', '2026-08-05T07:56:06.551+00:00', '', '', '', true, false, NULL, '65853bae-c66f-410f-b14f-0fa76009dbac', '2026-08-05T07:56:06.551+00:00', '6aa4126b-7b5b-4f79-a497-357521094fcf', '28dd0060-717f-4250-9c6c-5faffc289158')
ON CONFLICT DO NOTHING;

-- ─── role_privileges ─────────────────────────────────────────
INSERT INTO public.role_privileges (id, role_id, screen_id, can_view, can_create, can_edit, can_delete, can_export) VALUES
('dea5633c-0373-4df3-bc1d-d13c54ce61f5', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '135622ec-275b-46c1-a0d6-9e7233f2d613', false, false, false, false, false),
('9a818b94-9d3d-420b-a332-cc662441f52b', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '5968ab30-c687-4d59-98bf-405881a201ce', false, false, false, false, false),
('74ba31da-83df-48e0-86fa-a429e102b4ee', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '930d6b49-a55f-47cf-b477-a78c7263c0eb', false, false, false, false, false),
('ac8cc3c6-cc70-48e5-a412-bbffde753f0d', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '22766351-d68b-4cda-bd60-4e67ec6ae922', false, false, false, false, false),
('3706534f-a3f1-4583-85e9-a6556c1f3891', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '7a99fd79-c4a6-43d0-aed0-5a5e18410fa1', false, false, false, false, false),
('1a288b58-2c4f-4b93-a0f6-d6fdc2f33349', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '1135164a-3c11-414d-bbe8-aa4c19eb926d', false, false, false, false, false),
('87261a96-d9f5-48e8-b3ab-72bb20828bff', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '934be39a-1e26-4d51-a106-9951f9dae56d', false, false, false, false, false),
('64576957-7937-4987-9aa5-cb9ef158d30c', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'a13d1a9a-7c44-40ce-9ede-18d6893a72ce', true, true, true, true, true),
('ef55a784-a73e-4e9c-aa5e-076708fe1653', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '0385e23d-bac9-4953-81ad-5d311fa23c0e', false, false, false, false, false),
('fbc21fee-7016-4953-b7ed-c48c694e0994', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '7a4ba429-d68a-4efe-8906-ea3f6e5dc64a', false, false, false, false, false),
('f7bde03d-53ff-48d9-b792-04cacc57feef', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'd8381010-6c20-441a-977c-9241950d13fc', false, false, false, false, false),
('cfa06461-462b-455d-883e-1e2719277ccd', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'efbadbc8-fd9e-4768-b2c7-8f61345010bd', false, false, false, false, false),
('6638c728-9d23-466e-b6b1-2954790cbcb3', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'd1c139e9-4c71-4ff9-8366-8245458cae67', false, false, false, false, false),
('4fd9fd5a-6705-49f2-9838-802a61adecfc', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'b2544a55-5fff-4ccf-818d-a0dedee059e6', false, false, false, false, false),
('58b93299-7438-43ae-9b48-7d64307d1aa7', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'b85487fc-bd1e-4366-9cc3-989192cb2eb4', false, false, false, false, false),
('fb82a6c0-4a07-4a77-a6d8-5a6bcba7364b', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '8dcb62b6-4e02-4409-896f-2043b138c3d5', false, false, false, false, false),
('27bd7f12-0e45-442e-9f7a-fdddf48940b3', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '30354377-810c-4e1f-9d78-f934e102c97d', false, false, false, false, false),
('df2913ce-dc3f-4bf8-a854-85b8b4fd35c9', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'e4767e46-8c9e-4a44-b0f8-7658ca54c76b', false, false, false, false, false),
('8385e1a4-55fa-44bd-a06a-fffa224343ae', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '736a5423-86e0-4e6d-ac5e-06c110be862a', false, false, false, false, false),
('68660d4f-b813-47d5-ad3a-f732e46b7138', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '6a8e5a29-88cd-4ded-9abf-88f12760f7c1', false, false, false, false, false),
('7f36fd31-6328-4a27-831f-5ca343054351', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'c6548f06-a74d-4baf-8821-4d7052274be1', false, false, false, false, false),
('e610e0b5-1a48-4e3a-bd40-9c16be1779d3', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '093e0d33-32b4-46fa-99f5-404ca289a863', false, false, false, false, false),
('61d71b3d-2608-4035-ab15-2c8c517e61ad', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'd17cd2b9-5be6-49ff-931b-2eca51ba9115', false, false, false, false, false),
('be885f3f-4121-4a19-9bc8-7a23d450de61', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '89e81b90-b238-4f3a-991b-4d84557c06c5', false, false, false, false, false),
('d53262bd-8e4c-428b-b98e-bca62baa5424', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'e344fdd4-c5e2-4d81-b3c2-5ff25a285174', false, false, false, false, false),
('c0d9f120-58b9-4b17-a5be-4b86af7fea65', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', '50356998-5601-4335-851d-d24387bfe55b', false, false, false, false, false),
('c2f9bb55-9d16-4826-ac4a-35db50cb03bf', '5cee6f3e-9a90-4b36-8c11-133ef2c0d22a', 'f2fe8cb4-982e-4458-9d19-53a24af3d4b6', true, true, true, true, true),
('a2609077-457d-4cbb-ab43-477896b1fd5f', '65853bae-c66f-410f-b14f-0fa76009dbac', '135622ec-275b-46c1-a0d6-9e7233f2d613', false, false, false, false, false),
('9eb3796b-b66a-4d76-92b1-2e6abfd50ff2', '65853bae-c66f-410f-b14f-0fa76009dbac', 'd1c139e9-4c71-4ff9-8366-8245458cae67', false, false, false, false, false),
('fb0725a7-5255-4208-85f9-b01cac8af6f3', '65853bae-c66f-410f-b14f-0fa76009dbac', 'f2fe8cb4-982e-4458-9d19-53a24af3d4b6', false, false, false, false, false),
('fe1e5680-37f8-4d84-a3c6-c6a3624a5d54', '65853bae-c66f-410f-b14f-0fa76009dbac', '50356998-5601-4335-851d-d24387bfe55b', false, false, false, false, false),
('cf4c9a5e-60c1-4530-a5dc-51044983a994', '65853bae-c66f-410f-b14f-0fa76009dbac', 'e344fdd4-c5e2-4d81-b3c2-5ff25a285174', true, true, true, true, true),
('d2888dcd-0389-4a1d-8f41-f740b2c736b5', '65853bae-c66f-410f-b14f-0fa76009dbac', '89e81b90-b238-4f3a-991b-4d84557c06c5', false, false, false, false, false),
('c69bc8ab-0dd5-4a90-8d78-3c4663675b32', '65853bae-c66f-410f-b14f-0fa76009dbac', 'd17cd2b9-5be6-49ff-931b-2eca51ba9115', true, true, true, true, true),
('e8a88082-b6ab-4332-9342-583303746113', '65853bae-c66f-410f-b14f-0fa76009dbac', '093e0d33-32b4-46fa-99f5-404ca289a863', false, false, false, false, false),
('dde14b3b-a1b4-4cf3-8408-bdeb9a783d4d', '65853bae-c66f-410f-b14f-0fa76009dbac', 'c6548f06-a74d-4baf-8821-4d7052274be1', false, false, false, false, false),
('0bca7bb9-d86a-40a7-b41c-2d4a4a71c634', '65853bae-c66f-410f-b14f-0fa76009dbac', '6a8e5a29-88cd-4ded-9abf-88f12760f7c1', false, false, false, false, false),
('59c49788-ca80-44df-9214-e0593a9c4ba3', '65853bae-c66f-410f-b14f-0fa76009dbac', '736a5423-86e0-4e6d-ac5e-06c110be862a', false, false, false, false, false),
('7eac1e36-3105-41df-aaf9-3a610571088a', '65853bae-c66f-410f-b14f-0fa76009dbac', 'e4767e46-8c9e-4a44-b0f8-7658ca54c76b', false, false, false, false, false),
('c6de058a-b2c5-4b52-92ec-d8bad4f1abfe', '65853bae-c66f-410f-b14f-0fa76009dbac', '30354377-810c-4e1f-9d78-f934e102c97d', false, false, false, false, false),
('083b035b-3f05-4468-b858-879dd3542801', '65853bae-c66f-410f-b14f-0fa76009dbac', '8dcb62b6-4e02-4409-896f-2043b138c3d5', false, false, false, false, false),
('8125b655-e225-4018-8a6a-5c8b45d111eb', '65853bae-c66f-410f-b14f-0fa76009dbac', 'b85487fc-bd1e-4366-9cc3-989192cb2eb4', false, false, false, false, false),
('e48004d3-151a-4fec-aa36-16126ba3fa9a', '65853bae-c66f-410f-b14f-0fa76009dbac', 'b2544a55-5fff-4ccf-818d-a0dedee059e6', false, false, false, false, false),
('1d6dcbe7-e36c-4f60-8be9-ed7fd3ee325a', '65853bae-c66f-410f-b14f-0fa76009dbac', 'efbadbc8-fd9e-4768-b2c7-8f61345010bd', false, false, false, false, false),
('8c5067bf-9947-4d09-89cb-ee3f8586d147', '65853bae-c66f-410f-b14f-0fa76009dbac', 'd8381010-6c20-441a-977c-9241950d13fc', false, false, false, false, false),
('58652cd0-5284-47af-a6c8-693f022b652d', '65853bae-c66f-410f-b14f-0fa76009dbac', '7a4ba429-d68a-4efe-8906-ea3f6e5dc64a', false, false, false, false, false),
('878fc42b-2777-43e8-bf3d-73743742072a', '65853bae-c66f-410f-b14f-0fa76009dbac', '0385e23d-bac9-4953-81ad-5d311fa23c0e', false, false, false, false, false),
('f49a42b5-2a73-42f8-be31-51241d28e8ac', '65853bae-c66f-410f-b14f-0fa76009dbac', 'a13d1a9a-7c44-40ce-9ede-18d6893a72ce', false, false, false, false, false),
('4106197c-0e9e-4dde-9c0b-ccb9639f6497', '65853bae-c66f-410f-b14f-0fa76009dbac', '934be39a-1e26-4d51-a106-9951f9dae56d', false, false, false, false, false),
('149ef012-6182-461b-8265-bf4e954f7ab8', '65853bae-c66f-410f-b14f-0fa76009dbac', '1135164a-3c11-414d-bbe8-aa4c19eb926d', false, false, false, false, false),
('acf9f6b4-9668-4707-b29a-540b4b9b243d', '65853bae-c66f-410f-b14f-0fa76009dbac', '7a99fd79-c4a6-43d0-aed0-5a5e18410fa1', false, false, false, false, false),
('87ea19b1-92af-4833-9d60-ba472a01cb69', '65853bae-c66f-410f-b14f-0fa76009dbac', '22766351-d68b-4cda-bd60-4e67ec6ae922', false, false, false, false, false),
('bab40739-c97f-4aa8-a34c-d3932609f445', '65853bae-c66f-410f-b14f-0fa76009dbac', '930d6b49-a55f-47cf-b477-a78c7263c0eb', false, false, false, false, false),
('d3b87c39-52a2-4458-ae55-cbbe7edf2767', '65853bae-c66f-410f-b14f-0fa76009dbac', '5968ab30-c687-4d59-98bf-405881a201ce', false, false, false, false, false),
('0f574c2a-1346-4137-aed3-922dcd2d9363', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '8dcb62b6-4e02-4409-896f-2043b138c3d5', false, false, false, false, false),
('f47e82e0-99c3-40e2-8b3d-4551b20c1168', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '30354377-810c-4e1f-9d78-f934e102c97d', false, false, false, false, false),
('618702d4-20c5-4f0d-9c4b-7c9265a2c4da', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'e4767e46-8c9e-4a44-b0f8-7658ca54c76b', false, false, false, false, false),
('eaf7f485-f938-4315-91d5-0370e0dc353d', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '736a5423-86e0-4e6d-ac5e-06c110be862a', false, false, false, false, false),
('c59174e4-bae0-4a65-88fd-13a17c98e4c9', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '6a8e5a29-88cd-4ded-9abf-88f12760f7c1', false, false, false, false, false),
('b3cc750f-3977-427f-89e0-2bbff6ca1e85', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'c6548f06-a74d-4baf-8821-4d7052274be1', false, false, false, false, false),
('15e5e11c-aa95-4d36-a7cb-5977c92d0189', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '093e0d33-32b4-46fa-99f5-404ca289a863', true, true, true, true, true),
('ed9b6350-6e4d-47dc-9144-47affe57e6dd', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'd17cd2b9-5be6-49ff-931b-2eca51ba9115', false, false, false, false, false),
('c30d7fdb-6180-4233-9d75-1161c2437ee4', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '89e81b90-b238-4f3a-991b-4d84557c06c5', false, false, false, false, false),
('bcb19465-d89f-4cd0-a1e5-1fe86fabf9c7', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'e344fdd4-c5e2-4d81-b3c2-5ff25a285174', false, false, false, false, false),
('8ca2e79a-23a1-4f7f-a3f4-544f6b943bcc', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '50356998-5601-4335-851d-d24387bfe55b', false, false, false, false, false),
('e349d783-30dc-454b-abbb-d37844b5fc8f', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'f2fe8cb4-982e-4458-9d19-53a24af3d4b6', true, true, true, true, true),
('50f39e0e-e189-47d8-8bf5-c3684e6e151e', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'd1c139e9-4c71-4ff9-8366-8245458cae67', false, false, false, false, false),
('303174e8-f9c6-4cac-8e60-561a7af15424', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '135622ec-275b-46c1-a0d6-9e7233f2d613', false, false, false, false, false),
('8eb54df9-f468-4cad-be68-b49a2801e2d6', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '5968ab30-c687-4d59-98bf-405881a201ce', false, false, false, false, false),
('1ac1ae54-cdd6-462e-951d-cb4d03ca3a7f', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '930d6b49-a55f-47cf-b477-a78c7263c0eb', false, false, false, false, false),
('316cb757-b6ea-402b-b592-306a210cf6c9', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '22766351-d68b-4cda-bd60-4e67ec6ae922', false, false, false, false, false),
('6bcef8ba-9491-44aa-a387-17384439e16c', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '7a99fd79-c4a6-43d0-aed0-5a5e18410fa1', false, false, false, false, false),
('3a1a347d-de54-49dd-9728-04d5bc0ac51f', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '1135164a-3c11-414d-bbe8-aa4c19eb926d', false, false, false, false, false),
('f1835c87-2915-4620-8da4-a2b4475ccc7d', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '934be39a-1e26-4d51-a106-9951f9dae56d', false, false, false, false, false),
('c1a05657-f33a-49ed-ae34-10d4dd26a176', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'a13d1a9a-7c44-40ce-9ede-18d6893a72ce', false, false, false, false, false),
('13b940bb-c697-4bcb-ab9a-d07bd7c05af5', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '0385e23d-bac9-4953-81ad-5d311fa23c0e', false, false, false, false, false),
('0d9f6d3f-930d-4672-acf6-deaadd6792a2', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', '7a4ba429-d68a-4efe-8906-ea3f6e5dc64a', false, false, false, false, false),
('e1589043-8851-4422-9c8b-c4a022046e8e', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'd8381010-6c20-441a-977c-9241950d13fc', false, false, false, false, false),
('d2a8f376-6e72-4bdf-99af-8b0290306290', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'efbadbc8-fd9e-4768-b2c7-8f61345010bd', false, false, false, false, false),
('b6e1f728-55a8-40a2-8c30-7a5e7cbf99bf', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'b2544a55-5fff-4ccf-818d-a0dedee059e6', false, false, false, false, false),
('607ab1de-6060-40f3-8d4e-74f83623752c', 'e5fc17d7-67b8-4ba0-b3e0-7da474d9674f', 'b85487fc-bd1e-4366-9cc3-989192cb2eb4', false, false, false, false, false)
ON CONFLICT DO NOTHING;

-- ─── currency_master ─────────────────────────────────────────
INSERT INTO public.currency_master (id, code, name, symbol, is_active, is_default, created_at) VALUES
('19aec86e-43bc-4e46-8c10-bfe853ebab03', 'USD', 'US Dollar', '$', true, false, '2026-06-10T11:20:15.833083+00:00'),
('217a03f0-ba27-4de2-ba0a-0e9a3fc62c97', 'SAR', 'Saudi Riyal', 'SAR', true, false, '2026-06-10T11:20:15.833083+00:00'),
('43590a29-02f9-446e-9523-b1c598900b43', 'INR', 'Indian Rupee', '₹', true, true, '2026-06-10T11:20:15.833083+00:00'),
('49112981-4dfe-48b7-af93-4294221ad639', 'QAR', 'Qatari Riyal', 'QAR', true, false, '2026-06-10T11:20:15.833083+00:00'),
('6d372e01-9c77-4e47-baa1-c1295b2b2d9f', 'BHD', 'Bahraini Dinar', 'BHD', true, false, '2026-06-10T11:20:15.833083+00:00')
ON CONFLICT DO NOTHING;

-- =============================================================
-- SECTION 3: PRIMARY KEY CONSTRAINTS
-- =============================================================

ALTER TABLE public.appointments       ADD PRIMARY KEY (id);
ALTER TABLE public.bill_status_history ADD PRIMARY KEY (id);
ALTER TABLE public.bills              ADD PRIMARY KEY (id);
ALTER TABLE public.branches           ADD PRIMARY KEY (id);
ALTER TABLE public.credit_memos       ADD PRIMARY KEY (id);
ALTER TABLE public.doctor_availability ADD PRIMARY KEY (id);
ALTER TABLE public.doctor_schedules   ADD PRIMARY KEY (id);
ALTER TABLE public.employees          ADD PRIMARY KEY (id);
ALTER TABLE public.finance_chart_of_accounts ADD PRIMARY KEY (id);
ALTER TABLE public.finance_journal_voucher_items ADD PRIMARY KEY (id);
ALTER TABLE public.finance_journal_vouchers ADD PRIMARY KEY (id);
ALTER TABLE public.finance_organizations ADD PRIMARY KEY (id);
ALTER TABLE public.insurance_policies ADD PRIMARY KEY (id);
ALTER TABLE public.inventory_batch_locations ADD PRIMARY KEY (id);
ALTER TABLE public.inventory_item_pricing ADD PRIMARY KEY (id);
ALTER TABLE public.inventory_item_stocks ADD PRIMARY KEY (id);
ALTER TABLE public.inventory_items    ADD PRIMARY KEY (id);
ALTER TABLE public.inventory_opening_stock_items ADD PRIMARY KEY (id);
ALTER TABLE public.inventory_opening_stocks ADD PRIMARY KEY (id);
ALTER TABLE public.inventory_stock_ledger ADD PRIMARY KEY (id);
ALTER TABLE public.item_tax_mappings  ADD PRIMARY KEY (id);
ALTER TABLE public.lab_reagent_consumption_log ADD PRIMARY KEY (id);
ALTER TABLE public.lab_service_import_log ADD PRIMARY KEY (id);
ALTER TABLE public.lab_service_profile_components ADD PRIMARY KEY (id);
ALTER TABLE public.lab_service_reagents ADD PRIMARY KEY (id);
ALTER TABLE public.lims_antibiotics   ADD PRIMARY KEY (id);
ALTER TABLE public.lims_containers    ADD PRIMARY KEY (id);
ALTER TABLE public.lims_equipment     ADD PRIMARY KEY (id);
ALTER TABLE public.lims_lab_orders    ADD PRIMARY KEY (id);
ALTER TABLE public.lims_organisms     ADD PRIMARY KEY (id);
ALTER TABLE public.lims_outsource_labs ADD PRIMARY KEY (id);
ALTER TABLE public.lims_parameter_options ADD PRIMARY KEY (id);
ALTER TABLE public.lims_reference_ranges ADD PRIMARY KEY (id);
ALTER TABLE public.lims_reference_remarks ADD PRIMARY KEY (id);
ALTER TABLE public.lims_results       ADD PRIMARY KEY (id);
ALTER TABLE public.lims_samples       ADD PRIMARY KEY (id);
ALTER TABLE public.lims_service_configs ADD PRIMARY KEY (service_id);
ALTER TABLE public.lims_service_parameters ADD PRIMARY KEY (id);
ALTER TABLE public.lims_specimens     ADD PRIMARY KEY (id);
ALTER TABLE public.lims_stains        ADD PRIMARY KEY (id);
ALTER TABLE public.lims_test_results  ADD PRIMARY KEY (id);
ALTER TABLE public.loyalty_accounts   ADD PRIMARY KEY (id);
ALTER TABLE public.loyalty_bonus_rules ADD PRIMARY KEY (id);
ALTER TABLE public.loyalty_program_config ADD PRIMARY KEY (id);
ALTER TABLE public.loyalty_redemption_rules ADD PRIMARY KEY (id);
ALTER TABLE public.loyalty_sms_log    ADD PRIMARY KEY (id);
ALTER TABLE public.loyalty_tier_history ADD PRIMARY KEY (id);
ALTER TABLE public.loyalty_tiers      ADD PRIMARY KEY (id);
ALTER TABLE public.loyalty_transactions ADD PRIMARY KEY (id);
ALTER TABLE public.master_diagnoses   ADD PRIMARY KEY (id);
ALTER TABLE public.patient_demographics ADD PRIMARY KEY (id);
ALTER TABLE public.patient_documents  ADD PRIMARY KEY (id);
ALTER TABLE public.patient_refunds    ADD PRIMARY KEY (id);
ALTER TABLE public.patients           ADD PRIMARY KEY (id);
ALTER TABLE public.payments           ADD PRIMARY KEY (id);
ALTER TABLE public.pharmacy_direct_sale_items ADD PRIMARY KEY (id);
ALTER TABLE public.pharmacy_direct_sales ADD PRIMARY KEY (id);
ALTER TABLE public.pharmacy_drug_generics ADD PRIMARY KEY (id);
ALTER TABLE public.pharmacy_drug_master ADD PRIMARY KEY (id);
ALTER TABLE public.pharmacy_racks     ADD PRIMARY KEY (id);
ALTER TABLE public.pharmacy_return_items ADD PRIMARY KEY (id);
ALTER TABLE public.pharmacy_returns   ADD PRIMARY KEY (id);
ALTER TABLE public.pharmacy_zones     ADD PRIMARY KEY (id);
ALTER TABLE public.policy_mapped_branches ADD PRIMARY KEY (id);
ALTER TABLE public.policy_patient_max_amounts ADD PRIMARY KEY (id);
ALTER TABLE public.policy_rules       ADD PRIMARY KEY (id);
ALTER TABLE public.prescription_items ADD PRIMARY KEY (id);
ALTER TABLE public.prescriptions      ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_expiry_return_items ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_expiry_returns ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_grn_items ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_grns   ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_gstr2b_invoices ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_gstr2b_uploads ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_purchase_order_items ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_purchase_orders ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_purchase_receipt_items ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_purchase_receipts ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_purchase_return_items ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_purchase_returns ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_vendor_terms ADD PRIMARY KEY (id);
ALTER TABLE public.procurement_vendors ADD PRIMARY KEY (id);
ALTER TABLE public.role_privileges    ADD PRIMARY KEY (id);
ALTER TABLE public.roles              ADD PRIMARY KEY (id);
ALTER TABLE public.schedule_templates ADD PRIMARY KEY (id);
ALTER TABLE public.screens            ADD PRIMARY KEY (id);
ALTER TABLE public.service_approvals  ADD PRIMARY KEY (id);
ALTER TABLE public.service_centres    ADD PRIMARY KEY (id);
ALTER TABLE public.service_definitions ADD PRIMARY KEY (id);
ALTER TABLE public.service_location_mappings ADD PRIMARY KEY (id);
ALTER TABLE public.service_orders     ADD PRIMARY KEY (id);
ALTER TABLE public.service_tariffs    ADD PRIMARY KEY (id);
ALTER TABLE public.sponsor_tariffs    ADD PRIMARY KEY (id);
ALTER TABLE public.stock_transfer_items ADD PRIMARY KEY (id);
ALTER TABLE public.stock_transfers    ADD PRIMARY KEY (id);
ALTER TABLE public.store_item_mappings ADD PRIMARY KEY (id);
ALTER TABLE public.stores             ADD PRIMARY KEY (id);
ALTER TABLE public.tax_masters        ADD PRIMARY KEY (id);
ALTER TABLE public.temp_unresolved_lab_orders ADD PRIMARY KEY (lab_order_id);
ALTER TABLE public.units              ADD PRIMARY KEY (id);
ALTER TABLE public.user_privilege_overrides ADD PRIMARY KEY (id);
ALTER TABLE public.vital_sign_groups  ADD PRIMARY KEY (id);
ALTER TABLE public.vital_sign_parameters ADD PRIMARY KEY (id);
ALTER TABLE public.app_users          ADD PRIMARY KEY (id);

-- =============================================================
-- SECTION 4: UNIQUE CONSTRAINTS
-- =============================================================

ALTER TABLE public.app_users ADD CONSTRAINT app_users_id_unique UNIQUE (id);
ALTER TABLE public.credit_memos ADD CONSTRAINT credit_memos_credit_memo_no_key UNIQUE (credit_memo_no);
ALTER TABLE public.departments ADD CONSTRAINT departments_id_unique UNIQUE (id);
ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_doctor_id_day_of_week_start_time_key UNIQUE (doctor_id, day_of_week, start_time);
ALTER TABLE public.finance_chart_of_accounts ADD CONSTRAINT finance_chart_of_accounts_code_key UNIQUE (code);
ALTER TABLE public.finance_journal_vouchers ADD CONSTRAINT finance_journal_vouchers_voucher_no_key UNIQUE (voucher_no);
ALTER TABLE public.finance_organizations ADD CONSTRAINT finance_organizations_code_key UNIQUE (code);
ALTER TABLE public.insurance_policies ADD CONSTRAINT insurance_policies_policy_no_key UNIQUE (policy_no);
ALTER TABLE public.inventory_batch_locations ADD CONSTRAINT inventory_batch_locations_store_id_item_id_batch_no_zone_id_key UNIQUE (store_id, item_id, batch_no, zone_id, rack_id, shelf_no, bin_no);
ALTER TABLE public.inventory_item_pricing ADD CONSTRAINT inventory_item_pricing_item_id_branch_id_key UNIQUE (item_id, branch_id);
ALTER TABLE public.inventory_item_stocks ADD CONSTRAINT inventory_item_stocks_item_id_key UNIQUE (item_id);
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_item_code_key UNIQUE (item_code);
ALTER TABLE public.item_tax_mappings ADD CONSTRAINT item_tax_mappings_item_id_tax_id_key UNIQUE (item_id, tax_id);
ALTER TABLE public.lab_service_profile_components ADD CONSTRAINT lab_service_profile_component_profile_service_id_component__key UNIQUE (profile_service_id, component_service_id);
ALTER TABLE public.lab_service_reagents ADD CONSTRAINT lab_service_reagents_service_id_item_id_store_id_key UNIQUE (service_id, item_id, store_id);
ALTER TABLE public.lims_antibiotics ADD CONSTRAINT lims_antibiotics_code_key UNIQUE (code);
ALTER TABLE public.lims_antibiotics ADD CONSTRAINT lims_antibiotics_name_key UNIQUE (name);
ALTER TABLE public.lims_containers ADD CONSTRAINT lims_containers_code_key UNIQUE (code);
ALTER TABLE public.lims_containers ADD CONSTRAINT lims_containers_name_key UNIQUE (name);
ALTER TABLE public.lims_equipment ADD CONSTRAINT lims_equipment_code_key UNIQUE (code);
ALTER TABLE public.lims_equipment ADD CONSTRAINT lims_equipment_name_key UNIQUE (name);
ALTER TABLE public.lims_organisms ADD CONSTRAINT lims_organisms_code_key UNIQUE (code);
ALTER TABLE public.lims_organisms ADD CONSTRAINT lims_organisms_name_key UNIQUE (name);
ALTER TABLE public.lims_outsource_labs ADD CONSTRAINT lims_outsource_labs_code_key UNIQUE (code);
ALTER TABLE public.lims_parameter_options ADD CONSTRAINT lims_parameter_options_parameter_id_option_value_key UNIQUE (parameter_id, option_value);
ALTER TABLE public.lims_samples ADD CONSTRAINT lims_samples_sample_no_key UNIQUE (sample_no);
ALTER TABLE public.lims_service_parameters ADD CONSTRAINT lims_service_parameters_service_id_code_key UNIQUE (service_id, code);
ALTER TABLE public.lims_specimens ADD CONSTRAINT lims_specimens_code_key UNIQUE (code);
ALTER TABLE public.lims_specimens ADD CONSTRAINT lims_specimens_name_key UNIQUE (name);
ALTER TABLE public.lims_stains ADD CONSTRAINT lims_stains_code_key UNIQUE (code);
ALTER TABLE public.lims_stains ADD CONSTRAINT lims_stains_name_key UNIQUE (name);
ALTER TABLE public.loyalty_accounts ADD CONSTRAINT loyalty_accounts_account_no_key UNIQUE (account_no);
ALTER TABLE public.loyalty_accounts ADD CONSTRAINT loyalty_accounts_mobile_key UNIQUE (mobile);
ALTER TABLE public.loyalty_tiers ADD CONSTRAINT loyalty_tiers_tier_name_key UNIQUE (tier_name);
ALTER TABLE public.patient_demographics ADD CONSTRAINT patient_demographics_abha_number_key UNIQUE (abha_number);
ALTER TABLE public.patient_refunds ADD CONSTRAINT patient_refunds_refund_no_key UNIQUE (refund_no);
ALTER TABLE public.pharmacy_direct_sales ADD CONSTRAINT pharmacy_direct_sales_sale_no_key UNIQUE (sale_no);
ALTER TABLE public.pharmacy_drug_generics ADD CONSTRAINT pharmacy_drug_generics_generic_code_key UNIQUE (generic_code);
ALTER TABLE public.pharmacy_racks ADD CONSTRAINT pharmacy_racks_zone_id_rack_code_key UNIQUE (zone_id, rack_code);
ALTER TABLE public.pharmacy_returns ADD CONSTRAINT pharmacy_returns_return_no_key UNIQUE (return_no);
ALTER TABLE public.pharmacy_zones ADD CONSTRAINT pharmacy_zones_store_id_zone_code_key UNIQUE (store_id, zone_code);
ALTER TABLE public.policy_mapped_branches ADD CONSTRAINT policy_mapped_branches_policy_id_branch_code_key UNIQUE (policy_id, branch_code);
ALTER TABLE public.procurement_expiry_returns ADD CONSTRAINT procurement_expiry_returns_doc_no_key UNIQUE (doc_no);
ALTER TABLE public.procurement_grns ADD CONSTRAINT procurement_grns_grn_no_key UNIQUE (grn_no);
ALTER TABLE public.procurement_purchase_orders ADD CONSTRAINT procurement_purchase_orders_po_no_key UNIQUE (po_no);
ALTER TABLE public.procurement_purchase_receipts ADD CONSTRAINT procurement_purchase_receipts_receipt_no_key UNIQUE (receipt_no);
ALTER TABLE public.procurement_purchase_returns ADD CONSTRAINT procurement_purchase_returns_return_no_key UNIQUE (return_no);
ALTER TABLE public.procurement_vendors ADD CONSTRAINT procurement_vendors_code_key UNIQUE (code);
ALTER TABLE public.role_privileges ADD CONSTRAINT role_privileges_role_id_screen_id_key UNIQUE (role_id, screen_id);
ALTER TABLE public.roles ADD CONSTRAINT roles_role_code_key UNIQUE (role_code);
ALTER TABLE public.screens ADD CONSTRAINT screens_screen_code_key UNIQUE (screen_code);
ALTER TABLE public.service_location_mappings ADD CONSTRAINT service_location_mappings_service_id_branch_id_service_cent_key UNIQUE (service_id, branch_id, service_centre_id);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_transfer_no_key UNIQUE (transfer_no);
ALTER TABLE public.store_item_mappings ADD CONSTRAINT store_item_mappings_store_id_item_id_key UNIQUE (store_id, item_id);
ALTER TABLE public.stores ADD CONSTRAINT stores_store_code_key UNIQUE (store_code);
ALTER TABLE public.user_privilege_overrides ADD CONSTRAINT user_privilege_overrides_user_id_screen_id_key UNIQUE (user_id, screen_id);

-- =============================================================
-- SECTION 5: CHECK CONSTRAINTS
-- =============================================================

ALTER TABLE public.bills ADD CONSTRAINT bills_payer_type_check CHECK ((payer_type = ANY (ARRAY['Self'::text, 'Sponsor'::text])));
ALTER TABLE public.bills ADD CONSTRAINT bills_refund_status_check CHECK ((refund_status = ANY (ARRAY['Pending'::text, 'Partial Refund'::text, 'Refunded'::text])));
ALTER TABLE public.bills ADD CONSTRAINT bills_status_check CHECK ((status = ANY (ARRAY['Unpaid'::text, 'Partial'::text, 'Paid'::text, 'Partial_Return'::text, 'Cancelled'::text])));
ALTER TABLE public.credit_memos ADD CONSTRAINT credit_memos_status_check CHECK ((status = ANY (ARRAY['Pending_Approval'::text, 'Approved'::text, 'Rejected'::text])));
ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_slot_type_check CHECK ((slot_type = ANY (ARRAY['available'::text, 'break'::text, 'blocked'::text])));
ALTER TABLE public.finance_chart_of_accounts ADD CONSTRAINT finance_chart_of_accounts_balance_nature_check CHECK (((balance_nature)::text = ANY (ARRAY[('Debit'::character varying)::text, ('Credit'::character varying)::text])));
ALTER TABLE public.finance_chart_of_accounts ADD CONSTRAINT finance_chart_of_accounts_status_check CHECK (((status)::text = ANY (ARRAY[('Active'::character varying)::text, ('Inactive'::character varying)::text])));
ALTER TABLE public.finance_journal_voucher_items ADD CONSTRAINT finance_journal_voucher_items_amount_check CHECK ((amount >= (0)::numeric));
ALTER TABLE public.finance_journal_voucher_items ADD CONSTRAINT finance_journal_voucher_items_posting_nature_check CHECK (((posting_nature)::text = ANY (ARRAY[('Debit'::character varying)::text, ('Credit'::character varying)::text])));
ALTER TABLE public.finance_journal_vouchers ADD CONSTRAINT finance_journal_vouchers_status_check CHECK (((status)::text = ANY (ARRAY[('Draft'::character varying)::text, ('Posted'::character varying)::text])));
ALTER TABLE public.insurance_policies ADD CONSTRAINT insurance_policies_sponsor_type_check CHECK ((sponsor_type = ANY (ARRAY['TPA'::text, 'Corporate'::text, 'Insurance'::text, 'Self'::text])));
ALTER TABLE public.inventory_batch_locations ADD CONSTRAINT inventory_batch_locations_shelf_no_check CHECK ((shelf_no > 0));
ALTER TABLE public.inventory_items ADD CONSTRAINT chk_purchase_conv_factor CHECK ((purchase_conversion_factor > (0)::numeric));
ALTER TABLE public.inventory_items ADD CONSTRAINT chk_sales_conv_factor CHECK ((sales_conversion_factor > (0)::numeric));
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_storage_condition_check CHECK ((storage_condition = ANY (ARRAY['Room temp'::text, 'Refrigerated 2-8°C'::text, 'Frozen -20°C'::text])));
ALTER TABLE public.lab_reagent_consumption_log ADD CONSTRAINT lab_reagent_consumption_log_action_check CHECK ((action = ANY (ARRAY['DEDUCT'::text, 'REVERSE'::text, 'OVERRIDE_DEDUCT'::text])));
ALTER TABLE public.lab_service_profile_components ADD CONSTRAINT lab_service_profile_components_check CHECK ((profile_service_id <> component_service_id));
ALTER TABLE public.lab_service_reagents ADD CONSTRAINT lab_service_reagents_quantity_per_test_check CHECK ((quantity_per_test > (0)::numeric));
ALTER TABLE public.loyalty_accounts ADD CONSTRAINT loyalty_accounts_account_status_check CHECK (((account_status)::text = ANY ((ARRAY['Active'::character varying, 'Suspended'::character varying, 'Closed'::character varying])::text[])));
ALTER TABLE public.loyalty_accounts ADD CONSTRAINT loyalty_accounts_enrolment_source_check CHECK (((enrolment_source)::text = ANY ((ARRAY['Pharmacy'::character varying, 'OPD'::character varying, 'Receptionist'::character varying, 'Online'::character varying])::text[])));
ALTER TABLE public.loyalty_bonus_rules ADD CONSTRAINT loyalty_bonus_rules_bonus_type_check CHECK (((bonus_type)::text = ANY ((ARRAY['WELCOME'::character varying, 'BIRTHDAY'::character varying, 'REFERRAL_REFERRER'::character varying, 'REFERRAL_REFEREE'::character varying, 'FESTIVAL'::character varying, 'MILESTONE'::character varying])::text[])));
ALTER TABLE public.loyalty_program_config ADD CONSTRAINT loyalty_program_config_expiry_type_check CHECK (((expiry_type)::text = ANY ((ARRAY['ROLLING'::character varying, 'FIXED'::character varying])::text[])));
ALTER TABLE public.loyalty_program_config ADD CONSTRAINT loyalty_program_config_points_rounding_check CHECK (((points_rounding)::text = ANY ((ARRAY['FLOOR'::character varying, 'ROUND'::character varying, 'CEIL'::character varying])::text[])));
ALTER TABLE public.loyalty_program_config ADD CONSTRAINT loyalty_program_config_program_status_check CHECK (((program_status)::text = ANY ((ARRAY['Active'::character varying, 'Inactive'::character varying])::text[])));
ALTER TABLE public.loyalty_sms_log ADD CONSTRAINT loyalty_sms_log_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Sent'::character varying, 'Failed'::character varying])::text[])));
ALTER TABLE public.loyalty_sms_log ADD CONSTRAINT loyalty_sms_log_template_type_check CHECK (((template_type)::text = ANY ((ARRAY['ENROLMENT'::character varying, 'EARN'::character varying, 'REDEEM'::character varying, 'EXPIRY_WARNING'::character varying, 'TIER_UPGRADE'::character varying, 'TIER_DOWNGRADE'::character varying, 'ADJUSTMENT'::character varying])::text[])));
ALTER TABLE public.loyalty_transactions ADD CONSTRAINT loyalty_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['EARN'::character varying, 'REDEEM'::character varying, 'ADJUST_ADD'::character varying, 'ADJUST_SUB'::character varying, 'EXPIRE'::character varying, 'REVERSE'::character varying, 'WELCOME'::character varying, 'BIRTHDAY'::character varying, 'REFERRAL'::character varying, 'MILESTONE'::character varying, 'FESTIVAL'::character varying])::text[])));
ALTER TABLE public.patient_refunds ADD CONSTRAINT patient_refunds_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Processed'::text, 'Rejected'::text])));
ALTER TABLE public.pharmacy_direct_sale_items ADD CONSTRAINT pharmacy_direct_sale_items_quantity_check CHECK ((quantity > (0)::numeric));
ALTER TABLE public.pharmacy_racks ADD CONSTRAINT pharmacy_racks_no_of_shelves_check CHECK (((no_of_shelves >= 1) AND (no_of_shelves <= 20)));
ALTER TABLE public.pharmacy_returns ADD CONSTRAINT pharmacy_returns_refund_status_check CHECK ((refund_status = ANY (ARRAY['Pending'::text, 'Partial Refund'::text, 'Refunded'::text])));
ALTER TABLE public.pharmacy_zones ADD CONSTRAINT pharmacy_zones_temperature_check CHECK (((temperature)::text = ANY ((ARRAY['Ambient'::character varying, 'Refrigerated'::character varying, 'Frozen'::character varying, 'Controlled'::character varying])::text[])));
ALTER TABLE public.policy_rules ADD CONSTRAINT policy_rules_rule_type_check CHECK ((rule_type = ANY (ARRAY['SERVICES'::text, 'DRUGS'::text, 'CONSUMABLES'::text, 'ALL'::text])));
ALTER TABLE public.policy_rules ADD CONSTRAINT policy_rules_visit_type_check CHECK ((visit_type = ANY (ARRAY['OP'::text, 'IP'::text, 'ER'::text])));
ALTER TABLE public.procurement_expiry_return_items ADD CONSTRAINT procurement_expiry_return_items_quantity_check CHECK ((quantity >= (0)::numeric));
ALTER TABLE public.procurement_expiry_returns ADD CONSTRAINT procurement_expiry_returns_status_check CHECK (((status)::text = ANY (ARRAY[('Draft'::character varying)::text, ('Submitted'::character varying)::text])));

-- =============================================================
-- SECTION 6: FOREIGN KEY CONSTRAINTS
-- =============================================================

ALTER TABLE public.app_users ADD CONSTRAINT app_users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);
ALTER TABLE public.app_users ADD CONSTRAINT app_users_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.service_centres(id);
ALTER TABLE public.app_users ADD CONSTRAINT app_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);
ALTER TABLE public.app_users ADD CONSTRAINT fk_app_users_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.bill_status_history ADD CONSTRAINT bill_status_history_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE;
ALTER TABLE public.bills ADD CONSTRAINT bills_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.bills ADD CONSTRAINT bills_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.employees(id);
ALTER TABLE public.bills ADD CONSTRAINT bills_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE public.bills ADD CONSTRAINT bills_refund_id_fkey FOREIGN KEY (refund_id) REFERENCES public.patient_refunds(id) ON DELETE SET NULL;
ALTER TABLE public.bills ADD CONSTRAINT bills_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.finance_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.clinical_allergies ADD CONSTRAINT clinical_allergies_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE public.credit_memos ADD CONSTRAINT credit_memos_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE RESTRICT;
ALTER TABLE public.credit_memos ADD CONSTRAINT fk_credit_memos_refund_id FOREIGN KEY (refund_id) REFERENCES public.patient_refunds(id) ON DELETE SET NULL;
ALTER TABLE public.doctor_availability ADD CONSTRAINT doctor_availability_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.finance_chart_of_accounts ADD CONSTRAINT finance_chart_of_accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.finance_chart_of_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.finance_journal_voucher_items ADD CONSTRAINT finance_journal_voucher_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_chart_of_accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.finance_journal_voucher_items ADD CONSTRAINT finance_journal_voucher_items_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.finance_journal_vouchers(id) ON DELETE CASCADE;
ALTER TABLE public.insurance_policies ADD CONSTRAINT insurance_policies_insurance_id_fkey FOREIGN KEY (insurance_id) REFERENCES public.finance_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.insurance_policies ADD CONSTRAINT insurance_policies_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.finance_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_batch_locations ADD CONSTRAINT inventory_batch_locations_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_batch_locations ADD CONSTRAINT inventory_batch_locations_rack_id_fkey FOREIGN KEY (rack_id) REFERENCES public.pharmacy_racks(id);
ALTER TABLE public.inventory_batch_locations ADD CONSTRAINT inventory_batch_locations_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_batch_locations ADD CONSTRAINT inventory_batch_locations_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.pharmacy_zones(id);
ALTER TABLE public.inventory_item_pricing ADD CONSTRAINT inventory_item_pricing_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_item_stocks ADD CONSTRAINT inventory_item_stocks_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_opening_stock_items ADD CONSTRAINT inventory_opening_stock_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_opening_stock_items ADD CONSTRAINT inventory_opening_stock_items_opening_stock_id_fkey FOREIGN KEY (opening_stock_id) REFERENCES public.inventory_opening_stocks(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_opening_stocks ADD CONSTRAINT inventory_opening_stocks_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_stock_ledger ADD CONSTRAINT inventory_stock_ledger_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_stock_ledger ADD CONSTRAINT inventory_stock_ledger_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.item_tax_mappings ADD CONSTRAINT item_tax_mappings_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.item_tax_mappings ADD CONSTRAINT item_tax_mappings_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.tax_masters(id) ON DELETE CASCADE;
ALTER TABLE public.lab_reagent_consumption_log ADD CONSTRAINT lab_reagent_consumption_log_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);
ALTER TABLE public.lab_reagent_consumption_log ADD CONSTRAINT lab_reagent_consumption_log_lab_order_id_fkey FOREIGN KEY (lab_order_id) REFERENCES public.lims_lab_orders(id) ON DELETE CASCADE;
ALTER TABLE public.lab_reagent_consumption_log ADD CONSTRAINT lab_reagent_consumption_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.app_users(id);
ALTER TABLE public.lab_reagent_consumption_log ADD CONSTRAINT lab_reagent_consumption_log_reversed_by_log_id_fkey FOREIGN KEY (reversed_by_log_id) REFERENCES public.lab_reagent_consumption_log(id);
ALTER TABLE public.lab_reagent_consumption_log ADD CONSTRAINT lab_reagent_consumption_log_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_definitions(id);
ALTER TABLE public.lab_reagent_consumption_log ADD CONSTRAINT lab_reagent_consumption_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);
ALTER TABLE public.lab_service_import_log ADD CONSTRAINT lab_service_import_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.app_users(id);
ALTER TABLE public.lab_service_profile_components ADD CONSTRAINT lab_service_profile_components_component_service_id_fkey FOREIGN KEY (component_service_id) REFERENCES public.service_definitions(id) ON DELETE RESTRICT;
ALTER TABLE public.lab_service_profile_components ADD CONSTRAINT lab_service_profile_components_profile_service_id_fkey FOREIGN KEY (profile_service_id) REFERENCES public.service_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.lab_service_reagents ADD CONSTRAINT lab_service_reagents_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public.lab_service_reagents ADD CONSTRAINT lab_service_reagents_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.lab_service_reagents ADD CONSTRAINT lab_service_reagents_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
ALTER TABLE public.lab_service_reagents ADD CONSTRAINT lab_service_reagents_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
ALTER TABLE public.lims_lab_orders ADD CONSTRAINT lims_lab_orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_definitions(id);
ALTER TABLE public.lims_lab_orders ADD CONSTRAINT lims_lab_orders_service_order_id_fkey FOREIGN KEY (service_order_id) REFERENCES public.service_orders(id) ON DELETE CASCADE;
ALTER TABLE public.lims_lab_orders ADD CONSTRAINT lims_lab_orders_source_profile_service_id_fkey FOREIGN KEY (source_profile_service_id) REFERENCES public.service_definitions(id);
ALTER TABLE public.lims_parameter_options ADD CONSTRAINT lims_parameter_options_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lims_service_parameters(id) ON DELETE CASCADE;
ALTER TABLE public.lims_reference_ranges ADD CONSTRAINT lims_reference_ranges_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.lims_equipment(id);
ALTER TABLE public.lims_reference_ranges ADD CONSTRAINT lims_reference_ranges_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lims_service_parameters(id) ON DELETE CASCADE;
ALTER TABLE public.lims_reference_remarks ADD CONSTRAINT lims_reference_remarks_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.lims_equipment(id) ON DELETE SET NULL;
ALTER TABLE public.lims_reference_remarks ADD CONSTRAINT lims_reference_remarks_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lims_service_parameters(id) ON DELETE SET NULL;
ALTER TABLE public.lims_reference_remarks ADD CONSTRAINT lims_reference_remarks_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.lims_results ADD CONSTRAINT lims_results_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.lims_equipment(id);
ALTER TABLE public.lims_results ADD CONSTRAINT lims_results_lab_order_id_fkey FOREIGN KEY (lab_order_id) REFERENCES public.lims_lab_orders(id) ON DELETE CASCADE;
ALTER TABLE public.lims_results ADD CONSTRAINT lims_results_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lims_service_parameters(id) ON DELETE CASCADE;
ALTER TABLE public.lims_samples ADD CONSTRAINT lims_samples_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.lims_containers(id);
ALTER TABLE public.lims_samples ADD CONSTRAINT lims_samples_lab_order_id_fkey FOREIGN KEY (lab_order_id) REFERENCES public.lims_lab_orders(id) ON DELETE CASCADE;
ALTER TABLE public.lims_samples ADD CONSTRAINT lims_samples_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.employees(id);
ALTER TABLE public.lims_samples ADD CONSTRAINT lims_samples_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.employees(id);
ALTER TABLE public.lims_samples ADD CONSTRAINT lims_samples_specimen_id_fkey FOREIGN KEY (specimen_id) REFERENCES public.lims_specimens(id);
ALTER TABLE public.lims_service_configs ADD CONSTRAINT lims_service_configs_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.lims_containers(id) ON DELETE SET NULL;
ALTER TABLE public.lims_service_configs ADD CONSTRAINT lims_service_configs_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.lims_service_configs ADD CONSTRAINT lims_service_configs_specimen_id_fkey FOREIGN KEY (specimen_id) REFERENCES public.lims_specimens(id) ON DELETE SET NULL;
ALTER TABLE public.lims_service_parameters ADD CONSTRAINT lims_service_parameters_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.lims_service_parameters(id) ON DELETE SET NULL;
ALTER TABLE public.lims_service_parameters ADD CONSTRAINT lims_service_parameters_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.lims_test_results ADD CONSTRAINT lims_test_results_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.lims_equipment(id);
ALTER TABLE public.lims_test_results ADD CONSTRAINT lims_test_results_lab_order_id_fkey FOREIGN KEY (lab_order_id) REFERENCES public.lims_lab_orders(id) ON DELETE CASCADE;
ALTER TABLE public.lims_test_results ADD CONSTRAINT lims_test_results_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lims_service_parameters(id) ON DELETE CASCADE;
ALTER TABLE public.lims_test_results ADD CONSTRAINT lims_test_results_result_by_fkey FOREIGN KEY (result_by) REFERENCES public.employees(id);
ALTER TABLE public.loyalty_accounts ADD CONSTRAINT loyalty_accounts_current_tier_fkey FOREIGN KEY (current_tier) REFERENCES public.loyalty_tiers(tier_name);
ALTER TABLE public.loyalty_sms_log ADD CONSTRAINT loyalty_sms_log_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.loyalty_accounts(id);
ALTER TABLE public.loyalty_tier_history ADD CONSTRAINT loyalty_tier_history_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.loyalty_accounts(id);
ALTER TABLE public.loyalty_transactions ADD CONSTRAINT loyalty_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.loyalty_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.patient_refunds ADD CONSTRAINT patient_refunds_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE public.pharmacy_direct_sale_items ADD CONSTRAINT pharmacy_direct_sale_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public.pharmacy_direct_sale_items ADD CONSTRAINT pharmacy_direct_sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.pharmacy_direct_sales(id) ON DELETE CASCADE;
ALTER TABLE public.pharmacy_direct_sales ADD CONSTRAINT pharmacy_direct_sales_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
ALTER TABLE public.pharmacy_drug_master ADD CONSTRAINT pharmacy_drug_master_generic_id_fkey FOREIGN KEY (generic_id) REFERENCES public.pharmacy_drug_generics(id) ON DELETE SET NULL;
ALTER TABLE public.pharmacy_drug_master ADD CONSTRAINT pharmacy_drug_master_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.pharmacy_racks ADD CONSTRAINT pharmacy_racks_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.pharmacy_zones(id) ON DELETE CASCADE;
ALTER TABLE public.pharmacy_return_items ADD CONSTRAINT pharmacy_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.pharmacy_returns(id) ON DELETE CASCADE;
ALTER TABLE public.pharmacy_returns ADD CONSTRAINT pharmacy_returns_refund_id_fkey FOREIGN KEY (refund_id) REFERENCES public.patient_refunds(id) ON DELETE SET NULL;
ALTER TABLE public.pharmacy_zones ADD CONSTRAINT pharmacy_zones_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.policy_mapped_branches ADD CONSTRAINT policy_mapped_branches_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.insurance_policies(id) ON DELETE CASCADE;
ALTER TABLE public.policy_patient_max_amounts ADD CONSTRAINT policy_patient_max_amounts_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.insurance_policies(id) ON DELETE CASCADE;
ALTER TABLE public.policy_rules ADD CONSTRAINT policy_rules_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.insurance_policies(id) ON DELETE CASCADE;
ALTER TABLE public.prescription_items ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;
ALTER TABLE public.procurement_expiry_return_items ADD CONSTRAINT procurement_expiry_return_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_expiry_return_items ADD CONSTRAINT procurement_expiry_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.procurement_expiry_returns(id) ON DELETE CASCADE;
ALTER TABLE public.procurement_expiry_returns ADD CONSTRAINT procurement_expiry_returns_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_expiry_returns ADD CONSTRAINT procurement_expiry_returns_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.procurement_vendors(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_grn_items ADD CONSTRAINT procurement_grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.procurement_grns(id) ON DELETE CASCADE;
ALTER TABLE public.procurement_grn_items ADD CONSTRAINT procurement_grn_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_grns ADD CONSTRAINT procurement_grns_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.procurement_purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE public.procurement_grns ADD CONSTRAINT procurement_grns_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_grns ADD CONSTRAINT procurement_grns_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.procurement_vendors(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_gstr2b_invoices ADD CONSTRAINT procurement_gstr2b_invoices_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.procurement_gstr2b_uploads(id) ON DELETE CASCADE;
ALTER TABLE public.procurement_purchase_order_items ADD CONSTRAINT procurement_purchase_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_purchase_order_items ADD CONSTRAINT procurement_purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.procurement_purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE public.procurement_purchase_orders ADD CONSTRAINT procurement_purchase_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_purchase_orders ADD CONSTRAINT procurement_purchase_orders_tax_code_fkey FOREIGN KEY (tax_code) REFERENCES public.tax_masters(id) ON DELETE SET NULL;
ALTER TABLE public.procurement_purchase_orders ADD CONSTRAINT procurement_purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.procurement_vendors(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_purchase_receipt_items ADD CONSTRAINT procurement_purchase_receipt_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_purchase_receipt_items ADD CONSTRAINT procurement_purchase_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.procurement_purchase_receipts(id) ON DELETE CASCADE;
ALTER TABLE public.procurement_purchase_receipts ADD CONSTRAINT procurement_purchase_receipts_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.procurement_grns(id) ON DELETE SET NULL;
ALTER TABLE public.procurement_purchase_receipts ADD CONSTRAINT procurement_purchase_receipts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_purchase_receipts ADD CONSTRAINT procurement_purchase_receipts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.procurement_vendors(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_purchase_return_items ADD CONSTRAINT procurement_purchase_return_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_purchase_return_items ADD CONSTRAINT procurement_purchase_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.procurement_purchase_returns(id) ON DELETE CASCADE;
ALTER TABLE public.procurement_purchase_returns ADD CONSTRAINT procurement_purchase_returns_source_grn_id_fkey FOREIGN KEY (source_grn_id) REFERENCES public.procurement_grns(id) ON DELETE SET NULL;
ALTER TABLE public.procurement_purchase_returns ADD CONSTRAINT procurement_purchase_returns_source_prn_id_fkey FOREIGN KEY (source_prn_id) REFERENCES public.procurement_purchase_receipts(id) ON DELETE SET NULL;
ALTER TABLE public.procurement_purchase_returns ADD CONSTRAINT procurement_purchase_returns_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_purchase_returns ADD CONSTRAINT procurement_purchase_returns_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.procurement_vendors(id) ON DELETE RESTRICT;
ALTER TABLE public.procurement_vendor_terms ADD CONSTRAINT procurement_vendor_terms_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.procurement_vendors(id) ON DELETE CASCADE;
ALTER TABLE public.role_privileges ADD CONSTRAINT role_privileges_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE public.role_privileges ADD CONSTRAINT role_privileges_screen_id_fkey FOREIGN KEY (screen_id) REFERENCES public.screens(id) ON DELETE CASCADE;
ALTER TABLE public.schedule_templates ADD CONSTRAINT schedule_templates_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.service_approvals ADD CONSTRAINT service_approvals_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.service_orders(id) ON DELETE CASCADE;
ALTER TABLE public.service_approvals ADD CONSTRAINT service_approvals_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.finance_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.service_location_mappings ADD CONSTRAINT service_location_mappings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.service_location_mappings ADD CONSTRAINT service_location_mappings_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.service_location_mappings ADD CONSTRAINT service_location_mappings_service_centre_id_fkey FOREIGN KEY (service_centre_id) REFERENCES public.service_centres(id) ON DELETE CASCADE;
ALTER TABLE public.service_location_mappings ADD CONSTRAINT service_location_mappings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.service_orders ADD CONSTRAINT fk_service_orders_appointment FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_ordering_doctor_id_fkey FOREIGN KEY (ordering_doctor_id) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_definitions(id) ON DELETE SET NULL;
ALTER TABLE public.service_tariffs ADD CONSTRAINT service_tariffs_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_definitions(id) ON DELETE CASCADE;
ALTER TABLE public.sponsor_tariffs ADD CONSTRAINT sponsor_tariffs_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.finance_organizations(id) ON DELETE CASCADE;
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT stock_transfer_items_destination_ledger_id_fkey FOREIGN KEY (destination_ledger_id) REFERENCES public.inventory_stock_ledger(id);
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT stock_transfer_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT stock_transfer_items_source_ledger_id_fkey FOREIGN KEY (source_ledger_id) REFERENCES public.inventory_stock_ledger(id);
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT stock_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id) ON DELETE CASCADE;
ALTER TABLE public.stock_transfer_items ADD CONSTRAINT stock_transfer_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.app_users(id);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_destination_store_id_fkey FOREIGN KEY (destination_store_id) REFERENCES public.stores(id);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.app_users(id);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_source_store_id_fkey FOREIGN KEY (source_store_id) REFERENCES public.stores(id);
ALTER TABLE public.store_item_mappings ADD CONSTRAINT store_item_mappings_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE public.store_item_mappings ADD CONSTRAINT store_item_mappings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.stores ADD CONSTRAINT stores_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.stores ADD CONSTRAINT stores_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.user_privilege_overrides ADD CONSTRAINT user_privilege_overrides_screen_id_fkey FOREIGN KEY (screen_id) REFERENCES public.screens(id) ON DELETE CASCADE;
ALTER TABLE public.user_privilege_overrides ADD CONSTRAINT user_privilege_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE public.vital_sign_parameters ADD CONSTRAINT vital_sign_parameters_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.vital_sign_groups(id) ON DELETE CASCADE;

-- =============================================================
-- SECTION 7: INDEXES
-- =============================================================

CREATE INDEX idx_app_users_department_id ON public.app_users USING btree (department_id);
CREATE INDEX idx_app_users_location_id ON public.app_users USING btree (location_id);
CREATE INDEX idx_app_users_role_id ON public.app_users USING btree (role_id);
CREATE INDEX idx_appointments_date ON public.appointments USING btree (date);
CREATE INDEX idx_appointments_doctor ON public.appointments USING btree (doctor_id);
CREATE INDEX idx_appointments_patient ON public.appointments USING btree (patient_id);
CREATE INDEX idx_status_hist_bill ON public.bill_status_history USING btree (bill_id);
CREATE INDEX idx_bills_branch_id ON public.bills USING btree (branch_id);
CREATE INDEX idx_bills_patient ON public.bills USING btree (patient_id);
CREATE INDEX idx_bills_sponsor_id ON public.bills USING btree (sponsor_id);
CREATE INDEX idx_bills_status ON public.bills USING btree (status);
CREATE INDEX idx_clinical_allergies_patient ON public.clinical_allergies USING btree (patient_id);
CREATE INDEX idx_clinical_diagnoses_appt ON public.clinical_diagnoses USING btree (appointment_id);
CREATE INDEX idx_clinical_notes_appt ON public.clinical_notes USING btree (appointment_id);
CREATE INDEX idx_clinical_vitals_appt ON public.clinical_vitals USING btree (appointment_id);
CREATE INDEX idx_credit_memos_bill ON public.credit_memos USING btree (bill_id);
CREATE INDEX idx_doctor_schedules_day_type ON public.doctor_schedules USING btree (doctor_id, day_of_week, slot_type) WHERE ((slot_type = 'available'::text) AND (is_active = true));
CREATE INDEX idx_doctor_schedules_doctor_id ON public.doctor_schedules USING btree (doctor_id);
CREATE INDEX idx_employees_dept ON public.employees USING btree (department_id);
CREATE INDEX idx_chart_of_accounts_code ON public.finance_chart_of_accounts USING btree (code);
CREATE INDEX idx_chart_of_accounts_parent ON public.finance_chart_of_accounts USING btree (parent_id);
CREATE INDEX idx_journal_voucher_items_hdr ON public.finance_journal_voucher_items USING btree (voucher_id);
CREATE INDEX idx_journal_vouchers_no ON public.finance_journal_vouchers USING btree (voucher_no);
CREATE INDEX idx_finance_organizations_code ON public.finance_organizations USING btree (code);
CREATE INDEX idx_finance_organizations_name ON public.finance_organizations USING btree (name);
CREATE INDEX idx_batch_locations_primary_lookup ON public.inventory_batch_locations USING btree (store_id, item_id, batch_no) WHERE (is_primary = true);
CREATE INDEX idx_batch_locations_store ON public.inventory_batch_locations USING btree (store_id);
CREATE INDEX idx_loyalty_accounts_last_txn ON public.loyalty_accounts USING btree (last_transaction_date) WHERE ((account_status)::text = 'Active'::text);
CREATE INDEX idx_loyalty_accounts_mobile ON public.loyalty_accounts USING btree (mobile);
CREATE INDEX idx_loyalty_accounts_patient_id ON public.loyalty_accounts USING btree (patient_id) WHERE (patient_id IS NOT NULL);
CREATE INDEX idx_loyalty_transactions_account ON public.loyalty_transactions USING btree (account_id, transaction_date DESC);
CREATE INDEX idx_loyalty_transactions_bill_ref ON public.loyalty_transactions USING btree (reference_bill_no) WHERE (reference_bill_no IS NOT NULL);
CREATE INDEX idx_master_diagnoses_code ON public.master_diagnoses USING btree (code);
CREATE INDEX idx_master_diagnoses_desc ON public.master_diagnoses USING btree (description);
CREATE INDEX idx_pat_dem_abha_address ON public.patient_demographics USING btree (abha_address);
CREATE INDEX idx_pat_dem_mobile ON public.patient_demographics USING btree (mobile);
CREATE INDEX idx_patients_name ON public.patients USING btree (last_name);
CREATE INDEX idx_policy_mapped_branches_policy ON public.policy_mapped_branches USING btree (policy_id);
CREATE INDEX idx_policy_patient_max_amounts_policy ON public.policy_patient_max_amounts USING btree (policy_id);
CREATE INDEX idx_policy_rules_policy ON public.policy_rules USING btree (policy_id);
CREATE INDEX idx_prescription_items_prescription ON public.prescription_items USING btree (prescription_id);
CREATE INDEX idx_prescriptions_appointment ON public.prescriptions USING btree (appointment_id);
CREATE INDEX idx_prescriptions_patient ON public.prescriptions USING btree (patient_id);
CREATE INDEX idx_prescriptions_status ON public.prescriptions USING btree (status);
CREATE INDEX idx_procurement_expiry_items ON public.procurement_expiry_return_items USING btree (return_id);
CREATE INDEX idx_procurement_expiry_store ON public.procurement_expiry_returns USING btree (store_id);
CREATE INDEX idx_procurement_expiry_vendor ON public.procurement_expiry_returns USING btree (vendor_id);
CREATE INDEX idx_procurement_grn_items ON public.procurement_grn_items USING btree (grn_id);
CREATE INDEX idx_procurement_grn_po ON public.procurement_grns USING btree (po_id);
CREATE INDEX idx_procurement_grn_store ON public.procurement_grns USING btree (store_id);
CREATE INDEX idx_procurement_grn_vendor ON public.procurement_grns USING btree (vendor_id);
CREATE INDEX idx_gstr2b_invoices_no ON public.procurement_gstr2b_invoices USING btree (invoice_no);
CREATE INDEX idx_gstr2b_invoices_upload ON public.procurement_gstr2b_invoices USING btree (upload_id);
CREATE INDEX idx_procurement_po_items ON public.procurement_purchase_order_items USING btree (po_id);
CREATE INDEX idx_procurement_po_store ON public.procurement_purchase_orders USING btree (store_id);
CREATE INDEX idx_procurement_po_vendor ON public.procurement_purchase_orders USING btree (vendor_id);
CREATE INDEX idx_procurement_prn_items ON public.procurement_purchase_receipt_items USING btree (receipt_id);
CREATE INDEX idx_procurement_prn_grn ON public.procurement_purchase_receipts USING btree (grn_id);
CREATE INDEX idx_procurement_prn_store ON public.procurement_purchase_receipts USING btree (store_id);
CREATE INDEX idx_procurement_prn_vendor ON public.procurement_purchase_receipts USING btree (vendor_id);
CREATE INDEX idx_procurement_return_items ON public.procurement_purchase_return_items USING btree (return_id);
CREATE INDEX idx_procurement_return_grn ON public.procurement_purchase_returns USING btree (source_grn_id);
CREATE INDEX idx_procurement_return_prn ON public.procurement_purchase_returns USING btree (source_prn_id);
CREATE INDEX idx_procurement_return_store ON public.procurement_purchase_returns USING btree (store_id);
CREATE INDEX idx_procurement_return_vendor ON public.procurement_purchase_returns USING btree (vendor_id);
CREATE INDEX idx_procurement_vendor_terms_vendor ON public.procurement_vendor_terms USING btree (vendor_id);
CREATE INDEX idx_procurement_vendors_code ON public.procurement_vendors USING btree (code);
CREATE INDEX idx_role_privileges_role_id ON public.role_privileges USING btree (role_id);
CREATE INDEX idx_role_privileges_screen_id ON public.role_privileges USING btree (screen_id);
CREATE INDEX idx_service_approvals_order ON public.service_approvals USING btree (order_id);
CREATE INDEX idx_service_defs_code ON public.service_definitions USING btree (code);
CREATE INDEX idx_service_orders_appt ON public.service_orders USING btree (appointment_id);
CREATE INDEX idx_sponsor_tariffs_lookup ON public.sponsor_tariffs USING btree (sponsor_id, item_type, item_code, class_name);
CREATE INDEX idx_user_overrides_screen_id ON public.user_privilege_overrides USING btree (screen_id);
CREATE INDEX idx_user_overrides_user_id ON public.user_privilege_overrides USING btree (user_id);
