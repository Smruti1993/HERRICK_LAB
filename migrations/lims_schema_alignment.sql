-- 1. Create lims_results table if not exists (matching existing codebase)
CREATE TABLE IF NOT EXISTS lims_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_order_id uuid REFERENCES lims_lab_orders(id) ON DELETE CASCADE,
  parameter_id uuid REFERENCES lims_service_parameters(id) ON DELETE CASCADE,
  value text,
  flag text DEFAULT 'Normal',
  is_amended boolean DEFAULT false,
  amended_reason text,
  captured_by text REFERENCES employees(id),
  captured_at timestamp with time zone DEFAULT now(),
  equipment_id uuid REFERENCES lims_equipment(id)
);

-- Grant permissions to anon role for frontend direct writes (fallback)
GRANT ALL ON lims_results TO anon;
ALTER TABLE lims_results DISABLE ROW LEVEL SECURITY;

-- 2. Add missing columns to lims_lab_orders for Perform Test and Collect/Accept screens
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS collector_badge TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS collection_remarks TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT false;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS consent_obtained BOOLEAN DEFAULT false;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS instrument_run_id TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS rack_position TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS test_start_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS test_end_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS test_notes TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS clinical_comments TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'Preliminary';
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS qc_passed BOOLEAN DEFAULT false;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS reagent_in_date BOOLEAN DEFAULT false;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS calibration_verified BOOLEAN DEFAULT false;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS maintenance_ok BOOLEAN DEFAULT false;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS duplicate_run_required BOOLEAN DEFAULT false;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS control_lot_no TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS reagent_lot_no TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS calibration_date DATE;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS test_method TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS analyzer_channel TEXT;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS received_by TEXT REFERENCES employees(id);
ALTER TABLE lims_lab_orders ADD COLUMN IF NOT EXISTS lab_section TEXT;

-- 3. Add missing columns to lims_samples for Collect and Accept screens
ALTER TABLE lims_samples ADD COLUMN IF NOT EXISTS collection_site TEXT;
ALTER TABLE lims_samples ADD COLUMN IF NOT EXISTS volume_ml NUMERIC(5,2);
ALTER TABLE lims_samples ADD COLUMN IF NOT EXISTS temp_req TEXT;
ALTER TABLE lims_samples ADD COLUMN IF NOT EXISTS sent_by TEXT REFERENCES employees(id);
ALTER TABLE lims_samples ADD COLUMN IF NOT EXISTS sent_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE lims_samples ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'Good';
ALTER TABLE lims_samples ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE lims_samples ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE lims_samples ADD COLUMN IF NOT EXISTS received_by TEXT REFERENCES employees(id);
