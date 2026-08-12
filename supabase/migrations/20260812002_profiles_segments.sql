-- ============================================================================
-- MIGRATION 002: User Profiles, Business Segments & User-Segment Junction
-- ============================================================================

-- ============================================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  phone      TEXT DEFAULT '',
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. BUSINESS SEGMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.segments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) NOT NULL UNIQUE,  -- e.g. 'PRINTER_SCANNER'
  name        TEXT NOT NULL,                -- e.g. 'Printers & Scanners'
  description TEXT DEFAULT '',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_segments_updated
  BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sequence table FK now that segments exists
ALTER TABLE public.lead_number_sequences
  ADD CONSTRAINT fk_lns_segment
  FOREIGN KEY (segment_id) REFERENCES public.segments(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. N:N JUNCTION: USER ↔ SEGMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_segments (
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  segment_id  UUID REFERENCES public.segments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_user_segments_user    ON public.user_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_segments_segment ON public.user_segments(segment_id);

-- ============================================================================
-- 4. AUTO-CREATE PROFILE TRIGGER ON SUPABASE SIGN-UP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. RLS HELPER FUNCTIONS (available across all subsequent migrations)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_owner(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'owner' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_segment_access(p_segment_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT public.is_owner(p_user_id) OR EXISTS (
    SELECT 1 FROM public.user_segments
    WHERE user_id = p_user_id AND segment_id = p_segment_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
