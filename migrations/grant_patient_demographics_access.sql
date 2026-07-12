-- =============================================================================
-- FIX: Grant anon/authenticated access to patient_demographics table
--
-- The patient_demographics table was created AFTER fix_rls_permissions.sql ran,
-- so it was not covered by that grant. Run this in the Supabase SQL editor to
-- allow the frontend (anon key) to read from patient_demographics.
-- =============================================================================

-- Grant table access
GRANT ALL ON public.patient_demographics TO anon;
GRANT ALL ON public.patient_demographics TO authenticated;

-- Grant sequence access so inserts (BIGSERIAL) continue to work
GRANT USAGE, SELECT ON SEQUENCE public.patient_demographics_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.patient_demographics_id_seq TO authenticated;

-- Ensure RLS is off (should already be off, but be explicit)
ALTER TABLE public.patient_demographics DISABLE ROW LEVEL SECURITY;
