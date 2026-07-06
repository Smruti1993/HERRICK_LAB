-- =============================================================================
-- LIMS: Alphanumeric Parameter Options
-- Run this AFTER the main missing_tables_migration.sql
-- Supabase SQL Editor: https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
-- =============================================================================

-- Add remarks column to existing reference ranges table (if not already done)
ALTER TABLE lims_reference_ranges ADD COLUMN IF NOT EXISTS remarks text;

-- Table for alphanumeric lookup values (e.g., Positive, Negative, Reactive, Trace)
CREATE TABLE IF NOT EXISTS lims_parameter_options (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parameter_id uuid REFERENCES lims_service_parameters(id) ON DELETE CASCADE,
  option_value text NOT NULL,
  sort_order integer DEFAULT 0,
  status text DEFAULT 'Active',
  UNIQUE(parameter_id, option_value)
);

GRANT ALL ON lims_parameter_options TO anon;
ALTER TABLE lims_parameter_options DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Add missing columns to lims_reference_ranges
-- Run this in Supabase SQL Editor
-- =============================================================================
ALTER TABLE lims_reference_ranges ADD COLUMN IF NOT EXISTS borderline_low text;
ALTER TABLE lims_reference_ranges ADD COLUMN IF NOT EXISTS borderline_high text;
ALTER TABLE lims_reference_ranges ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES lims_equipment(id);
ALTER TABLE lims_reference_ranges ADD COLUMN IF NOT EXISTS site text;
ALTER TABLE lims_reference_ranges ADD COLUMN IF NOT EXISTS is_derived boolean DEFAULT false;
