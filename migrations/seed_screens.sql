-- Seed default Admin role (required for the superuser bypass to have a real row to match)
INSERT INTO roles (role_code, role_name, description) VALUES
('ADMIN', 'Administrator', 'Full system access, bypasses all privilege checks')
ON CONFLICT (role_code) DO NOTHING;

-- Seed Lab Screens
INSERT INTO screens (module, screen_code, screen_name, screen_url, display_order) VALUES
('Lab', 'LIMS_DASHBOARD', 'LIMS Dashboard', '/lims/dashboard', 1),
('Lab', 'LIMS_COLLECT', 'Collect Sample', '/lims/collect', 2),
('Lab', 'LIMS_ACCEPT', 'Accept Sample', '/lims/accept', 3),
('Lab', 'LIMS_PERFORM', 'Perform Test', '/lims/perform', 4),
('Lab', 'LIMS_AMENDMENTS', 'Pathology Amendments', '/lims/amendments', 5),
('Lab', 'LIMS_ANALYTICS', 'Compliance & Analytics', '/lims/analytics', 6),
('Lab', 'LIMS_MASTERS', 'LIMS Masters Configuration', '/lims/masters', 7)
ON CONFLICT (screen_code) DO NOTHING;

-- Seed Finance Screens
INSERT INTO screens (module, screen_code, screen_name, screen_url, display_order) VALUES
('Finance', 'FIN_BILLING', 'Billing Workbench', '/finance/billing', 1),
('Finance', 'FIN_REFUND', 'Refund Workbench', '/finance/transactions/refund', 2),
('Finance', 'FIN_COA', 'Chart of Accounts', '/finance/masters/chart-of-accounts', 3),
('Finance', 'FIN_JV', 'Journal Vouchers', '/finance/transactions/journal-vouchers', 4),
('Finance', 'FIN_ORG', 'Organization Master', '/finance/masters/organization', 5),
('Finance', 'FIN_PLAN', 'Plan Definition', '/finance/masters/plan-definition', 6),
('Finance', 'FIN_TARIFF', 'Sponsor Tariff', '/finance/masters/sponsor-tariff', 7)
ON CONFLICT (screen_code) DO NOTHING;

-- Seed System, Administration, and other Module Screens
INSERT INTO screens (module, screen_code, screen_name, screen_url, display_order) VALUES
('System', 'DASHBOARD', 'Main Dashboard', '/', 1),
('System', 'APPOINTMENTS', 'Appointments Page', '/appointments', 2),
('System', 'PATIENTS', 'Patients Registration', '/patients', 3),
('System', 'DOCTOR_WORKBENCH', 'Doctor Workbench', '/doctor-workbench', 4),
('System', 'ABDM_PROFILES', 'ABDM Profiles', '/abdm-profiles', 5),
('System', 'REPORTS', 'System Reports', '/reports', 6),
('System', 'EMPLOYEES', 'Doctors & Staff Management', '/employees', 7),
('System', 'AVAILABILITY', 'Availability Scheduler', '/availability', 8),
('System', 'MASTERS', 'Administration Masters', '/masters', 9),
('System', 'RBAC_CONFIG', 'RBAC Control Center', '/rbac', 10),
('Inventory', 'INVENTORY_DASHBOARD', 'Inventory Module Access', '/inventory', 1),
('Pharmacy', 'PHARMACY_DASHBOARD', 'Pharmacy Module Access', '/pharmacy', 1),
('Procurement', 'PROCUREMENT_DASHBOARD', 'Procurement Module Access', '/procurement', 1)
ON CONFLICT (screen_code) DO NOTHING;

-- Backfill existing legacy 'Administrator' users to the new ADMIN role
UPDATE app_users u
SET role_id = r.id
FROM roles r
WHERE u.role_id IS NULL
  AND r.role_code = 'ADMIN'
  AND (lower(u.role) = 'administrator' OR lower(u.role) = 'admin');
