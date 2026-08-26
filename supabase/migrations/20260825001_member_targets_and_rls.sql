-- ============================================================================
-- MIGRATION 20260825001: Member-Specific Targets, Full Period Granularity & Strict Lead Edit RLS
-- ============================================================================

-- 1. Safely drop any existing CHECK constraints on targets table
--    (handles default Postgres names like targets_check, targets_check1, etc.)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.targets'::regclass 
      AND contype = 'c'
      AND conname != 'targets_target_value_check'
  ) LOOP
    EXECUTE 'ALTER TABLE public.targets DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Explicit drops as additional fallback:
ALTER TABLE public.targets DROP CONSTRAINT IF EXISTS targets_check;
ALTER TABLE public.targets DROP CONSTRAINT IF EXISTS targets_check1;
ALTER TABLE public.targets DROP CONSTRAINT IF EXISTS targets_check2;
ALTER TABLE public.targets DROP CONSTRAINT IF EXISTS targets_period_type_check;
ALTER TABLE public.targets DROP CONSTRAINT IF EXISTS targets_period_value_check;

-- 2. Add expanded CHECK constraints to support all period types & values:
--    'day', 'week', 'month', 'quarter', 'year', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
ALTER TABLE public.targets
  ADD CONSTRAINT targets_period_type_check
  CHECK (period_type IN (
    'day', 'week', 'month', 'quarter', 'year',
    'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  ));

ALTER TABLE public.targets
  ADD CONSTRAINT targets_period_value_check
  CHECK (
    (period_type IN ('day', 'daily')         AND period_value BETWEEN 1 AND 1231) OR
    (period_type IN ('week', 'weekly')       AND period_value BETWEEN 1 AND 53)   OR
    (period_type IN ('month', 'monthly')     AND period_value BETWEEN 1 AND 12)   OR
    (period_type IN ('quarter', 'quarterly') AND period_value BETWEEN 1 AND 4)    OR
    (period_type IN ('year', 'yearly')       AND (period_value IS NULL OR period_value = 0 OR period_value = 1))
  );

-- 3. Ensure partial unique indexes exist for segment-wide and member-specific targets
CREATE UNIQUE INDEX IF NOT EXISTS uq_segment_period_target
  ON public.targets (segment_id, year, period_type, COALESCE(period_value, 0))
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_period_target
  ON public.targets (segment_id, user_id, year, period_type, COALESCE(period_value, 0))
  WHERE user_id IS NOT NULL;

-- 4. Update RLS policies for TARGETS
-- Owners can manage all targets.
-- Members can only read their own targets or segment fallback targets for their assigned segments.
DROP POLICY IF EXISTS "targets_select" ON public.targets;
CREATE POLICY "targets_select"
  ON public.targets FOR SELECT
  USING (
    public.is_owner(auth.uid()) OR (
      public.has_segment_access(segment_id, auth.uid()) AND (
        user_id = auth.uid() OR user_id IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "targets_owner_all" ON public.targets;
CREATE POLICY "targets_owner_all"
  ON public.targets FOR ALL
  USING (public.is_owner(auth.uid()));

-- 5. Update RLS policy for LEADS UPDATE
-- Owners can edit any lead.
-- Members can ONLY edit leads they created within their assigned segments.
DROP POLICY IF EXISTS "leads_update" ON public.leads;
CREATE POLICY "leads_update"
  ON public.leads FOR UPDATE
  USING (
    public.is_owner(auth.uid()) OR (
      created_by = auth.uid() AND public.has_segment_access(segment_id, auth.uid())
    )
  );
