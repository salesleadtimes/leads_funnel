-- ============================================================================
-- Supabase Seed Data for HP Sales Funnel App
-- ============================================================================

-- 1. Insert default segment-wide targets
INSERT INTO public.targets (segment_id, year, period_type, period_value, target_value)
VALUES
  ('11111111-0000-0000-0000-000000000001', 2026, 'month',   1,    400000.00),
  ('11111111-0000-0000-0000-000000000001', 2026, 'quarter', 1,   1200000.00),
  ('11111111-0000-0000-0000-000000000001', 2026, 'year',    NULL, 5000000.00)
ON CONFLICT DO NOTHING;
