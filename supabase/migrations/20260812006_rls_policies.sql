-- ============================================================================
-- MIGRATION 006: Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_segments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_lead_sources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_lead_stages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gem_bids                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stage_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targets                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_number_sequences     ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_owner_all"
  ON public.profiles FOR ALL
  USING (public.is_owner(auth.uid()));

CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================================
-- SEGMENTS
-- Members only see their assigned segments; owners see all
-- ============================================================================
CREATE POLICY "segments_select"
  ON public.segments FOR SELECT
  USING (
    public.is_owner(auth.uid()) OR id IN (
      SELECT segment_id FROM public.user_segments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "segments_owner_all"
  ON public.segments FOR ALL
  USING (public.is_owner(auth.uid()));

-- ============================================================================
-- USER_SEGMENTS
-- ============================================================================
CREATE POLICY "user_segments_owner_all"
  ON public.user_segments FOR ALL
  USING (public.is_owner(auth.uid()));

CREATE POLICY "user_segments_self_select"
  ON public.user_segments FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- SECTORS (global — any authenticated user can read)
-- ============================================================================
CREATE POLICY "sectors_select_authenticated"
  ON public.sectors FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sectors_owner_all"
  ON public.sectors FOR ALL
  USING (public.is_owner(auth.uid()));

-- ============================================================================
-- PRODUCT CATEGORIES
-- Members can only read categories mapped to their own assigned segments.
-- This prevents E-Waste members from seeing Printer categories.
-- ============================================================================
CREATE POLICY "product_categories_select_segment_scoped"
  ON public.product_categories FOR SELECT
  USING (
    public.is_owner(auth.uid()) OR EXISTS (
      SELECT 1
      FROM public.segment_product_categories spc
      JOIN public.user_segments us ON us.segment_id = spc.segment_id
      WHERE us.user_id = auth.uid()
        AND spc.category_id = public.product_categories.id
    )
  );

CREATE POLICY "product_categories_owner_all"
  ON public.product_categories FOR ALL
  USING (public.is_owner(auth.uid()));

CREATE POLICY "segment_product_categories_select_authenticated"
  ON public.segment_product_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "segment_product_categories_owner_all"
  ON public.segment_product_categories FOR ALL
  USING (public.is_owner(auth.uid()));

-- ============================================================================
-- LEAD SOURCES — segment-scoped
-- ============================================================================
CREATE POLICY "lead_sources_select_segment_scoped"
  ON public.lead_sources FOR SELECT
  USING (
    public.is_owner(auth.uid()) OR EXISTS (
      SELECT 1
      FROM public.segment_lead_sources sls
      JOIN public.user_segments us ON us.segment_id = sls.segment_id
      WHERE us.user_id = auth.uid()
        AND sls.source_id = public.lead_sources.id
    )
  );

CREATE POLICY "lead_sources_owner_all"
  ON public.lead_sources FOR ALL
  USING (public.is_owner(auth.uid()));

CREATE POLICY "segment_lead_sources_select_authenticated"
  ON public.segment_lead_sources FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "segment_lead_sources_owner_all"
  ON public.segment_lead_sources FOR ALL
  USING (public.is_owner(auth.uid()));

-- ============================================================================
-- LEAD STAGES — segment-scoped
-- ============================================================================
CREATE POLICY "lead_stages_select_segment_scoped"
  ON public.lead_stages FOR SELECT
  USING (
    public.is_owner(auth.uid()) OR EXISTS (
      SELECT 1
      FROM public.segment_lead_stages slst
      JOIN public.user_segments us ON us.segment_id = slst.segment_id
      WHERE us.user_id = auth.uid()
        AND slst.stage_id = public.lead_stages.id
    )
  );

CREATE POLICY "lead_stages_owner_all"
  ON public.lead_stages FOR ALL
  USING (public.is_owner(auth.uid()));

CREATE POLICY "segment_lead_stages_select_authenticated"
  ON public.segment_lead_stages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "segment_lead_stages_owner_all"
  ON public.segment_lead_stages FOR ALL
  USING (public.is_owner(auth.uid()));

-- ============================================================================
-- LEADS
-- Owners see all non-deleted leads.
-- Members see only non-deleted leads in their assigned segments.
-- Only owners can permanently delete (soft-delete via UPDATE is allowed to members).
-- ============================================================================
CREATE POLICY "leads_select"
  ON public.leads FOR SELECT
  USING (
    deleted_at IS NULL AND (
      public.is_owner(auth.uid()) OR
      public.has_segment_access(segment_id, auth.uid())
    )
  );

CREATE POLICY "leads_insert"
  ON public.leads FOR INSERT
  WITH CHECK (public.has_segment_access(segment_id, auth.uid()));

CREATE POLICY "leads_update"
  ON public.leads FOR UPDATE
  USING (public.has_segment_access(segment_id, auth.uid()));

-- Physical DELETE restricted to owners only
CREATE POLICY "leads_hard_delete_owner_only"
  ON public.leads FOR DELETE
  USING (public.is_owner(auth.uid()));

-- ============================================================================
-- GEM_BIDS
-- ============================================================================
CREATE POLICY "gem_bids_select"
  ON public.gem_bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = gem_bids.lead_id
        AND l.deleted_at IS NULL
        AND public.has_segment_access(l.segment_id, auth.uid())
    )
  );

CREATE POLICY "gem_bids_upsert"
  ON public.gem_bids FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = gem_bids.lead_id
        AND public.has_segment_access(l.segment_id, auth.uid())
    )
  );

-- ============================================================================
-- LEAD STAGE HISTORY
-- ============================================================================
CREATE POLICY "stage_history_select"
  ON public.lead_stage_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_stage_history.lead_id
        AND public.has_segment_access(l.segment_id, auth.uid())
    )
  );

CREATE POLICY "stage_history_insert_trigger_only"
  ON public.lead_stage_history FOR INSERT
  WITH CHECK (true);  -- inserts handled by SECURITY DEFINER trigger only

-- ============================================================================
-- TARGETS
-- Members can read targets for their segments; owners manage all.
-- ============================================================================
CREATE POLICY "targets_select"
  ON public.targets FOR SELECT
  USING (
    public.is_owner(auth.uid()) OR
    public.has_segment_access(segment_id, auth.uid())
  );

CREATE POLICY "targets_owner_all"
  ON public.targets FOR ALL
  USING (public.is_owner(auth.uid()));

-- ============================================================================
-- LEAD NUMBER SEQUENCES (internal — owner/service role only)
-- ============================================================================
CREATE POLICY "lead_number_sequences_service_only"
  ON public.lead_number_sequences FOR ALL
  USING (public.is_owner(auth.uid()));
