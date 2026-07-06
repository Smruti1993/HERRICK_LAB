-- SQL Migration: Drop restrictive foreign key constraints on LIMS tables
-- Since LIMS operators (phlebotomists, techs, pathologists) can be general app_users (like 'admin'),
-- having foreign key references strictly to the employees table blocks saving actions.
-- Dropping these constraints allows any user ID to be saved.

ALTER TABLE lims_lab_orders DROP CONSTRAINT IF EXISTS lims_lab_orders_collected_by_fkey;
ALTER TABLE lims_lab_orders DROP CONSTRAINT IF EXISTS lims_lab_orders_accepted_by_fkey;
ALTER TABLE lims_lab_orders DROP CONSTRAINT IF EXISTS lims_lab_orders_result_captured_by_fkey;
ALTER TABLE lims_lab_orders DROP CONSTRAINT IF EXISTS lims_lab_orders_certified_by_fkey;
ALTER TABLE lims_lab_orders DROP CONSTRAINT IF EXISTS lims_lab_orders_received_by_fkey;

ALTER TABLE lims_samples DROP CONSTRAINT IF EXISTS lims_samples_rejected_by_fkey;

ALTER TABLE lims_results DROP CONSTRAINT IF EXISTS lims_results_captured_by_fkey;
