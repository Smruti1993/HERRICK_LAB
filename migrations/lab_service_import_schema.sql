-- Migration: Create lab_service_import_log table for audit trail of bulk service imports
-- Applied: 2026-08-08

CREATE TABLE IF NOT EXISTS lab_service_import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by uuid REFERENCES app_users(id),
  file_name text,
  total_rows integer NOT NULL,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  row_results jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lab_service_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read access for admin and lab managers" ON lab_service_import_log
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid()
      AND (role = 'Administrator' OR role = 'Lab Manager')
    )
  );
