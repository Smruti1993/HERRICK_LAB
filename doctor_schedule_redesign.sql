-- ==========================================================
-- DOCTOR AVAILABILITY SCHEDULE REDESIGN MIGRATION
-- Run this script in the Supabase SQL Editor
-- ==========================================================

-- 1. Drop old conflicting tables (to ensure clean recreation with corrected TEXT column types)
DROP TABLE IF EXISTS schedule_templates CASCADE;
DROP TABLE IF EXISTS doctor_schedules CASCADE;

-- 2. Drop old conflicting overloaded functions
DROP FUNCTION IF EXISTS save_doctor_schedule(UUID, JSONB, DATE, TEXT);
DROP FUNCTION IF EXISTS get_doctor_schedule_stats(UUID, DATE);

-- 3. Create doctor weekly availability schedules table (referencing employees)
CREATE TABLE doctor_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  start_time      TIME NOT NULL,          -- e.g. 09:00:00
  end_time        TIME NOT NULL,          -- e.g. 09:30:00
  slot_type       TEXT NOT NULL DEFAULT 'available'
                  CHECK (slot_type IN ('available', 'break', 'blocked')),
  slot_duration   INTEGER NOT NULL DEFAULT 30, -- in minutes
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (doctor_id, day_of_week, start_time)
);

-- Index for fast lookup by doctor
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id
  ON doctor_schedules(doctor_id);

-- Index for appointment booking lookup
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day_type
  ON doctor_schedules(doctor_id, day_of_week, slot_type)
  WHERE slot_type = 'available' AND is_active = true;

-- 4. Create schedule templates table (referencing employees)
CREATE TABLE schedule_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL DEFAULT 'Default',
  week_start    DATE NOT NULL,            -- Monday of the week this template was saved
  created_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Trigger function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at on doctor_schedules updates
DROP TRIGGER IF EXISTS doctor_schedules_updated_at ON doctor_schedules;
CREATE TRIGGER doctor_schedules_updated_at
  BEFORE UPDATE ON doctor_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

-- Enable RLS
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

-- doctor_schedules policies
DROP POLICY IF EXISTS "Enable read access for all users" ON doctor_schedules;
CREATE POLICY "Enable read access for all users" ON doctor_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable all write operations for all users" ON doctor_schedules;
CREATE POLICY "Enable all write operations for all users" ON doctor_schedules FOR ALL TO public USING (true) WITH CHECK (true);

-- schedule_templates policies
DROP POLICY IF EXISTS "Enable read access for all users" ON schedule_templates;
CREATE POLICY "Enable read access for all users" ON schedule_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable all write operations for all users" ON schedule_templates;
CREATE POLICY "Enable all write operations for all users" ON schedule_templates FOR ALL TO public USING (true) WITH CHECK (true);

-- ==========================================================
-- RPC FUNCTIONS
-- ==========================================================

-- RPC: save_doctor_schedule (atomic weekly schedule save)
CREATE OR REPLACE FUNCTION save_doctor_schedule(
  p_doctor_id     TEXT,     -- Defined as TEXT to match employees.id
  p_slots         JSONB,    -- [{day_of_week, start_time, end_time, slot_type, slot_duration}]
  p_week_start    DATE,     -- Monday of the week being saved
  p_created_by    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot          JSONB;
  v_inserted      INTEGER := 0;
  v_template_id   UUID;
BEGIN

  -- Validate doctor exists in employees
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_doctor_id AND role = 'Doctor') THEN
    RAISE EXCEPTION 'Doctor not found: %', p_doctor_id;
  END IF;

  -- Delete ALL existing slots for this doctor
  DELETE FROM doctor_schedules
  WHERE doctor_id = p_doctor_id;

  -- Insert new slots (id column is omitted so it uses DEFAULT gen_random_uuid())
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO doctor_schedules (
      doctor_id, day_of_week,
      start_time, end_time, slot_type,
      slot_duration, is_active,
      created_by, created_at
    ) VALUES (
      p_doctor_id,
      (v_slot->>'day_of_week')::INTEGER,
      (v_slot->>'start_time')::TIME,
      (v_slot->>'end_time')::TIME,
      COALESCE(v_slot->>'slot_type', 'available'),
      COALESCE((v_slot->>'slot_duration')::INTEGER, 30),
      true,
      p_created_by,
      NOW()
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  -- Save as template for "copy from last week"
  INSERT INTO schedule_templates (
    doctor_id, template_name, week_start, created_by, created_at
  ) VALUES (
    p_doctor_id, 'Default', p_week_start, p_created_by, NOW()
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO v_template_id;

  RETURN jsonb_build_object(
    'success',      true,
    'slots_saved',  v_inserted,
    'template_id',  v_template_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- RPC: get_doctor_schedule_stats (dashboard metrics)
CREATE OR REPLACE FUNCTION get_doctor_schedule_stats(
  p_doctor_id   TEXT,   -- Defined as TEXT to match employees.id
  p_week_start  DATE   -- Monday of current week
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_days     INTEGER;
  v_total_slots     INTEGER;
  v_booked_slots    INTEGER;
BEGIN

  -- Count distinct active days
  SELECT COUNT(DISTINCT day_of_week) INTO v_active_days
  FROM doctor_schedules
  WHERE doctor_id = p_doctor_id
    AND slot_type = 'available'
    AND is_active = true;

  -- Count total available slots
  SELECT COUNT(*) INTO v_total_slots
  FROM doctor_schedules
  WHERE doctor_id = p_doctor_id
    AND slot_type = 'available'
    AND is_active = true;

  -- Count booked appointments this week (handling text dates and statuses)
  SELECT COUNT(*) INTO v_booked_slots
  FROM appointments
  WHERE doctor_id = p_doctor_id
    AND date >= p_week_start::text
    AND date < (p_week_start + INTERVAL '7 days')::date::text
    AND status NOT IN ('Cancelled', 'No Show');

  RETURN jsonb_build_object(
    'active_days',   v_active_days,
    'total_slots',   v_total_slots,
    'booked_slots',  v_booked_slots
  );

END;
$$;

-- ==========================================================
-- RELOAD SCHEMA CACHE
-- ==========================================================
-- Tell PostgREST to reload the schema cache so the new tables are immediately visible.
NOTIFY pgrst, 'reload schema';
