-- =============================================================================
-- LIMS: Lab Reference Range Remarks Table
-- Run this in Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS lims_reference_remarks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id text REFERENCES service_definitions(id) ON DELETE CASCADE,
  site text,
  equipment_id uuid REFERENCES lims_equipment(id) ON DELETE SET NULL,
  parameter_id uuid REFERENCES lims_service_parameters(id) ON DELETE SET NULL,
  remarks text,
  test_method text,
  footer text,
  is_active boolean DEFAULT true,
  status text DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

GRANT ALL ON lims_reference_remarks TO anon;
ALTER TABLE lims_reference_remarks DISABLE ROW LEVEL SECURITY;
