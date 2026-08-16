-- ============================================================================
-- MIGRATION 008: Direct Foreign Keys for Leads Master Entities
-- Allows PostgREST to directly resolve relationships for product_categories,
-- lead_sources, and lead_stages on the leads table.
-- ============================================================================

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS fk_leads_category,
  ADD CONSTRAINT fk_leads_category
    FOREIGN KEY (category_id) REFERENCES public.product_categories(id);

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS fk_leads_source,
  ADD CONSTRAINT fk_leads_source
    FOREIGN KEY (source_id) REFERENCES public.lead_sources(id);

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS fk_leads_stage,
  ADD CONSTRAINT fk_leads_stage
    FOREIGN KEY (stage_id) REFERENCES public.lead_stages(id);
