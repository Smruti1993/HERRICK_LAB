-- ============================================================
-- Migration: Drop FK constraint on appointments.patient_id
-- ============================================================
-- The appointments table has a FK constraint (appointments_patient_id_fkey)
-- that enforces patient_id must exist in the `patients` table.
--
-- For ABDM-verified patients, we store patient_id as the numeric ID
-- from the `patient_demographics` table, which is NOT in `patients`.
-- Dropping this FK allows both regular and ABDM patients to be booked
-- without any schema relation between the two tables.
--
-- Run this once in your Supabase SQL editor.
-- ============================================================

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;
