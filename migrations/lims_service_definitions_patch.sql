-- Migration: Add LIMS-specific columns to service_definitions table
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql

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
