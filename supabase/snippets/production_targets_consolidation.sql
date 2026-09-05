-- ============================================================================
-- PRODUCTION DB FIX SCRIPT
-- Purpose: Consolidate existing multi-period target rows in the `targets` table
--          into the new `member_targets` table (one row per user+segment+year).
--
-- Run this ONCE on your production Supabase database (SQL Editor or psql).
--
-- Safe to re-run: Uses ON CONFLICT ... DO UPDATE (idempotent).
--
-- Priority for back-calculating daily amount from existing records:
--   1. 'daily'/'day' record (used directly)
--   2. 'monthly'/'month' record ÷ 30
--   3. 'weekly'/'week' record ÷ 7
--   4. 'quarterly'/'quarter' record ÷ 90
--   5. 'yearly'/'year' record ÷ 365
-- ============================================================================

-- ── STEP 1: Verify what's in your existing targets table ─────────────────────
-- (Review before running the migration — no writes yet)

SELECT
  period_type,
  COUNT(*) AS record_count,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT segment_id) AS unique_segments,
  MIN(target_value) AS min_value,
  MAX(target_value) AS max_value
FROM public.targets
GROUP BY period_type
ORDER BY record_count DESC;

-- ── STEP 2: Create the member_targets table if not already present ────────────
-- (The migration file should have already run this; this is a safety check)

CREATE TABLE IF NOT EXISTS public.member_targets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id          UUID    NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  user_id             UUID    REFERENCES public.profiles(id) ON DELETE CASCADE,
  year                INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  daily_target_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (daily_target_amount >= 0),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_member_segment_year_target UNIQUE (segment_id, user_id, year)
);

-- Add updated_at trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_member_targets_updated'
  ) THEN
    CREATE TRIGGER trg_member_targets_updated
      BEFORE UPDATE ON public.member_targets
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_targets_user_id    ON public.member_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_member_targets_segment_id ON public.member_targets(segment_id);
CREATE INDEX IF NOT EXISTS idx_member_targets_year       ON public.member_targets(year);

-- RLS
ALTER TABLE public.member_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_targets_owner_all" ON public.member_targets;
CREATE POLICY "member_targets_owner_all"
  ON public.member_targets FOR ALL
  USING (public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "member_targets_select" ON public.member_targets;
CREATE POLICY "member_targets_select"
  ON public.member_targets FOR SELECT
  USING (
    public.is_owner(auth.uid()) OR (
      public.has_segment_access(segment_id, auth.uid()) AND (
        user_id = auth.uid() OR user_id IS NULL
      )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_targets TO authenticated;

-- ── STEP 3: Preview the consolidation (DRY RUN — no writes) ──────────────────

WITH ranked_targets AS (
  SELECT
    segment_id,
    user_id,
    year,
    target_value,
    period_type,
    CASE
      WHEN period_type IN ('daily', 'day')         THEN target_value
      WHEN period_type IN ('monthly', 'month')     THEN ROUND(target_value / 30.0, 2)
      WHEN period_type IN ('weekly', 'week')       THEN ROUND(target_value / 7.0, 2)
      WHEN period_type IN ('quarterly', 'quarter') THEN ROUND(target_value / 90.0, 2)
      WHEN period_type IN ('yearly', 'year')       THEN ROUND(target_value / 365.0, 2)
      ELSE target_value
    END AS implied_daily,
    CASE
      WHEN period_type IN ('daily', 'day')         THEN 1
      WHEN period_type IN ('monthly', 'month')     THEN 2
      WHEN period_type IN ('weekly', 'week')       THEN 3
      WHEN period_type IN ('quarterly', 'quarter') THEN 4
      WHEN period_type IN ('yearly', 'year')       THEN 5
      ELSE 6
    END AS priority
  FROM public.targets
  WHERE target_value > 0
),
best_per_group AS (
  SELECT DISTINCT ON (segment_id, COALESCE(user_id::text, 'NULL'), year)
    segment_id,
    user_id,
    year,
    period_type AS source_period_type,
    target_value AS original_value,
    implied_daily AS daily_target_amount
  FROM ranked_targets
  ORDER BY segment_id, COALESCE(user_id::text, 'NULL'), year, priority ASC, implied_daily DESC
)
SELECT
  b.segment_id,
  s.name AS segment_name,
  b.user_id,
  p.full_name AS member_name,
  p.email AS member_email,
  b.year,
  b.source_period_type,
  b.original_value,
  b.daily_target_amount,
  -- Derived values for verification
  ROUND(b.daily_target_amount * 7, 2)   AS weekly_target,
  ROUND(b.daily_target_amount * 30, 2)  AS monthly_target,
  ROUND(b.daily_target_amount * 90, 2)  AS quarterly_target,
  ROUND(b.daily_target_amount * 365, 2) AS annual_target
FROM best_per_group b
LEFT JOIN public.segments  s ON s.id = b.segment_id
LEFT JOIN public.profiles  p ON p.id = b.user_id
WHERE b.daily_target_amount > 0
ORDER BY b.year DESC, p.full_name, s.name;

-- ── STEP 4: Execute the consolidation (WRITE) ─────────────────────────────────
-- After reviewing the preview above, run this block:

INSERT INTO public.member_targets (segment_id, user_id, year, daily_target_amount)
WITH ranked_targets AS (
  SELECT
    segment_id,
    user_id,
    year,
    target_value,
    period_type,
    CASE
      WHEN period_type IN ('daily', 'day')         THEN target_value
      WHEN period_type IN ('monthly', 'month')     THEN ROUND(target_value / 30.0, 2)
      WHEN period_type IN ('weekly', 'week')       THEN ROUND(target_value / 7.0, 2)
      WHEN period_type IN ('quarterly', 'quarter') THEN ROUND(target_value / 90.0, 2)
      WHEN period_type IN ('yearly', 'year')       THEN ROUND(target_value / 365.0, 2)
      ELSE target_value
    END AS implied_daily,
    CASE
      WHEN period_type IN ('daily', 'day')         THEN 1
      WHEN period_type IN ('monthly', 'month')     THEN 2
      WHEN period_type IN ('weekly', 'week')       THEN 3
      WHEN period_type IN ('quarterly', 'quarter') THEN 4
      WHEN period_type IN ('yearly', 'year')       THEN 5
      ELSE 6
    END AS priority
  FROM public.targets
  WHERE target_value > 0
),
best_per_group AS (
  SELECT DISTINCT ON (segment_id, COALESCE(user_id::text, 'NULL'), year)
    segment_id,
    user_id,
    year,
    implied_daily AS daily_target_amount
  FROM ranked_targets
  ORDER BY segment_id, COALESCE(user_id::text, 'NULL'), year, priority ASC, implied_daily DESC
)
SELECT segment_id, user_id, year, daily_target_amount
FROM best_per_group
WHERE daily_target_amount > 0
ON CONFLICT ON CONSTRAINT uq_member_segment_year_target DO UPDATE
  SET daily_target_amount = EXCLUDED.daily_target_amount,
      updated_at = NOW();

-- ── STEP 5: Verify the migration ─────────────────────────────────────────────

SELECT
  mt.id,
  s.name AS segment_name,
  p.full_name AS member_name,
  p.email,
  mt.year,
  mt.daily_target_amount,
  ROUND(mt.daily_target_amount * 7, 2)   AS weekly_target,
  ROUND(mt.daily_target_amount * 30, 2)  AS monthly_target,
  ROUND(mt.daily_target_amount * 90, 2)  AS quarterly_target,
  ROUND(mt.daily_target_amount * 365, 2) AS annual_target,
  mt.created_at,
  mt.updated_at
FROM public.member_targets mt
LEFT JOIN public.segments s ON s.id = mt.segment_id
LEFT JOIN public.profiles p ON p.id = mt.user_id
ORDER BY mt.year DESC, p.full_name, s.name;

-- ── STEP 6: Count comparison ──────────────────────────────────────────────────

SELECT
  'Old targets table (all rows)' AS source,
  COUNT(*) AS row_count,
  COUNT(DISTINCT (user_id::text || segment_id::text || year::text)) AS unique_combos
FROM public.targets
WHERE user_id IS NOT NULL

UNION ALL

SELECT
  'New member_targets table' AS source,
  COUNT(*) AS row_count,
  COUNT(DISTINCT (user_id::text || segment_id::text || year::text)) AS unique_combos
FROM public.member_targets
WHERE user_id IS NOT NULL;
