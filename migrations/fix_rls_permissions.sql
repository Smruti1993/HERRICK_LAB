-- =============================================================================
-- FIX: Disable RLS and Grant anon access on all HMS tables
-- This resolves the 403 Forbidden errors when the app syncs data.
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wbjtdhtvzlefzjvwhkui/sql
-- =============================================================================

-- Disable RLS on all existing HMS tables so the anon key can read/write
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_prisma_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO anon', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', tbl);
    RAISE NOTICE 'Disabled RLS and granted access on: %', tbl;
  END LOOP;
END;
$$;
