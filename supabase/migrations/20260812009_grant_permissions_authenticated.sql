-- ============================================================================
-- MIGRATION 009: Grant Schema & Table Permissions to Authenticated Role
-- Ensures authenticated, anon, and service_role have full access to schema,
-- tables, sequences, routines, and default privileges.
-- ============================================================================

-- 1. Schema-level usage grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Table-level grants for all existing tables in public schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Sequence-level grants (e.g. for id generations / counters)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 4. Function / Routine-level execution grants
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;

-- 5. Set default privileges for any future tables, sequences, and functions created in public
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- ============================================================================
-- 6. OWNER SEGMENTS SYNC TRIGGER & BACKFILL
-- Automatically assigns all active segments to any user with role = 'owner'
-- ============================================================================

-- Function to assign all active segments to owner
CREATE OR REPLACE FUNCTION public.sync_owner_segments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    INSERT INTO public.user_segments (user_id, segment_id)
    SELECT NEW.id, s.id
    FROM public.segments s
    WHERE s.is_active = true
    ON CONFLICT (user_id, segment_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on insert or role update in profiles
DROP TRIGGER IF EXISTS trg_sync_owner_segments ON public.profiles;
CREATE TRIGGER trg_sync_owner_segments
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_owner_segments();

-- Backfill: Ensure all current owners have all active segments mapped
INSERT INTO public.user_segments (user_id, segment_id)
SELECT p.id, s.id
FROM public.profiles p
CROSS JOIN public.segments s
WHERE p.role = 'owner'
  AND s.is_active = true
ON CONFLICT (user_id, segment_id) DO NOTHING;
