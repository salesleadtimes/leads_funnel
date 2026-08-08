-- Complete SQL Schema & Seed Migration for HP Sales Funnel (Supabase / PostgreSQL)

-- ==========================================
-- 1. CREATE TABLES
-- ==========================================

-- Create leads table
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

-- Create targets table
CREATE TABLE IF NOT EXISTS targets (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
  daily NUMERIC NOT NULL DEFAULT 15000,
  weekly NUMERIC NOT NULL DEFAULT 100000,
  monthly NUMERIC NOT NULL DEFAULT 400000,
  quarterly NUMERIC NOT NULL DEFAULT 1200000,
  yearly NUMERIC NOT NULL DEFAULT 5000000
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

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

-- ==========================================
-- 3. SEED DATA
-- ==========================================

-- Insert default target
INSERT INTO targets (id, daily, weekly, monthly, quarterly, yearly)
VALUES ('default', 15000, 100000, 400000, 1200000, 5000000)
ON CONFLICT (id) DO UPDATE SET
  daily = EXCLUDED.daily,
  weekly = EXCLUDED.weekly,
  monthly = EXCLUDED.monthly,
  quarterly = EXCLUDED.quarterly,
  yearly = EXCLUDED.yearly;

-- Insert seed leads
INSERT INTO leads (
  id, org_name, sector, dept_industry, contact_person, phone, email,
  product_category, model, qty, est_value, source, tender_ref, stage,
  expected_close, next_follow_up, sales_person, remarks, created_date, closed_date
) VALUES
(
  'HPQ-MZN001',
  'District Collectorate, Muzaffarnagar',
  'Government',
  'Revenue Dept',
  'R.K. Sharma',
  '9876543210',
  '',
  'MFD (Multi-Function Device)',
  'HP LaserJet MFP M436n',
  12,
  540000,
  'Government Tender (CPPP/eProc)',
  'MZN/2026/IT/017',
  'Technical Evaluation',
  CURRENT_DATE + INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '2 days',
  'RK Jindal',
  'EMD submitted, awaiting technical bid opening.',
  CURRENT_DATE - INTERVAL '18 days',
  NULL
),
(
  'HPQ-SPS002',
  'Sanskriti Public School',
  'Non-Government',
  'Education',
  'Principal Office',
  '9812345670',
  '',
  'LaserJet Printer',
  'HP LaserJet Pro M15w',
  5,
  65000,
  'Referral',
  '',
  'Won',
  CURRENT_DATE - INTERVAL '3 days',
  NULL,
  'RK Jindal',
  'PO received and delivered.',
  CURRENT_DATE - INTERVAL '20 days',
  CURRENT_DATE - INTERVAL '3 days'
),
(
  'HPQ-UMS003',
  'UP State Medical College',
  'Government',
  'Health Dept',
  'Dr. Verma',
  '',
  '',
  'Document Scanner',
  'HP ScanJet Pro N4600',
  8,
  312000,
  'GeM Portal',
  'GEM/2026/B/998231',
  'Quotation / Bid Submitted',
  CURRENT_DATE + INTERVAL '20 days',
  CURRENT_DATE + INTERVAL '5 days',
  'Sales Team',
  'L1 status pending.',
  CURRENT_DATE - INTERVAL '9 days',
  NULL
),
(
  'HPQ-ATP004',
  'Aarohi Textiles Pvt Ltd',
  'Non-Government',
  'Manufacturing',
  'Purchase Mgr',
  '9911223344',
  '',
  'Ink / Toner Cartridge',
  'HP 26A Toner',
  40,
  88000,
  'Existing Customer Repeat',
  '',
  'PO / Work Order Received',
  CURRENT_DATE + INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '1 day',
  'RK Jindal',
  'Repeat monthly order.',
  CURRENT_DATE - INTERVAL '4 days',
  NULL
),
(
  'HPQ-PRD005',
  'Panchayati Raj Dept, Meerut',
  'Government',
  'Rural Development',
  'BDO Office',
  '',
  '',
  'Inkjet Printer',
  'HP Smart Tank 519',
  25,
  275000,
  'Direct Government RFQ',
  'PRD/MRT/26/44',
  'New Lead',
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '3 days',
  'Sales Team',
  'Enquiry received via block office.',
  CURRENT_DATE - INTERVAL '1 day',
  NULL
),
(
  'HPQ-RCM006',
  'Rotary Club Muzaffarnagar Sanskriti',
  'Non-Government',
  'NGO / Community',
  'Secretary',
  '',
  '',
  'MFD (Multi-Function Device)',
  'HP LaserJet MFP M139',
  1,
  22000,
  'Referral',
  '',
  'Lost',
  CURRENT_DATE - INTERVAL '6 days',
  NULL,
  'RK Jindal',
  'Went with a competitor on price.',
  CURRENT_DATE - INTERVAL '15 days',
  CURRENT_DATE - INTERVAL '6 days'
)
ON CONFLICT (id) DO NOTHING;
