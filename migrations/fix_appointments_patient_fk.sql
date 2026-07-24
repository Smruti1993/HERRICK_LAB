-- Drop the constraint if it was created, because patient_id can reference either 'patients' or 'patient_demographics' table.
-- A single column cannot have FKs pointing to two different tables in PostgreSQL.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_appointments_patient;
