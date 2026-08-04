-- Add specimen_id and container_id columns to lims_service_configs table
ALTER TABLE lims_service_configs 
ADD COLUMN IF NOT EXISTS specimen_id UUID REFERENCES lims_specimens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS container_id UUID REFERENCES lims_containers(id) ON DELETE SET NULL;
