-- ============================================================
-- FIX: Add Primary Key and Foreign Key constraints
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
-- ============================================================

-- 1. Add primary key to appointments table.
-- Since appointments.id is of type 'text' and is the unique identifier
-- for each appointment, it must have a primary key constraint.
ALTER TABLE appointments ADD PRIMARY KEY (id);

-- 2. Add the foreign key constraint on service_orders referencing appointments.
ALTER TABLE service_orders
  ADD CONSTRAINT fk_service_orders_appointment
  FOREIGN KEY (appointment_id)
  REFERENCES appointments(id)
  NOT VALID;
