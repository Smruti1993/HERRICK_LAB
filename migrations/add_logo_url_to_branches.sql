-- Add logo_url column to branches table if it does not already exist
ALTER TABLE branches ADD COLUMN IF NOT EXISTS logo_url TEXT;
