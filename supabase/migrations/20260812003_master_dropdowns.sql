-- ============================================================================
-- MIGRATION 003: Master Dropdown Tables & Segment Mapping Junction Tables
-- ============================================================================

-- ============================================================================
-- 1. SECTORS (Global industry sectors — no segment scoping)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sectors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- ============================================================================
-- 2. PRODUCT CATEGORIES (Global master — mapped per segment via junction)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_product_categories_updated
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.segment_product_categories (
  segment_id    UUID REFERENCES public.segments(id)          ON DELETE CASCADE,
  category_id   UUID REFERENCES public.product_categories(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (segment_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_spc_segment  ON public.segment_product_categories(segment_id);
CREATE INDEX IF NOT EXISTS idx_spc_category ON public.segment_product_categories(category_id);

-- ============================================================================
-- 3. LEAD SOURCES (Global master — mapped per segment via junction)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code      VARCHAR(50) NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.segment_lead_sources (
  segment_id UUID REFERENCES public.segments(id)    ON DELETE CASCADE,
  source_id  UUID REFERENCES public.lead_sources(id) ON DELETE CASCADE,
  PRIMARY KEY (segment_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_sls_segment ON public.segment_lead_sources(segment_id);
CREATE INDEX IF NOT EXISTS idx_sls_source  ON public.segment_lead_sources(source_id);

-- ============================================================================
-- 4. LEAD STAGES / PIPELINE STAGES (Global master — mapped per segment)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  is_won        BOOLEAN DEFAULT false,
  is_lost       BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.segment_lead_stages (
  segment_id    UUID REFERENCES public.segments(id)    ON DELETE CASCADE,
  stage_id      UUID REFERENCES public.lead_stages(id)  ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (segment_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_slst_segment ON public.segment_lead_stages(segment_id);
CREATE INDEX IF NOT EXISTS idx_slst_stage   ON public.segment_lead_stages(stage_id);
