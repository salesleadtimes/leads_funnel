-- Supabase Migration: Create leads and targets tables with RLS policies

-- 1. Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(64) PRIMARY KEY,
  org_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  dept_industry TEXT NOT NULL DEFAULT '',
  contact_person TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  product_category TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  qty INTEGER NOT NULL DEFAULT 1,
  est_value NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT '',
  tender_ref TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL,
  expected_close DATE,
  next_follow_up DATE,
  sales_person TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_date DATE
);

-- 2. Create targets table
CREATE TABLE IF NOT EXISTS targets (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
  daily NUMERIC NOT NULL DEFAULT 15000,
  weekly NUMERIC NOT NULL DEFAULT 100000,
  monthly NUMERIC NOT NULL DEFAULT 400000,
  quarterly NUMERIC NOT NULL DEFAULT 1200000,
  yearly NUMERIC NOT NULL DEFAULT 5000000
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies allowing full access (anon & authenticated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Enable all access for leads'
  ) THEN
    CREATE POLICY "Enable all access for leads" ON leads FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'targets' AND policyname = 'Enable all access for targets'
  ) THEN
    CREATE POLICY "Enable all access for targets" ON targets FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
