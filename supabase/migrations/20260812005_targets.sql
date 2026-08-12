-- ============================================================================
-- MIGRATION 005: Flexible Targets Table with Partial Unique Indexes
-- ============================================================================

-- ============================================================================
-- TARGETS — supports month / quarter / year granularity per segment & employee
--
-- Examples:
--   period_type='month',   period_value=1,    year=2026  → January target
--   period_type='quarter', period_value=2,    year=2026  → Q2 target
--   period_type='year',    period_value=NULL, year=2026  → Annual target
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id   UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,  -- NULL = segment-wide
  year         INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  period_type  VARCHAR(20) NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  period_value INTEGER CHECK (
    (period_type = 'month'   AND period_value BETWEEN 1 AND 12) OR
    (period_type = 'quarter' AND period_value BETWEEN 1 AND 4)  OR
    (period_type = 'year'    AND period_value IS NULL)
  ),
  target_value NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (target_value >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_targets_updated
  BEFORE UPDATE ON public.targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- PARTIAL UNIQUE INDEXES
-- Required because standard UNIQUE (segment_id, user_id, ...) treats
-- every NULL as distinct in PostgreSQL — allowing duplicate segment-wide rows.
-- ============================================================================

-- One segment-wide target per (segment, period_type, period_value, year)
CREATE UNIQUE INDEX IF NOT EXISTS uq_segment_period_target
  ON public.targets (segment_id, year, period_type, COALESCE(period_value, 0))
  WHERE user_id IS NULL;

-- One employee target per (segment, user, period_type, period_value, year)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_period_target
  ON public.targets (segment_id, user_id, year, period_type, COALESCE(period_value, 0))
  WHERE user_id IS NOT NULL;
