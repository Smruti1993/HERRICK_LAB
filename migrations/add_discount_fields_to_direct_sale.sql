-- =============================================================================
-- Migration: Add discount fields to pharmacy_direct_sales
-- Run this once in Supabase SQL Editor.
-- =============================================================================

ALTER TABLE pharmacy_direct_sales
  ADD COLUMN IF NOT EXISTS discount_percentage numeric(5,2) DEFAULT 0;

ALTER TABLE pharmacy_direct_sales
  ADD COLUMN IF NOT EXISTS discount_amount numeric(15,2) DEFAULT 0;

-- Grant access in case RLS is applied
GRANT ALL ON public.pharmacy_direct_sales TO anon;
GRANT ALL ON public.pharmacy_direct_sales TO authenticated;
