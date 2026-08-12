-- ============================================================================
-- MIGRATION 004: Leads Table, gem_bids Extension & Stage History Audit
-- ============================================================================

-- ============================================================================
-- 1. LEADS (Core CRM entity with composite FKs + soft delete)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number    VARCHAR(64) UNIQUE NOT NULL DEFAULT '',  -- auto-assigned by trigger

  -- Segment scoping
  segment_id     UUID    NOT NULL REFERENCES public.segments(id) ON DELETE RESTRICT,

  -- Organisation
  org_name       TEXT    NOT NULL,
  sector_id      UUID    REFERENCES public.sectors(id),
  dept_industry  TEXT    NOT NULL DEFAULT '',
  contact_person TEXT    NOT NULL DEFAULT '',
  phone          TEXT    NOT NULL DEFAULT '',
  email          TEXT    NOT NULL DEFAULT '',

  -- Product (composite FK ensures valid combo for this segment)
  category_id    UUID    NOT NULL,
  model_details  TEXT    NOT NULL DEFAULT '',
  qty            INTEGER NOT NULL DEFAULT 1   CHECK (qty >= 0),
  est_value      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (est_value >= 0),

  -- Pipeline (composite FKs)
  source_id      UUID    NOT NULL,
  stage_id       UUID    NOT NULL,

  -- People
  assigned_to    UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by     UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Dates & remarks
  expected_close  DATE,
  next_follow_up  DATE,
  remarks         TEXT   DEFAULT '',
  closed_date     DATE,

  -- Auditing
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL,   -- soft delete — never physical DELETE

  -- -------------------------------------------------------------------------
  -- COMPOSITE FOREIGN KEYS
  -- Guarantees the chosen category/source/stage is mapped for this segment
  -- -------------------------------------------------------------------------
  CONSTRAINT fk_leads_segment_category
    FOREIGN KEY (segment_id, category_id)
    REFERENCES public.segment_product_categories(segment_id, category_id),

  CONSTRAINT fk_leads_segment_source
    FOREIGN KEY (segment_id, source_id)
    REFERENCES public.segment_lead_sources(segment_id, source_id),

  CONSTRAINT fk_leads_segment_stage
    FOREIGN KEY (segment_id, stage_id)
    REFERENCES public.segment_lead_stages(segment_id, stage_id)
);

-- Auto-assign lead number before INSERT
CREATE TRIGGER trg_leads_auto_number
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.assign_lead_number();

-- Auto-update updated_at
CREATE TRIGGER trg_leads_updated
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Performance indexes (designed for 100k+ records)
CREATE INDEX IF NOT EXISTS idx_leads_segment        ON public.leads(segment_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned        ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_stage           ON public.leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_created         ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_segment_stage   ON public.leads(segment_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_expected_close  ON public.leads(expected_close);
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at      ON public.leads(deleted_at);

-- ============================================================================
-- 2. GEM_BIDS (1:0..1 extension — only for GeM / government tender leads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gem_bids (
  lead_id        UUID PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  gem_bid_number TEXT NOT NULL,
  tender_ref     TEXT DEFAULT '',
  bid_end_date   TIMESTAMPTZ,
  bid_status     VARCHAR(30) NOT NULL DEFAULT 'draft'
                   CHECK (bid_status IN ('draft','submitted','l1_pending','awarded','disqualified','cancelled')),
  emd_amount     NUMERIC(15,2) DEFAULT 0,
  emd_status     VARCHAR(30) DEFAULT 'not_required',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gem_bids_number ON public.gem_bids(gem_bid_number);
CREATE INDEX IF NOT EXISTS idx_gem_bids_status ON public.gem_bids(bid_status);

CREATE TRIGGER trg_gem_bids_updated
  BEFORE UPDATE ON public.gem_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. LEAD STAGE HISTORY (Audit trail for pipeline transitions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_stage_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.lead_stages(id),   -- NULL on first insert
  to_stage_id  UUID NOT NULL REFERENCES public.lead_stages(id),
  changed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  remarks      TEXT DEFAULT '',
  changed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_lead       ON public.lead_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_changed_at ON public.lead_stage_history(changed_at);

-- Auto-log stage changes
CREATE OR REPLACE FUNCTION public.log_lead_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log on INSERT (initial stage) or when stage_id changes
  IF (TG_OP = 'INSERT') OR (OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    INSERT INTO public.lead_stage_history
      (lead_id, from_stage_id, to_stage_id, changed_by, remarks)
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.stage_id ELSE NULL END,
      NEW.stage_id,
      auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'Lead created' ELSE 'Stage updated' END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_leads_log_stage_change
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_stage_change();
