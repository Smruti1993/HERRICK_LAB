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
