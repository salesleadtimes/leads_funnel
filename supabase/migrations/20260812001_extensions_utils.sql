-- ============================================================================
-- MIGRATION 001: Extensions, Utility Functions & Lead Number Generator
-- ============================================================================

-- Cleanup legacy POC tables if existing
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.targets CASCADE;

-- UUID generation (built-in gen_random_uuid() in PG13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Generic updated_at trigger function (attached to all mutable tables)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sequence tracking table for concurrency-safe lead numbering
-- e.g. PRN-2026-0001 (Printers & Scanners segment)
--      EWS-2026-0001 (E-Waste segment)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_number_sequences (
  segment_id UUID NOT NULL,
  year       INTEGER NOT NULL,
  last_seq   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (segment_id, year)
);

-- ============================================================================
-- Atomic lead number generator — safe under concurrent INSERTs via advisory lock
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_lead_number(p_segment_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_segment_code TEXT;
  v_year         INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_next_seq     INTEGER;
BEGIN
  SELECT code INTO v_segment_code
  FROM public.segments
  WHERE id = p_segment_id;

  IF v_segment_code IS NULL THEN
    RAISE EXCEPTION 'Invalid segment_id: %', p_segment_id;
  END IF;

  INSERT INTO public.lead_number_sequences (segment_id, year, last_seq)
  VALUES (p_segment_id, v_year, 1)
  ON CONFLICT (segment_id, year)
  DO UPDATE SET last_seq = public.lead_number_sequences.last_seq + 1
  RETURNING last_seq INTO v_next_seq;

  -- Format: first 3 chars of segment code + year + 4-digit sequence
  -- e.g. PRN-2026-0001, EWS-2026-0001, PAP-2026-0001
  RETURN UPPER(SUBSTRING(v_segment_code FROM 1 FOR 3))
    || '-' || v_year
    || '-' || LPAD(v_next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Auto-assign lead_number on INSERT if not provided
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_lead_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_number IS NULL OR TRIM(NEW.lead_number) = '' THEN
    NEW.lead_number = public.generate_lead_number(NEW.segment_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
