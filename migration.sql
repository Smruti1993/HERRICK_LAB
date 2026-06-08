-- Run this script in your Supabase SQL Editor to add the required columns:

-- 1. Add VAT Registration Number to Branches (Hospitals)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS vat_reg_no TEXT;

-- 2. Add Invoice Number and Receipt Number to Pharmacy Direct Sales
ALTER TABLE pharmacy_direct_sales ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE pharmacy_direct_sales ADD COLUMN IF NOT EXISTS receipt_no TEXT;
