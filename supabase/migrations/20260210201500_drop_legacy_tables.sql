-- Drop legacy tables created by the initial setup auto-rename logic.
-- These tables are not used by the app and only add confusion/clutter.
-- Safe to run even if they don't exist.

DO $$
DECLARE
  r record;
BEGIN
  -- Drop any timestamp-suffixed legacy tables (usuarios_legacy_YYYY..., ofertas_legacy_YYYY...)
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND (
        table_name LIKE 'usuarios_legacy_%'
        OR table_name LIKE 'ofertas_legacy_%'
      )
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', r.table_schema, r.table_name);
  END LOOP;

  -- Also drop plain legacy names if they exist
  EXECUTE 'DROP TABLE IF EXISTS public.usuarios_legacy CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS public.ofertas_legacy CASCADE';
END $$;

