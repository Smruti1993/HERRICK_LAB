-- HIS-WEB5 SPONSOR TARIFF TABLE CONFIGURATION SCHEMA
-- Location: public.sponsor_tariffs
-- Primary use: negotiated pricing baseline per sponsor, class & item type

CREATE TABLE IF NOT EXISTS public.sponsor_tariffs (
    id VARCHAR(100) PRIMARY KEY,
    sponsor_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('SERVICES', 'DRUGS', 'CONSUMABLES')),
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    cpt_code VARCHAR(100),
    group_name VARCHAR(100),
    base_tariff NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('Flat', 'Discount %', 'Markup %')),
    tariff_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sponsor_code VARCHAR(100),
    sponsor_description VARCHAR(255),
    class_name VARCHAR(100) NOT NULL DEFAULT 'A+',
    nphies_code VARCHAR(100),
    nphies_desc VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- High-speed search performance indexing
CREATE INDEX IF NOT EXISTS idx_sponsor_tariffs_lookup 
ON public.sponsor_tariffs (sponsor_id, item_type, item_code, class_name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sponsor_tariffs ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy setup for universal authenticated operations
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sponsor_tariffs;
CREATE POLICY "Enable read access for all users" 
ON public.sponsor_tariffs FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Enable all write operations for authenticated users" ON public.sponsor_tariffs;
CREATE POLICY "Enable all write operations for authenticated users" 
ON public.sponsor_tariffs FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Clear PostgREST table schema cash
NOTIFY pgrst, 'reload schema';
