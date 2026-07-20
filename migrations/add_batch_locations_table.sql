-- =============================================================================
-- Migration: Pharmacy Batch-Level Location Hierarchy
-- Tables: pharmacy_zones, pharmacy_racks, inventory_batch_locations
-- View:   vw_batch_locations
-- Run once in Supabase SQL Editor
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: pharmacy_zones
-- Defines physical zones within each store (Zone A = Oral, Zone D = Cold, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_zones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  zone_code     VARCHAR(10) NOT NULL,     -- e.g. 'A', 'B', 'C', 'D', 'E'
  zone_name     VARCHAR(100) NOT NULL,    -- e.g. 'Oral Medicines', 'Injectables'
  temperature   VARCHAR(20) NOT NULL DEFAULT 'Ambient'
                CHECK (temperature IN (
                  'Ambient',       -- normal room temperature
                  'Refrigerated',  -- 2-8°C (insulin, vaccines)
                  'Frozen',        -- below 0°C
                  'Controlled'     -- locked cupboard (narcotics, Schedule H1)
                )),
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (store_id, zone_code)
);

-- RLS for pharmacy_zones
ALTER TABLE public.pharmacy_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_pharmacy_zones"    ON public.pharmacy_zones FOR SELECT    TO anon          USING (true);
CREATE POLICY "anon_insert_pharmacy_zones"    ON public.pharmacy_zones FOR INSERT    TO anon          WITH CHECK (true);
CREATE POLICY "anon_update_pharmacy_zones"    ON public.pharmacy_zones FOR UPDATE    TO anon          USING (true);
CREATE POLICY "anon_delete_pharmacy_zones"    ON public.pharmacy_zones FOR DELETE    TO anon          USING (true);
CREATE POLICY "auth_all_pharmacy_zones"       ON public.pharmacy_zones FOR ALL       TO authenticated USING (true);
GRANT ALL ON public.pharmacy_zones TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: pharmacy_racks
-- Racks belong to zones; each rack tracks how many shelves it has
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_racks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id       UUID NOT NULL REFERENCES public.pharmacy_zones(id) ON DELETE CASCADE,
  rack_code     VARCHAR(10) NOT NULL,     -- e.g. 'A1', 'A2', 'B1'
  rack_name     VARCHAR(100),             -- e.g. 'Antibiotics Rack'
  no_of_shelves INTEGER NOT NULL DEFAULT 5 CHECK (no_of_shelves BETWEEN 1 AND 20),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (zone_id, rack_code)
);

-- RLS for pharmacy_racks
ALTER TABLE public.pharmacy_racks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_pharmacy_racks"    ON public.pharmacy_racks FOR SELECT    TO anon          USING (true);
CREATE POLICY "anon_insert_pharmacy_racks"    ON public.pharmacy_racks FOR INSERT    TO anon          WITH CHECK (true);
CREATE POLICY "anon_update_pharmacy_racks"    ON public.pharmacy_racks FOR UPDATE    TO anon          USING (true);
CREATE POLICY "anon_delete_pharmacy_racks"    ON public.pharmacy_racks FOR DELETE    TO anon          USING (true);
CREATE POLICY "auth_all_pharmacy_racks"       ON public.pharmacy_racks FOR ALL       TO authenticated USING (true);
GRANT ALL ON public.pharmacy_racks TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: inventory_batch_locations
-- Maps a specific batch of an item in a store to its exact Zone/Rack/Shelf/Bin
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_batch_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  batch_no      VARCHAR(100) NOT NULL,
  zone_id       UUID NOT NULL REFERENCES public.pharmacy_zones(id),
  rack_id       UUID NOT NULL REFERENCES public.pharmacy_racks(id),
  shelf_no      INTEGER NOT NULL CHECK (shelf_no > 0),   -- 1, 2, 3 (level on rack)
  bin_no        VARCHAR(10) NOT NULL,                    -- '01', '02', '03A'
  is_primary    BOOLEAN NOT NULL DEFAULT TRUE,           -- TRUE = main bin, FALSE = overflow
  notes         TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent the same batch being placed in the identical bin twice
  UNIQUE (store_id, item_id, batch_no, zone_id, rack_id, shelf_no, bin_no)
);

-- Optimised index for dispense screen lookups (called every batch selection)
CREATE INDEX IF NOT EXISTS idx_batch_locations_primary_lookup
  ON public.inventory_batch_locations (store_id, item_id, batch_no)
  WHERE is_primary = TRUE;

-- Index for the Batch Locations master screen (lists all items per store)
CREATE INDEX IF NOT EXISTS idx_batch_locations_store
  ON public.inventory_batch_locations (store_id);

-- RLS for inventory_batch_locations
ALTER TABLE public.inventory_batch_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_batch_loc"   ON public.inventory_batch_locations FOR SELECT    TO anon          USING (true);
CREATE POLICY "anon_insert_batch_loc"   ON public.inventory_batch_locations FOR INSERT    TO anon          WITH CHECK (true);
CREATE POLICY "anon_update_batch_loc"   ON public.inventory_batch_locations FOR UPDATE    TO anon          USING (true);
CREATE POLICY "anon_delete_batch_loc"   ON public.inventory_batch_locations FOR DELETE    TO anon          USING (true);
CREATE POLICY "auth_all_batch_loc"      ON public.inventory_batch_locations FOR ALL       TO authenticated USING (true);
GRANT ALL ON public.inventory_batch_locations TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- VIEW: vw_batch_locations
-- Consolidates all the details the UI needs in one query
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.vw_batch_locations AS
SELECT
  bl.id,
  bl.store_id,
  bl.item_id,
  bl.batch_no,
  bl.shelf_no,
  bl.bin_no,
  bl.is_primary,
  bl.notes,
  bl.created_by,
  bl.updated_at,

  -- Zone details
  pz.id         AS zone_id,
  pz.zone_code,
  pz.zone_name,
  pz.temperature,

  -- Rack details
  pr.id         AS rack_id,
  pr.rack_code,
  pr.rack_name,

  -- Item details
  ii.item_name,
  ii.item_code,

  -- Auto-computed human-readable location string for UI display
  -- e.g. "Zone A › A1 › Shelf 2 › Bin 04"
  'Zone ' || pz.zone_code || ' › ' ||
  pr.rack_code              || ' › ' ||
  'Shelf ' || bl.shelf_no   || ' › ' ||
  'Bin '   || bl.bin_no     AS location_display,

  -- Compact badge code for tight spaces
  -- e.g. "A-A1-S2-B04"
  pz.zone_code || '-' || pr.rack_code ||
  '-S' || bl.shelf_no ||
  '-B' || LPAD(bl.bin_no, 2, '0')  AS location_code

FROM  public.inventory_batch_locations bl
JOIN  public.pharmacy_zones  pz ON pz.id = bl.zone_id
JOIN  public.pharmacy_racks  pr ON pr.id = bl.rack_id
JOIN  public.inventory_items ii ON ii.id = bl.item_id;

GRANT SELECT ON public.vw_batch_locations TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Default zones for every existing active store
-- Runs INSERT...ON CONFLICT DO NOTHING — safe to re-run
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.pharmacy_zones (store_id, zone_code, zone_name, temperature, description)
SELECT id, 'A', 'Oral Medicines',      'Ambient',      'Tablets, capsules, syrups (alphabetical by generic name)'
FROM   public.stores WHERE is_active = TRUE
ON CONFLICT (store_id, zone_code) DO NOTHING;

INSERT INTO public.pharmacy_zones (store_id, zone_code, zone_name, temperature, description)
SELECT id, 'B', 'Injectables',         'Ambient',      'Ampoules, vials, IV fluids'
FROM   public.stores WHERE is_active = TRUE
ON CONFLICT (store_id, zone_code) DO NOTHING;

INSERT INTO public.pharmacy_zones (store_id, zone_code, zone_name, temperature, description)
SELECT id, 'C', 'Topicals / External', 'Ambient',      'Ointments, creams, eye drops, ear drops'
FROM   public.stores WHERE is_active = TRUE
ON CONFLICT (store_id, zone_code) DO NOTHING;

INSERT INTO public.pharmacy_zones (store_id, zone_code, zone_name, temperature, description)
SELECT id, 'D', 'Cold Chain',          'Refrigerated', '2–8°C refrigerator — insulin, vaccines, biologics'
FROM   public.stores WHERE is_active = TRUE
ON CONFLICT (store_id, zone_code) DO NOTHING;

INSERT INTO public.pharmacy_zones (store_id, zone_code, zone_name, temperature, description)
SELECT id, 'E', 'Controlled Drugs',    'Controlled',   'Locked cupboard — narcotics, Schedule H1, psychotropics'
FROM   public.stores WHERE is_active = TRUE
ON CONFLICT (store_id, zone_code) DO NOTHING;

-- End of migration
