-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Departments
create table if not exists departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null,
  status text default 'Active'
);

-- 2. Employees (Doctors & Staff)
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  role text not null, -- 'Doctor', 'Nurse', 'Admin', 'Receptionist'
  department_id uuid references departments(id),
  specialization text,
  status text default 'Active'
);

-- 3. App Users (for Login)
create table if not exists app_users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password text not null, -- Plain text for demo simplicity, use hashing in prod
  role text not null,
  full_name text,
  employee_id uuid references employees(id)
);

-- 4. Patients
create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  dob date,
  gender text,
  phone text,
  email text,
  address text,
  registration_date timestamp with time zone default now()
);

-- 5. Appointments
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id),
  doctor_id uuid references employees(id),
  department_id uuid references departments(id),
  date text not null, -- YYYY-MM-DD
  time text not null, -- HH:MM
  status text default 'Scheduled', -- 'Scheduled', 'Completed', 'Cancelled', 'No Show'
  symptoms text,
  notes text,
  visit_type text, -- 'New Visit', 'Follow-up'
  payment_mode text,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone
);

-- 6. Doctor Availability
create table if not exists doctor_availability (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid references employees(id),
  day_of_week text not null, -- 'Monday', etc.
  start_time text not null,
  end_time text not null,
  slot_duration_minutes integer default 15
);

-- 7. Bills
create table if not exists bills (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id),
  appointment_id uuid references appointments(id),
  date timestamp with time zone default now(),
  status text default 'Unpaid', -- 'Unpaid', 'Paid', 'Partial', 'Cancelled'
  total_amount numeric(10,2) default 0,
  paid_amount numeric(10,2) default 0,
  tax_amount numeric(10,2) default 0,
  invoice_no text,
  discount_amount numeric(10,2) default 0,
  round_off numeric(10,2) default 0,
  doctor_id text references employees(id),
  department_id text references departments(id),
  payment_mode text,
  amount_received numeric(10,2) default 0,
  reference_no text,
  notes text,
  created_by text,
  is_pharmacy boolean default false,
  prescription_id uuid
);

-- 8. Bill Items
create table if not exists bill_items (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid references bills(id) on delete cascade,
  item_id uuid,
  batch_no text,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(10,2) default 0,
  tax_percentage numeric(5,2) default 0,
  tax_amount numeric(10,2) default 0,
  total numeric(10,2) default 0,
  item_type text,
  discount_percentage numeric(5,2) default 0,
  discount_amount numeric(10,2) default 0
);

-- 9. Payments
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid references bills(id),
  date timestamp with time zone default now(),
  amount numeric(10,2) not null,
  method text, -- 'Cash', 'Card', 'Insurance'
  reference text
);

-- 10. Clinical Vitals
create table if not exists clinical_vitals (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id),
  recorded_at timestamp with time zone default now(),
  bp_systolic integer,
  bp_diastolic integer,
  temperature numeric(5,2),
  pulse integer,
  respiratory_rate integer,
  weight numeric(5,2),
  height numeric(5,2),
  bmi numeric(5,2),
  spo2 integer,
  map integer,
  tobacco_use text,
  row_remarks text
);

-- 11. Clinical Diagnoses
create table if not exists clinical_diagnoses (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id),
  code text,
  icd_code text,
  description text,
  type text, -- 'Principal', 'Secondary'
  is_poa boolean default false,
  added_at timestamp with time zone default now()
);

-- 12. Clinical Notes
create table if not exists clinical_notes (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id),
  note_type text, -- 'Chief Complaint', 'History', 'Examination', 'Plan'
  description text,
  recorded_at timestamp with time zone default now()
);

-- 13. Clinical Allergies
create table if not exists clinical_allergies (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id),
  allergen text not null,
  severity text, -- 'Mild', 'Moderate', 'Severe'
  reaction text,
  status text default 'Active',
  allergy_type text,
  onset_date date,
  resolved_date date,
  remarks text
);

-- 14. Narrative Diagnoses
create table if not exists clinical_narrative_diagnoses (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id),
  illness text,
  illness_duration_value integer,
  illness_duration_unit text,
  behavioural_activity text,
  narrative text,
  recorded_at timestamp with time zone default now()
);

-- 15. Master Diagnoses (ICD-10 or similar)
create table if not exists master_diagnoses (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  description text not null,
  status text default 'Active'
);

-- 16. Service Definitions
create table if not exists service_definitions (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  alternate_name text,
  service_type text,
  service_category text,
  est_duration integer,
  status text default 'Active',
  chargeable boolean default true,
  applicable_visit_type text,
  applicable_gender text,
  re_order_duration integer,
  auto_cancellation_days integer,
  min_time_billing integer,
  max_time_billing integer,
  max_orderable_qty integer,
  cpt_code text,
  nphies_code text,
  nphies_desc text,
  schedulable boolean default false,
  surgical_service boolean default false,
  individually_orderable boolean default true,
  auto_processable boolean default false,
  consent_required boolean default false,
  is_restricted boolean default false,
  is_external boolean default false,
  is_percentage_tariff boolean default false,
  is_tooth_mandatory boolean default false,
  is_auth_required boolean default false,
  group_name text,
  billing_group_name text,
  financial_group text,
  cpt_description text,
  special_instructions text
);

-- 17. Service Tariffs
create table if not exists service_tariffs (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid references service_definitions(id) on delete cascade,
  tariff_name text not null,
  price numeric(10,2) default 0,
  effective_date date,
  status text default 'Active'
);

-- 18. Service Orders
create table if not exists service_orders (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id),
  service_id uuid references service_definitions(id),
  service_name text,
  cpt_code text,
  quantity numeric(10,2) default 1,
  unit_price numeric(10,2) default 0,
  discount_amount numeric(10,2) default 0,
  total_price numeric(10,2) default 0,
  order_date timestamp with time zone default now(),
  status text default 'Ordered', -- 'Ordered', 'Completed', 'Cancelled'
  billing_status text default 'Pending', -- 'Pending', 'Invoiced'
  priority text,
  ordering_doctor_id uuid references employees(id),
  instructions text,
  service_center text
);

-- 19. Units
create table if not exists units (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text,
  status text default 'Active'
);

-- 20. Service Centres
create table if not exists service_centres (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text,
  status text default 'Active'
);

-- Seed Initial Admin User
insert into app_users (username, password, role, full_name)
values ('admin', 'admin123', 'Administrator', 'System Admin')
on conflict (username) do nothing;

-- 21. Branches (Hospital/Organization Level)
create table if not exists branches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique,
  status text default 'Active'
);

-- Seed Initial Branches
insert into branches (name, code)
values ('Main Hospital', 'HOSP-001'), ('District Branch', 'HOSP-002')
on conflict (code) do nothing;

-- 22. Inventory Items
create table if not exists inventory_items (
  id uuid primary key default uuid_generate_v4(),
  item_code text unique not null,
  item_name text not null,
  item_description text,
  arabic_name text,
  item_type text,
  item_category text,
  item_group text,
  item_class text,
  stock_type text default 'Stock',
  procurement_type text default 'Local',
  base_uom text default 'EACH',
  track_uom text default 'EACH',
  distribution_category text default 'Unit',
  purchase_organisation text,
  shelf_life_limit numeric(10,2),
  item_specification text,
  sfda text,
  gtin text,
  nphies_drug_type text,
  is_inventorised boolean default true,
  is_batch_tracked boolean default true,
  is_expiry_date_required boolean default true,
  is_serialized boolean default false,
  is_active boolean default true,
  is_approval_required boolean default true,
  is_insurance_cover boolean default true,
  drug_sub_groups text,
  purchase_uom text default 'EACH',
  sales_uom text default 'EACH',
  default_pricing_method text default 'MRP',
  default_markup_percentage numeric(10,2) default 0,
  branch text, -- Optional singluar branch reference
  purchase_inventory_acc text,
  cost_of_sales_acc text,
  sale_account text,
  reorder_level numeric(10,2) default 50,
  min_stock_level numeric(10,2) default 10,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 23. Inventory Item Stocks (Sub-tab: Stock)
create table if not exists inventory_item_stocks (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references inventory_items(id) on delete cascade,
  ved_category text,
  is_reusable boolean default false,
  item_rate numeric(10,2) default 1.0,
  fsn_type text,
  is_bulky boolean default false,
  cycle_count_frequency text,
  reusable_count integer default 0,
  reserved_qty numeric(10,2) default 0,
  manufacturer_name text
);

-- 24. Inventory Item Pricing (Sub-tab: Pricing Method)
create table if not exists inventory_item_pricing (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references inventory_items(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  branch_name text,
  pricing_method text default 'MRP',
  price numeric(15,2) default 0,
  markup_percentage numeric(5,2) default 0,
  unique(item_id, branch_id)
);

-- 25. Stores Master
create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  store_code text unique not null,
  store_name text not null,
  branch_id uuid references branches(id) on delete cascade,
  status text default 'Active',
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 26. Store Item Mappings
create table if not exists store_item_mappings (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  item_id uuid references inventory_items(id) on delete cascade,
  unique(store_id, item_id)
);

-- 27. Inventory Opening Stocks
create table if not exists inventory_opening_stocks (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  entry_date date default CURRENT_DATE,
  status text default 'Draft',
  created_at timestamp with time zone default now()
);

-- 28. Inventory Opening Stock Items
create table if not exists inventory_opening_stock_items (
  id uuid primary key default uuid_generate_v4(),
  opening_stock_id uuid references inventory_opening_stocks(id) on delete cascade,
  item_id uuid references inventory_items(id) on delete cascade,
  item_code text,
  item_name text,
  item_category text,
  batch_no text,
  batch_start_date date,
  batch_end_date date,
  quantity numeric(10,2) default 0,
  rate numeric(15,2) default 0,
  amount numeric(15,2) default 0,
  mrp numeric(15,2) default 0,
  created_at timestamp with time zone default now()
);

-- 29. Inventory Stock Ledger
create table if not exists inventory_stock_ledger (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  item_id uuid references inventory_items(id) on delete cascade,
  transaction_type text not null, -- 'STOCKIN', 'STOCKOUT'
  ref_type text, -- e.g., 'OPENING STOCK', 'GOOD RECEIPT NOTE'
  ref_doc_no text, -- e.g., 'OPS-DMM...', 'GRN-DMM...'
  ref_doc_date timestamp with time zone default now(),
  stock_in_quantity numeric(10,2) default 0,
  stock_out_quantity numeric(10,2) default 0,
  closing_stock numeric(10,2) default 0,
  closing_stock_rate numeric(15,2) default 0,
  closing_stock_value numeric(15,2) default 0,
  currency text default 'SAR',
  batch_no text,
  batch_date date,
  expiry_date date,
  created_at timestamp with time zone default now()
);

-- 30. Pharmacy: Drug Generic Master
create table if not exists pharmacy_drug_generics (
  id uuid primary key default uuid_generate_v4(),
  generic_code text unique not null,
  generic_name text not null,
  group_name text,
  available_forms text,       -- e.g. 'Tablet, Capsule, Syrup'
  strength text,              -- e.g. '500mg', '250mg/5ml'
  form_of_administration text,-- e.g. 'Oral', 'Topical'
  route_of_administration text,-- e.g. 'PO', 'IV', 'IM'
  is_drug_generic boolean default true,
  is_antibiotic boolean default false,
  is_narcotic boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 31. Pharmacy: Drug Master (links inventory items to drug generics)
create table if not exists pharmacy_drug_master (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references inventory_items(id) on delete cascade,
  item_code text not null,
  drug_name text not null,
  generic_id uuid references pharmacy_drug_generics(id) on delete set null,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 32. Pharmacy: Direct Sale
create table if not exists pharmacy_direct_sales (
  id uuid primary key default uuid_generate_v4(),
  sale_no text unique not null,
  sale_date timestamp with time zone default now(),
  store_id uuid references stores(id) on delete restrict,
  
  -- Patient Information (Local for direct sale)
  first_name text not null,
  middle_name text,
  last_name text,
  phone_no text,
  external_no text, -- External Patient ID
  dob date,
  age numeric,
  age_unit text default 'Years',
  gender text,
  referred_doctor text,
  license_no text,
  nationality text default 'SAUDI',
  is_insured boolean default false,
  is_new_external_patient boolean default true,
  
  total_amount numeric(15,2) default 0,
  tax_amount numeric(15,2) default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 33. Pharmacy: Direct Sale Items
create table if not exists pharmacy_direct_sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references pharmacy_direct_sales(id) on delete cascade,
  item_id uuid references inventory_items(id) on delete restrict,
  batch_no text not null,
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(15,2) not null, -- MRP
  tax_percentage numeric(5,2) default 0,
  tax_amount numeric(15,2) default 0,
  total_price numeric(15,2) not null,
  expiry_date date,
  created_at timestamp with time zone default now()
);
-- 34. Prescriptions and Dispensing
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id TEXT REFERENCES appointments(id),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES employees(id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_type TEXT, -- Generic / Item, IV Fluid, TPN
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partially Dispensed', 'Dispensed', 'Cancelled')),
    total_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 35. Prescription Items
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    generic_name TEXT,
    item_id UUID REFERENCES inventory_items(id),
    frequency TEXT,
    dose TEXT,
    units TEXT,
    intake_qty DECIMAL(10,2),
    start_date DATE,
    no_days INTEGER,
    total_qty DECIMAL(10,2),
    drug_instruction TEXT,
    remarks TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dispensed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);

-- 36. Tax Masters
CREATE TABLE IF NOT EXISTS tax_masters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_name TEXT NOT NULL,
    percentage DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 37. Item Tax Mapping
CREATE TABLE IF NOT EXISTS item_tax_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    tax_id UUID REFERENCES tax_masters(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(item_id, tax_id)
);

-- 38. Pharmacy Returns
CREATE TABLE IF NOT EXISTS pharmacy_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_no TEXT UNIQUE NOT NULL,
    original_bill_id UUID REFERENCES bills(id),
    patient_id UUID REFERENCES patients(id),
    store_id UUID REFERENCES stores(id),
    return_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 39. Pharmacy Return Items
CREATE TABLE IF NOT EXISTS pharmacy_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES pharmacy_returns(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id),
    batch_no TEXT,
    batch_date DATE,
    expiry_date DATE,
    description TEXT,
    quantity DECIMAL(10,2) DEFAULT 0,
    unit_price DECIMAL(12,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 40. Finance Organizations
CREATE TABLE IF NOT EXISTS finance_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    sponsor_type TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 41. Insurance Policies
CREATE TABLE IF NOT EXISTS insurance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_no TEXT UNIQUE NOT NULL,
    policy_name TEXT NOT NULL,
    sponsor_type TEXT NOT NULL CHECK (sponsor_type IN ('TPA', 'Corporate', 'Insurance', 'Self')),
    sponsor_id UUID REFERENCES finance_organizations(id) ON DELETE SET NULL,
    insurance_id UUID REFERENCES finance_organizations(id) ON DELETE SET NULL,
    service_tax TEXT DEFAULT 'VAT 15 PERCENT',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    sponsor_pay_tax BOOLEAN DEFAULT TRUE,
    is_sponsor_price BOOLEAN DEFAULT TRUE,
    patient_amt NUMERIC(10, 2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    restricted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 42. Policy Mapped Branches
CREATE TABLE IF NOT EXISTS policy_mapped_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
    branch_code TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (policy_id, branch_code)
);

-- 43. Policy Rules
CREATE TABLE IF NOT EXISTS policy_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('SERVICES', 'DRUGS', 'CONSUMABLES', 'ALL')),
    visit_type TEXT NOT NULL CHECK (visit_type IN ('OP', 'IP', 'ER')),
    gender TEXT DEFAULT 'All',
    class_name TEXT DEFAULT 'SERVICE_GROUPS',
    tariff_class TEXT DEFAULT 'A+',
    tariff_value TEXT DEFAULT 'A+ Value',
    amount_limit NUMERIC(12, 2) DEFAULT 0.00,
    quantity_limit INT DEFAULT 0,
    patient_copay TEXT DEFAULT '10%',
    sponsor_payment TEXT DEFAULT '90%',
    patient_deductible TEXT DEFAULT '0',
    patient_deductible_type TEXT DEFAULT 'Amt',
    alias_code TEXT,
    alias_name TEXT,
    approval_required BOOLEAN DEFAULT TRUE,
    exclude BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    group_name TEXT DEFAULT 'All',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 44. Patient Max Amounts
CREATE TABLE IF NOT EXISTS policy_patient_max_amounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL DEFAULT 'A+',
    circle_name TEXT DEFAULT 'Corporate',
    branch_code TEXT DEFAULT 'All',
    pat_max_amt NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
    minimum_amt NUMERIC(12, 2) DEFAULT 0.00,
    approval_limit NUMERIC(12, 2) DEFAULT 1500.00,
    visit_type TEXT DEFAULT 'OP',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 45. Sponsor Tariffs
CREATE TABLE IF NOT EXISTS sponsor_tariffs (
    id VARCHAR(100) PRIMARY KEY,
    sponsor_id UUID REFERENCES finance_organizations(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('SERVICES', 'DRUGS', 'CONSUMABLES')),
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    cpt_code VARCHAR(100),
    group_name VARCHAR(100),
    base_tariff NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('Flat', 'Discount %', 'Markup %')),
    tariff_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sponsor_code VARCHAR(100),
    sponsor_description VARCHAR(255),
    class_name VARCHAR(100) NOT NULL DEFAULT 'A+',
    nphies_code VARCHAR(100),
    nphies_desc VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for negotiated rate lookup
CREATE INDEX IF NOT EXISTS idx_sponsor_tariffs_lookup 
ON sponsor_tariffs (sponsor_id, item_type, item_code, class_name);

-- RLS setup for sponsor_tariffs
ALTER TABLE sponsor_tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON sponsor_tariffs
    FOR SELECT USING (true);

CREATE POLICY "Enable all write operations for all users" ON sponsor_tariffs
    FOR ALL TO public USING (true) WITH CHECK (true);

-- 46. Procurement Vendors
CREATE TABLE IF NOT EXISTS procurement_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    vendor_type TEXT NOT NULL, -- e.g., 'Local', 'International', 'Importer'
    billing_structure TEXT, -- e.g., 'Direct', 'Group', 'Consignee'
    currency TEXT NOT NULL DEFAULT 'SAR',
    credit_period TEXT, -- e.g., '30 Days'
    rating TEXT, -- e.g., 'A+', 'Gold'
    payment_term TEXT, -- e.g., 'Net 30', 'Net 60', 'Immediate'
    supplier_sub_type TEXT, -- e.g., 'Distributor', 'Wholesaler', 'Manufacturer'
    pan_no TEXT, -- PAN / Tax ID
    regst_status TEXT NOT NULL, -- e.g., 'Registered', 'Unregistered', 'Suspended'
    account_group TEXT NOT NULL, -- e.g., 'Accounts Payable', 'Trade Creditors'
    tds_type TEXT, -- e.g., 'Standard', 'Zero Rate', 'Exempt'
    export_license TEXT,
    account TEXT,
    remarks TEXT,
    
    -- Checkboxes
    active BOOLEAN DEFAULT true,
    quality_check_required BOOLEAN DEFAULT false,
    suspended BOOLEAN DEFAULT false,
    iso_certified BOOLEAN DEFAULT false,
    is_vat BOOLEAN DEFAULT false,

    -- Bank Details (JSON structure for expandability)
    bank_info JSONB DEFAULT '{}'::jsonb,
    
    -- Registration Details
    registration_details JSONB DEFAULT '{}'::jsonb,

    -- Business & Rating Details
    business_info JSONB DEFAULT '{}'::jsonb,

    -- Contact details
    contact_details JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 47. Procurement Vendor Terms & Conditions
CREATE TABLE IF NOT EXISTS procurement_vendor_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES procurement_vendors(id) ON DELETE CASCADE,
    term_code TEXT NOT NULL,
    term_desc TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_procurement_vendors_code ON procurement_vendors(code);
CREATE INDEX IF NOT EXISTS idx_procurement_vendor_terms_vendor ON procurement_vendor_terms(vendor_id);

-- 48. Procurement Purchase Orders (Header)
CREATE TABLE IF NOT EXISTS procurement_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_no TEXT UNIQUE NOT NULL,
    po_type TEXT NOT NULL DEFAULT 'Direct Purchase Order',
    vendor_id UUID REFERENCES procurement_vendors(id) ON DELETE RESTRICT,
    store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
    ref_doc_date DATE,
    ref_doc_no TEXT,
    purchase_organisation TEXT NOT NULL DEFAULT 'Pharmacy',
    currency_code TEXT NOT NULL DEFAULT 'Saudi Riyal',
    currency_exchange_rate NUMERIC(10, 4) DEFAULT 1.0,
    valid_till DATE,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    tax_code UUID REFERENCES tax_masters(id) ON DELETE SET NULL,
    is_non_stock BOOLEAN DEFAULT false,
    account_code TEXT,
    net_amount NUMERIC(12, 2) DEFAULT 0.00,
    
    -- Tabs Data (JSON for flexibility)
    address_details JSONB DEFAULT '{}'::jsonb,
    other_details JSONB DEFAULT '{}'::jsonb,
    imported_items TEXT,
    
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Approved', 'Cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 49. Procurement Purchase Order Items (Line Items)
CREATE TABLE IF NOT EXISTS procurement_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES procurement_purchase_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    public_price NUMERIC(12, 2) DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    unit_cost NUMERIC(12, 2) NOT NULL,
    is_bulk BOOLEAN DEFAULT false,
    tax_structure TEXT, -- e.g., 'VAT 15%'
    remarks TEXT,
    
    -- Source document tracking references
    source_doc_num TEXT,
    source_doc_date DATE,
    source_quantity NUMERIC(12, 2) DEFAULT 0.00,
    pending_quantity NUMERIC(12, 2) DEFAULT 0.00,
    short_close_quantity NUMERIC(12, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for quick reference lookups
CREATE INDEX IF NOT EXISTS idx_procurement_po_vendor ON procurement_purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_procurement_po_store ON procurement_purchase_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_procurement_po_items ON procurement_purchase_order_items(po_id);

-- 50. Procurement Goods Receipt Notes (GRN Header)
CREATE TABLE IF NOT EXISTS procurement_grns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_no TEXT UNIQUE NOT NULL,
    grn_type TEXT NOT NULL, -- 'From Expiry Item Return', 'From Purchase Order', 'From Letter of Indent', 'Direct', 'From Consignment'
    vendor_id UUID REFERENCES procurement_vendors(id) ON DELETE RESTRICT,
    store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
    po_id UUID REFERENCES procurement_purchase_orders(id) ON DELETE SET NULL,
    gate_entry_date DATE NOT NULL,
    gate_entry_no TEXT NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    net_amount NUMERIC(12, 2) DEFAULT 0.00,
    gross_amount NUMERIC(12, 2) DEFAULT 0.00,
    billing_structure JSONB DEFAULT '{}'::jsonb,
    other_details JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Submitted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 51. Procurement GRN Items (Line Items)
CREATE TABLE IF NOT EXISTS procurement_grn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID REFERENCES procurement_grns(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
    locator TEXT,
    batch_code TEXT NOT NULL,
    batch_date DATE,
    expiry_date DATE NOT NULL,
    po_quantity NUMERIC(12, 2) DEFAULT 0.00,
    received_quantity NUMERIC(12, 2) NOT NULL CHECK (received_quantity >= 0),
    accepted_quantity NUMERIC(12, 2) NOT NULL CHECK (accepted_quantity >= 0),
    rate NUMERIC(12, 2) NOT NULL,
    public_price NUMERIC(12, 2) DEFAULT 0.00,
    unit_cost NUMERIC(12, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    vat_percentage NUMERIC(5, 2) DEFAULT 15.00,
    vat_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    remarks TEXT,
    is_bulky BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_procurement_grn_vendor ON procurement_grns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_procurement_grn_store ON procurement_grns(store_id);
CREATE INDEX IF NOT EXISTS idx_procurement_grn_po ON procurement_grns(po_id);
CREATE INDEX IF NOT EXISTS idx_procurement_grn_items ON procurement_grn_items(grn_id);

-- 52. Procurement Purchase Receipts (PRN Header)
CREATE TABLE IF NOT EXISTS procurement_purchase_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no TEXT UNIQUE NOT NULL,
    receipt_date DATE NOT NULL DEFAULT NOW(),
    grn_id UUID REFERENCES procurement_grns(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES procurement_vendors(id) ON DELETE RESTRICT,
    store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
    tax_profile TEXT,
    net_amount NUMERIC(12, 2) DEFAULT 0.00,
    address_details JSONB DEFAULT '{}'::jsonb,
    reference_details JSONB DEFAULT '{}'::jsonb,
    lc_details JSONB DEFAULT '{}'::jsonb,
    other_details JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Submitted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 53. Procurement Purchase Receipt Items (PRN Line Items)
CREATE TABLE IF NOT EXISTS procurement_purchase_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES procurement_purchase_receipts(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity >= 0),
    remarks TEXT,
    rate NUMERIC(12, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    source_quantity NUMERIC(12, 2) DEFAULT 0.00,
    pending_quantity NUMERIC(12, 2) DEFAULT 0.00,
    already_converted_quantity NUMERIC(12, 2) DEFAULT 0.00,
    batch_details JSONB DEFAULT '{}'::jsonb, -- holds batch code, expiry, locator
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast relational lookups
CREATE INDEX IF NOT EXISTS idx_procurement_prn_vendor ON procurement_purchase_receipts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_procurement_prn_store ON procurement_purchase_receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_procurement_prn_grn ON procurement_purchase_receipts(grn_id);
CREATE INDEX IF NOT EXISTS idx_procurement_prn_items ON procurement_purchase_receipt_items(receipt_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 54. Procurement Purchase Returns (Header)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procurement_purchase_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_no VARCHAR(50) UNIQUE NOT NULL,
    return_date DATE NOT NULL,
    return_type VARCHAR(50) NOT NULL CHECK (return_type IN ('From Purchase Receipt', 'From GRN', 'From Consignment')),
    source_grn_id UUID REFERENCES procurement_grns(id) ON DELETE SET NULL,
    source_prn_id UUID REFERENCES procurement_purchase_receipts(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES procurement_vendors(id) ON DELETE RESTRICT,
    store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
    net_amount NUMERIC(14, 2) DEFAULT 0.00,
    remarks TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 55. Procurement Purchase Return Items (Line Items)
CREATE TABLE IF NOT EXISTS procurement_purchase_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES procurement_purchase_returns(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity >= 0),
    rate NUMERIC(12, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    source_quantity NUMERIC(12, 2) DEFAULT 0.00,
    return_reason TEXT,
    batch_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Purchase Returns
CREATE INDEX IF NOT EXISTS idx_procurement_return_vendor ON procurement_purchase_returns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_procurement_return_store ON procurement_purchase_returns(store_id);
CREATE INDEX IF NOT EXISTS idx_procurement_return_grn ON procurement_purchase_returns(source_grn_id);
CREATE INDEX IF NOT EXISTS idx_procurement_return_prn ON procurement_purchase_returns(source_prn_id);
CREATE INDEX IF NOT EXISTS idx_procurement_return_items ON procurement_purchase_return_items(return_id);


-- 56. Procurement Expiry Returns (Header)
CREATE TABLE IF NOT EXISTS procurement_expiry_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(50) UNIQUE NOT NULL,
    doc_date DATE NOT NULL,
    store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
    vendor_id UUID REFERENCES procurement_vendors(id) ON DELETE RESTRICT,
    no_of_days INTEGER NOT NULL,
    net_amount NUMERIC(14, 2) DEFAULT 0.00,
    purchase_organisation VARCHAR(100) NOT NULL DEFAULT 'Pharmacy',
    remarks TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 57. Procurement Expiry Return Items (Line Items)
CREATE TABLE IF NOT EXISTS procurement_expiry_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES procurement_expiry_returns(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
    batch_code VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    current_stock NUMERIC(12, 2) DEFAULT 0.00,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity >= 0),
    rate NUMERIC(12, 2) NOT NULL,
    value NUMERIC(12, 2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Expiry Returns
CREATE INDEX IF NOT EXISTS idx_procurement_expiry_vendor ON procurement_expiry_returns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_procurement_expiry_store ON procurement_expiry_returns(store_id);
CREATE INDEX IF NOT EXISTS idx_procurement_expiry_items ON procurement_expiry_return_items(return_id);



