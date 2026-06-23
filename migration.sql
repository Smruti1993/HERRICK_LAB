-- Run this script in your Supabase SQL Editor to add the required columns:

-- 1. Add VAT Registration Number to Branches (Hospitals)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS vat_reg_no TEXT;

-- 2. Add Invoice Number and Receipt Number to Pharmacy Direct Sales
ALTER TABLE pharmacy_direct_sales ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE pharmacy_direct_sales ADD COLUMN IF NOT EXISTS receipt_no TEXT;

-- 3. Add Payment Mode and Reference Number to Pharmacy Direct Sales
ALTER TABLE pharmacy_direct_sales ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'Cash';
ALTER TABLE pharmacy_direct_sales ADD COLUMN IF NOT EXISTS reference_no TEXT;

-- 4. Add Payment Gateway details to Pharmacy Direct Sales
ALTER TABLE pharmacy_direct_sales ADD COLUMN IF NOT EXISTS pg_order_id TEXT;
ALTER TABLE pharmacy_direct_sales ADD COLUMN IF NOT EXISTS pg_payment_id TEXT;
ALTER TABLE pharmacy_direct_sales ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- 5. Create currency_master table and insert default records
CREATE TABLE IF NOT EXISTS currency_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO currency_master (code, name, symbol, is_active, is_default)
VALUES 
    ('INR', 'Indian Rupee', '₹', true, true),
    ('SAR', 'Saudi Riyal', 'SAR', true, false),
    ('BHD', 'Bahraini Dinar', 'BD', true, false),
    ('USD', 'US Dollar', '$', true, false),
    ('QAR', 'Qatari Riyal', 'QR', true, false)
ON CONFLICT (code) DO NOTHING;

-- 6. Add Prescription/Print related optional patient fields to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS arabic_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sponsor_name TEXT DEFAULT 'CASH';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS policy_no TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS card_no TEXT;

-- 7. Add department_id to service_centres (Service Locations)
ALTER TABLE service_centres ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id);

-- 8. Patient Refunds Schema
CREATE TABLE IF NOT EXISTS patient_refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    refund_no TEXT UNIQUE NOT NULL,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    refund_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(12,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    remarks TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add refund_status and refund_id to pharmacy_returns
ALTER TABLE pharmacy_returns ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'Pending';
ALTER TABLE pharmacy_returns ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES patient_refunds(id) ON DELETE SET NULL;

-- Add refund_status and refund_id to bills
ALTER TABLE bills ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'Pending';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES patient_refunds(id) ON DELETE SET NULL;

-- Enable RLS and create policies for patient_refunds
ALTER TABLE patient_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON patient_refunds FOR SELECT USING (true);
CREATE POLICY "Enable all write operations for all users" ON patient_refunds FOR ALL TO public USING (true) WITH CHECK (true);

-- 9. Add cancelled_at column to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;


