-- Create service_location_mappings table to store assigned locations for service definitions
CREATE TABLE IF NOT EXISTS service_location_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id TEXT NOT NULL REFERENCES service_definitions(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  service_centre_id UUID REFERENCES service_centres(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service_id, branch_id, service_centre_id)
);

-- Enable RLS and create public policies
ALTER TABLE service_location_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON service_location_mappings;
CREATE POLICY "Enable read access for all users" ON service_location_mappings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all write operations for all users" ON service_location_mappings;
CREATE POLICY "Enable all write operations for all users" ON service_location_mappings
    FOR ALL TO public USING (true) WITH CHECK (true);
