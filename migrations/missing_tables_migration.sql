-- =============================================================================
-- LIMS TABLES MIGRATION
-- Only the LIMS tables are missing — run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Specimen types (e.g. Serum, Whole Blood, Urine)
CREATE TABLE IF NOT EXISTS lims_specimens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  status text DEFAULT 'Active'
);

-- 2. Containers (e.g. EDTA Tube, Plain Tube)
CREATE TABLE IF NOT EXISTS lims_containers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  cap_color text,
  status text DEFAULT 'Active'
);

-- 3. Analyzer Equipment
CREATE TABLE IF NOT EXISTS lims_equipment (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  model text,
  manufacturer text,
  status text DEFAULT 'Active'
);

-- 4. Microbiology Organisms
CREATE TABLE IF NOT EXISTS lims_organisms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  status text DEFAULT 'Active'
);

-- 5. Microbiology Antibiotics
CREATE TABLE IF NOT EXISTS lims_antibiotics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  status text DEFAULT 'Active'
);

-- 6. Microbiology Stains
CREATE TABLE IF NOT EXISTS lims_stains (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  status text DEFAULT 'Active'
);

-- 7. Outsource Laboratories
CREATE TABLE IF NOT EXISTS lims_outsource_labs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  contact_no text,
  email text,
  status text DEFAULT 'Active'
);

-- 8. Service Test Parameters (sub-tests within a test profile like CBC)
CREATE TABLE IF NOT EXISTS lims_service_parameters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id text REFERENCES service_definitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  result_type text DEFAULT 'Numeric',
  sort_order integer DEFAULT 0,
  status text DEFAULT 'Active',
  UNIQUE(service_id, code)
);

-- 9. Parameter Reference Ranges (gender + age bracket)
CREATE TABLE IF NOT EXISTS lims_reference_ranges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parameter_id uuid REFERENCES lims_service_parameters(id) ON DELETE CASCADE,
  gender text DEFAULT 'All',
  age_min numeric(5,2) DEFAULT 0,
  age_max numeric(5,2) DEFAULT 999,
  ref_min text,
  ref_max text,
  critical_min text,
  critical_max text,
  unit text,
  status text DEFAULT 'Active'
);

-- 10. Lab Order Headers
CREATE TABLE IF NOT EXISTS lims_lab_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id text REFERENCES service_orders(id) ON DELETE CASCADE,
  barcode_no text NOT NULL UNIQUE,
  priority text DEFAULT 'Routine',
  status text DEFAULT 'Ordered',
  ordered_at timestamp with time zone DEFAULT now(),
  collected_at timestamp with time zone,
  collected_by text REFERENCES employees(id),
  accepted_at timestamp with time zone,
  accepted_by text REFERENCES employees(id),
  result_captured_at timestamp with time zone,
  result_captured_by text REFERENCES employees(id),
  certified_at timestamp with time zone,
  certified_by text REFERENCES employees(id)
);

-- 11. Sample Logs
CREATE TABLE IF NOT EXISTS lims_samples (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_order_id uuid REFERENCES lims_lab_orders(id) ON DELETE CASCADE,
  specimen_id uuid REFERENCES lims_specimens(id),
  container_id uuid REFERENCES lims_containers(id),
  sample_no text NOT NULL UNIQUE,
  status text DEFAULT 'Pending',
  rejection_reason text,
  rejected_by text REFERENCES employees(id)
);

-- 12. Test Results
CREATE TABLE IF NOT EXISTS lims_test_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_order_id uuid REFERENCES lims_lab_orders(id) ON DELETE CASCADE,
  parameter_id uuid REFERENCES lims_service_parameters(id) ON DELETE CASCADE,
  result_value text,
  result_flag text,
  equipment_id uuid REFERENCES lims_equipment(id),
  result_at timestamp with time zone DEFAULT now(),
  result_by text REFERENCES employees(id)
);

-- =============================================================================
-- GRANT anon role access to all LIMS tables
-- =============================================================================
GRANT ALL ON lims_specimens TO anon;
GRANT ALL ON lims_containers TO anon;
GRANT ALL ON lims_equipment TO anon;
GRANT ALL ON lims_organisms TO anon;
GRANT ALL ON lims_antibiotics TO anon;
GRANT ALL ON lims_stains TO anon;
GRANT ALL ON lims_outsource_labs TO anon;
GRANT ALL ON lims_service_parameters TO anon;
GRANT ALL ON lims_reference_ranges TO anon;
GRANT ALL ON lims_lab_orders TO anon;
GRANT ALL ON lims_samples TO anon;
GRANT ALL ON lims_test_results TO anon;

-- =============================================================================
-- DISABLE ROW LEVEL SECURITY on all LIMS tables
-- =============================================================================
ALTER TABLE lims_specimens DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_containers DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_organisms DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_antibiotics DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_stains DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_outsource_labs DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_service_parameters DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_reference_ranges DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_lab_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_samples DISABLE ROW LEVEL SECURITY;
ALTER TABLE lims_test_results DISABLE ROW LEVEL SECURITY;

-- Patch service_definitions with LIMS columns
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS result_type TEXT DEFAULT 'Numeric';
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS clinical_significance TEXT;
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS patient_instruction TEXT;
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS phlebotomist_instruction TEXT;
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS technician_instruction TEXT;
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS gender_wise BOOLEAN DEFAULT false;
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS age_range_wise BOOLEAN DEFAULT false;
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS delta_check BOOLEAN DEFAULT false;
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS is_result_mandatory BOOLEAN DEFAULT true;
ALTER TABLE service_definitions ADD COLUMN IF NOT EXISTS is_derived BOOLEAN DEFAULT false;
