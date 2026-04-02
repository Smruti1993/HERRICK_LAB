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
  paid_amount numeric(10,2) default 0
);

-- 8. Bill Items
create table if not exists bill_items (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid references bills(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(10,2) default 0,
  total numeric(10,2) default 0
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
