-- ============================================================================
-- MIGRATION 20260904001: Consolidated Member Targets (One Daily Target per User+Segment+Year)
-- ============================================================================
--
-- This migration replaces the multi-period target model (5 rows per user+segment+year:
-- daily/weekly/monthly/quarterly/yearly) with a single daily_target_amount per
-- (user_id, segment_id, year). All other period amounts are derived in the
-- application layer via: daily x {7, 30, 90, 365}.
--
-- The old `targets` table is PRESERVED for:
--   1. Historical achievement tracking queries (getTargetAchievement reads from it)
--   2. Backward compatibility during the transition window
-- All new writes go to `member_targets`.
--
-- Calculation rules (fixed multipliers per spec):
--   Weekly    = daily x 7
--   Monthly   = daily x 30
--   Quarterly = daily x 90
--   Annual    = daily x 365
-- ============================================================================

-- ============================================================================
-- 1. CREATE member_targets TABLE
-- ============================================================================
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

-- Auto-update updated_at
CREATE TRIGGER trg_member_targets_updated
  BEFORE UPDATE ON public.member_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_member_targets_user_id    ON public.member_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_member_targets_segment_id ON public.member_targets(segment_id);
CREATE INDEX IF NOT EXISTS idx_member_targets_year       ON public.member_targets(year);

-- ============================================================================
-- 2. MIGRATE EXISTING DATA from `targets` to `member_targets`
-- ============================================================================
-- Strategy: For each (user_id, segment_id, year) group in the old targets table,
-- pick the best daily amount using this priority order:
--   1. Explicit 'daily'/'day' record (direct value)
--   2. Monthly record / 30
--   3. Weekly record / 7
--   4. Quarterly record / 90
--   5. Yearly record / 365
-- Only migrates records where target_value > 0.
-- ============================================================================
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

-- ============================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================================================
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

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_targets TO authenticated;
