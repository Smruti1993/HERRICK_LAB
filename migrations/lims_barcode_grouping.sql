-- ============================================================
-- LIMS Patient-Wise Specimen Barcode Grouping Migration
-- ============================================================

-- 1. Update trigger function for UPDATE event
CREATE OR REPLACE FUNCTION trg_create_lims_lab_order_on_billing()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_service_type     TEXT;
  v_service_category TEXT;
  v_existing_count   INTEGER;
  v_profile_group_id UUID;
  v_specimen_id      UUID;
  v_barcode          TEXT;
  v_rec              RECORD;
  v_has_components   BOOLEAN := false;
BEGIN
  IF (NEW.billing_status = 'Billed' AND (OLD.billing_status IS DISTINCT FROM 'Billed')) THEN

    SELECT service_type, service_category
    INTO v_service_type, v_service_category
    FROM service_definitions WHERE id = NEW.service_id;

    IF v_service_type ILIKE 'laboratory' THEN

      SELECT COUNT(*) INTO v_existing_count
      FROM lims_lab_orders WHERE service_order_id = NEW.id;

      IF v_existing_count = 0 THEN
        IF v_service_category = 'Profile/Package' THEN
          v_profile_group_id := gen_random_uuid();

          FOR v_rec IN
            SELECT component_service_id
            FROM lab_service_profile_components
            WHERE profile_service_id = NEW.service_id AND is_active = true
            ORDER BY display_order
          LOOP
            -- Resolve specimen type for this component
            SELECT specimen_id INTO v_specimen_id
            FROM lims_service_configs
            WHERE service_id = v_rec.component_service_id;

            -- Reuse existing barcode if another component with same specimen was already inserted for this appointment
            v_barcode := NULL;
            IF NEW.appointment_id IS NOT NULL THEN
              SELECT l.barcode_no INTO v_barcode
              FROM lims_lab_orders l
              JOIN service_orders s ON l.service_order_id = s.id
              LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
              WHERE s.appointment_id = NEW.appointment_id
                AND (
                  (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                  OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
                )
              LIMIT 1;
            END IF;

            -- Fallback to same service order check if no barcode resolved from appointment
            IF v_barcode IS NULL THEN
              SELECT l.barcode_no INTO v_barcode
              FROM lims_lab_orders l
              LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
              WHERE l.service_order_id = NEW.id
                AND (
                  (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                  OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
                )
              LIMIT 1;
            END IF;

            -- New specimen type — generate a new barcode
            IF v_barcode IS NULL THEN
              v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
            END IF;

            INSERT INTO lims_lab_orders (
              id, service_order_id, service_id, source_profile_service_id,
              profile_group_id, barcode_no, priority, status, ordered_at
            ) VALUES (
              gen_random_uuid(), NEW.id,
              v_rec.component_service_id,
              NEW.service_id,
              v_profile_group_id,
              v_barcode,
              COALESCE(NEW.priority, 'Routine'),
              'Ordered', NOW()
            );
            v_has_components := true;
          END LOOP;
        END IF;

        -- Fallback: Single service OR Profile with zero active components
        IF NOT v_has_components THEN
          -- Resolve specimen type for this single service
          SELECT specimen_id INTO v_specimen_id
          FROM lims_service_configs
          WHERE service_id = NEW.service_id;

          -- Reuse existing barcode if another service with same specimen was already inserted for this appointment
          v_barcode := NULL;
          IF NEW.appointment_id IS NOT NULL THEN
            SELECT l.barcode_no INTO v_barcode
            FROM lims_lab_orders l
            JOIN service_orders s ON l.service_order_id = s.id
            LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
            WHERE s.appointment_id = NEW.appointment_id
              AND (
                (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
              )
            LIMIT 1;
          END IF;

          -- Generate new barcode if none found
          IF v_barcode IS NULL THEN
            v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
          END IF;

          INSERT INTO lims_lab_orders (
            id, service_order_id, service_id, source_profile_service_id,
            profile_group_id, barcode_no, priority, status, ordered_at
          ) VALUES (
            gen_random_uuid(), NEW.id,
            NEW.service_id, NULL, NULL,
            v_barcode,
            COALESCE(NEW.priority, 'Routine'),
            'Ordered', NOW()
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


-- 2. Update trigger function for INSERT event
CREATE OR REPLACE FUNCTION trg_create_lims_lab_order_on_billing_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_service_type     TEXT;
  v_service_category TEXT;
  v_existing_count   INTEGER;
  v_profile_group_id UUID;
  v_specimen_id      UUID;
  v_barcode          TEXT;
  v_rec              RECORD;
  v_has_components   BOOLEAN := false;
BEGIN
  IF NEW.billing_status = 'Billed' THEN

    SELECT service_type, service_category
    INTO v_service_type, v_service_category
    FROM service_definitions WHERE id = NEW.service_id;

    IF v_service_type ILIKE 'laboratory' THEN

      SELECT COUNT(*) INTO v_existing_count
      FROM lims_lab_orders WHERE service_order_id = NEW.id;

      IF v_existing_count = 0 THEN
        IF v_service_category = 'Profile/Package' THEN
          v_profile_group_id := gen_random_uuid();

          FOR v_rec IN
            SELECT component_service_id
            FROM lab_service_profile_components
            WHERE profile_service_id = NEW.service_id AND is_active = true
            ORDER BY display_order
          LOOP
            -- Resolve specimen type for this component
            SELECT specimen_id INTO v_specimen_id
            FROM lims_service_configs
            WHERE service_id = v_rec.component_service_id;

            -- Reuse existing barcode if another component with same specimen was already inserted for this appointment
            v_barcode := NULL;
            IF NEW.appointment_id IS NOT NULL THEN
              SELECT l.barcode_no INTO v_barcode
              FROM lims_lab_orders l
              JOIN service_orders s ON l.service_order_id = s.id
              LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
              WHERE s.appointment_id = NEW.appointment_id
                AND (
                  (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                  OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
                )
              LIMIT 1;
            END IF;

            -- Fallback to same service order check if no barcode resolved from appointment
            IF v_barcode IS NULL THEN
              SELECT l.barcode_no INTO v_barcode
              FROM lims_lab_orders l
              LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
              WHERE l.service_order_id = NEW.id
                AND (
                  (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                  OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
                )
              LIMIT 1;
            END IF;

            -- New specimen type — generate a new barcode
            IF v_barcode IS NULL THEN
              v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
            END IF;

            INSERT INTO lims_lab_orders (
              id, service_order_id, service_id, source_profile_service_id,
              profile_group_id, barcode_no, priority, status, ordered_at
            ) VALUES (
              gen_random_uuid(), NEW.id,
              v_rec.component_service_id,
              NEW.service_id,
              v_profile_group_id,
              v_barcode,
              COALESCE(NEW.priority, 'Routine'),
              'Ordered', NOW()
            );
            v_has_components := true;
          END LOOP;
        END IF;

        -- Fallback: Single service OR Profile with zero active components
        IF NOT v_has_components THEN
          -- Resolve specimen type for this single service
          SELECT specimen_id INTO v_specimen_id
          FROM lims_service_configs
          WHERE service_id = NEW.service_id;

          -- Reuse existing barcode if another service with same specimen was already inserted for this appointment
          v_barcode := NULL;
          IF NEW.appointment_id IS NOT NULL THEN
            SELECT l.barcode_no INTO v_barcode
            FROM lims_lab_orders l
            JOIN service_orders s ON l.service_order_id = s.id
            LEFT JOIN lims_service_configs c ON l.service_id = c.service_id
            WHERE s.appointment_id = NEW.appointment_id
              AND (
                (v_specimen_id IS NOT NULL AND c.specimen_id = v_specimen_id)
                OR (v_specimen_id IS NULL AND c.specimen_id IS NULL)
              )
            LIMIT 1;
          END IF;

          -- Generate new barcode if none found
          IF v_barcode IS NULL THEN
            v_barcode := 'BAR-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
          END IF;

          INSERT INTO lims_lab_orders (
            id, service_order_id, service_id, source_profile_service_id,
            profile_group_id, barcode_no, priority, status, ordered_at
          ) VALUES (
            gen_random_uuid(), NEW.id,
            NEW.service_id, NULL, NULL,
            v_barcode,
            COALESCE(NEW.priority, 'Routine'),
            'Ordered', NOW()
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
