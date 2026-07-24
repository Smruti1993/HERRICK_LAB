-- Ensure app_users has a unique constraint on id so it can be referenced by foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'app_users' 
          AND kcu.column_name = 'id' 
          AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    ) THEN
        ALTER TABLE app_users ADD CONSTRAINT app_users_id_unique UNIQUE (id);
    END IF;
END $$;

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_code text UNIQUE NOT NULL,
  role_name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Screens (Screen Registry) Table
CREATE TABLE IF NOT EXISTS screens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module text NOT NULL, -- 'Lab', 'Finance', 'Inventory', etc.
  screen_code text UNIQUE NOT NULL, -- e.g., 'LIMS_DASHBOARD', 'FIN_BILLING'
  screen_name text NOT NULL,
  screen_url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Role Privileges Table
CREATE TABLE IF NOT EXISTS role_privileges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  screen_id uuid REFERENCES screens(id) ON DELETE CASCADE,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_export boolean DEFAULT false,
  UNIQUE(role_id, screen_id)
);

-- 4. User Privilege Overrides Table
CREATE TABLE IF NOT EXISTS user_privilege_overrides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text REFERENCES app_users(id) ON DELETE CASCADE,
  screen_id uuid REFERENCES screens(id) ON DELETE CASCADE,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_export boolean DEFAULT false,
  UNIQUE(user_id, screen_id)
);

-- Ensure departments and service_centres have unique constraints on their id columns (required for referencing FKs)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'departments' 
          AND kcu.column_name = 'id' 
          AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    ) THEN
        ALTER TABLE departments ADD CONSTRAINT departments_id_unique UNIQUE (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'service_centres' 
          AND kcu.column_name = 'id' 
          AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    ) THEN
        ALTER TABLE service_centres ADD CONSTRAINT service_centres_id_unique UNIQUE (id);
    END IF;
END $$;

-- 5. Modify app_users to link role, department, and service_centres (as location_id)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS user_code text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS force_password_change boolean DEFAULT false;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS department_id text REFERENCES departments(id);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS location_id text REFERENCES service_centres(id);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 6. Indexes on new FKs
CREATE INDEX IF NOT EXISTS idx_app_users_role_id ON app_users(role_id);
CREATE INDEX IF NOT EXISTS idx_app_users_department_id ON app_users(department_id);
CREATE INDEX IF NOT EXISTS idx_app_users_location_id ON app_users(location_id);
CREATE INDEX IF NOT EXISTS idx_role_privileges_role_id ON role_privileges(role_id);
CREATE INDEX IF NOT EXISTS idx_role_privileges_screen_id ON role_privileges(screen_id);
CREATE INDEX IF NOT EXISTS idx_user_overrides_user_id ON user_privilege_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_overrides_screen_id ON user_privilege_overrides(screen_id);

-- 7. Disable Row Level Security on RBAC tables since login uses mock credentials in app_users (not standard Supabase Auth JWT sessions)
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE screens DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_privileges DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_privilege_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Drop RLS policies if they exist to prevent schema warnings
DROP POLICY IF EXISTS screens_read_all ON screens;
DROP POLICY IF EXISTS screens_admin_write ON screens;
DROP POLICY IF EXISTS roles_read_all ON roles;
DROP POLICY IF EXISTS roles_admin_write ON roles;
DROP POLICY IF EXISTS role_privileges_read_all ON role_privileges;
DROP POLICY IF EXISTS role_privileges_admin_write ON role_privileges;
DROP POLICY IF EXISTS user_overrides_admin_write ON user_privilege_overrides;
DROP POLICY IF EXISTS user_overrides_read_own_or_admin ON user_privilege_overrides;
DROP POLICY IF EXISTS app_users_read_own_or_admin ON app_users;
DROP POLICY IF EXISTS app_users_admin_write ON app_users;
