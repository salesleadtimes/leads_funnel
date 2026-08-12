-- ============================================================================
-- MIGRATION 007: Seed Data
-- Segments, Master Dropdowns, Segment Mappings, Sectors
-- ============================================================================

-- ============================================================================
-- 1. SEGMENTS
-- ============================================================================
INSERT INTO public.segments (id, code, name, description) VALUES
  ('11111111-0000-0000-0000-000000000001', 'PRINTER_SCANNER', 'Printers & Scanners',         'HP printers, scanners, MFDs, and consumables'),
  ('11111111-0000-0000-0000-000000000002', 'E_WASTE',         'E-Waste Management',           'Electronic scrap, ITAD, and recycling services'),
  ('11111111-0000-0000-0000-000000000003', 'PAPER_NAPKIN',    'Paper Napkins & Disposables',  'Tissue rolls, napkins, eco-cutlery'),
  ('11111111-0000-0000-0000-000000000004', 'IT_HARDWARE',     'IT Hardware',                  'Laptops, desktops, servers, networking')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. SECTORS
-- ============================================================================
INSERT INTO public.sectors (name, display_order) VALUES
  ('Government',           1),
  ('Non-Government',       2),
  ('Education',            3),
  ('Healthcare',           4),
  ('Manufacturing',        5),
  ('Rural Development',    6),
  ('NGO / Community',      7),
  ('Defence',              8),
  ('Banking / Finance',    9),
  ('Retail',               10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. LEAD STAGES (Global Pipeline — segment mappings below)
-- ============================================================================
INSERT INTO public.lead_stages (id, code, name, is_won, is_lost) VALUES
  ('22222222-0000-0000-0000-000000000001', 'NEW_LEAD',       'New Lead',                   false, false),
  ('22222222-0000-0000-0000-000000000002', 'CONTACTED',      'Contacted',                  false, false),
  ('22222222-0000-0000-0000-000000000003', 'SITE_SURVEY',    'Site Survey / Demo',         false, false),
  ('22222222-0000-0000-0000-000000000004', 'QUOTE_SUBMITTED','Quotation / Bid Submitted',  false, false),
  ('22222222-0000-0000-0000-000000000005', 'TECH_EVAL',      'Technical Evaluation',       false, false),
  ('22222222-0000-0000-0000-000000000006', 'NEGOTIATION',    'Negotiation',                false, false),
  ('22222222-0000-0000-0000-000000000007', 'PO_RECEIVED',    'PO / Work Order Received',   false, false),
  ('22222222-0000-0000-0000-000000000008', 'WON',            'Won',                        true,  false),
  ('22222222-0000-0000-0000-000000000009', 'LOST',           'Lost',                       false, true),
  ('22222222-0000-0000-0000-000000000010', 'ON_HOLD',        'On Hold',                    false, false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. LEAD SOURCES (Global Master)
-- ============================================================================
INSERT INTO public.lead_sources (id, code, name) VALUES
  ('33333333-0000-0000-0000-000000000001', 'GEM_PORTAL',        'GeM Portal'),
  ('33333333-0000-0000-0000-000000000002', 'CPPP_TENDER',       'Government Tender (CPPP/eProc)'),
  ('33333333-0000-0000-0000-000000000003', 'DIRECT_GOVT_RFQ',   'Direct Government RFQ'),
  ('33333333-0000-0000-0000-000000000004', 'CORPORATE_RFQ',     'Corporate RFQ'),
  ('33333333-0000-0000-0000-000000000005', 'REFERRAL',          'Referral'),
  ('33333333-0000-0000-0000-000000000006', 'COLD_CALL',         'Cold Call'),
  ('33333333-0000-0000-0000-000000000007', 'WEBSITE_ENQUIRY',   'Website Enquiry'),
  ('33333333-0000-0000-0000-000000000008', 'EXISTING_CUSTOMER', 'Existing Customer Repeat'),
  ('33333333-0000-0000-0000-000000000009', 'CHANNEL_PARTNER',   'Channel Partner')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 5. PRODUCT CATEGORIES (Global Master — segment-specific via mapping)
-- ============================================================================
INSERT INTO public.product_categories (id, code, name) VALUES
  -- Printers & Scanners
  ('44444444-0000-0000-0000-000000000001', 'INKJET_PRINTER',     'Inkjet Printer'),
  ('44444444-0000-0000-0000-000000000002', 'LASERJET_PRINTER',   'LaserJet Printer'),
  ('44444444-0000-0000-0000-000000000003', 'MFD',                'MFD (Multi-Function Device)'),
  ('44444444-0000-0000-0000-000000000004', 'DOC_SCANNER',        'Document Scanner'),
  ('44444444-0000-0000-0000-000000000005', 'FLATBED_SCANNER',    'Flatbed Scanner'),
  ('44444444-0000-0000-0000-000000000006', 'LARGE_FORMAT',       'Large Format / Plotter'),
  ('44444444-0000-0000-0000-000000000007', 'TONER_INK',          'Ink / Toner Cartridge'),
  ('44444444-0000-0000-0000-000000000008', 'AMC_SERVICE',        'AMC / Service Contract'),
  ('44444444-0000-0000-0000-000000000009', 'SPARE_PARTS',        'Spare Parts'),
  ('44444444-0000-0000-0000-000000000010', 'BARCODE_PRINTER',    'Barcode Scanner & Printer'),
  -- E-Waste
  ('44444444-0000-0000-0000-000000000011', 'EWASTE_SCRAP',       'Electronic Scrap (PCBs, Motherboards)'),
  ('44444444-0000-0000-0000-000000000012', 'BATTERY_WASTE',      'Battery Waste & UPS Lead-Acid'),
  ('44444444-0000-0000-0000-000000000013', 'EWASTE_SERVICE',     'E-Waste Processing & Recycling'),
  ('44444444-0000-0000-0000-000000000014', 'ITAD',               'IT Asset Disposition (ITAD)'),
  -- Paper Napkins
  ('44444444-0000-0000-0000-000000000015', 'TISSUE_ROLLS',       'Tissue Rolls & Dispenser Packs'),
  ('44444444-0000-0000-0000-000000000016', 'FACIAL_TISSUE',      'Facial Tissues & Dinner Napkins'),
  ('44444444-0000-0000-0000-000000000017', 'ECO_CUTLERY',        'Eco-Friendly Cutlery & Plates'),
  ('44444444-0000-0000-0000-000000000018', 'PAPER_WIPES',        'Industrial Paper Wipes'),
  -- IT Hardware
  ('44444444-0000-0000-0000-000000000019', 'LAPTOP_DESKTOP',     'Laptops & Desktops'),
  ('44444444-0000-0000-0000-000000000020', 'SERVER_STORAGE',     'Servers & Storage Arrays'),
  ('44444444-0000-0000-0000-000000000021', 'NETWORKING',         'Networking Equipment')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 6. SEGMENT ↔ PRODUCT CATEGORY MAPPINGS
-- ============================================================================
INSERT INTO public.segment_product_categories (segment_id, category_id, display_order) VALUES
  -- Printers & Scanners
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000003', 1),  -- MFD
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000002', 2),  -- LaserJet
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 3),  -- Inkjet
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000004', 4),  -- Doc Scanner
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000005', 5),  -- Flatbed
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000006', 6),  -- Large Format
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000007', 7),  -- Toner/Ink
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000008', 8),  -- AMC
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000009', 9),  -- Spare Parts
  ('11111111-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000010', 10), -- Barcode
  -- E-Waste
  ('11111111-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000011', 1),
  ('11111111-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000012', 2),
  ('11111111-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000013', 3),
  ('11111111-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000014', 4),
  -- Paper Napkins
  ('11111111-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000015', 1),
  ('11111111-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000016', 2),
  ('11111111-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000017', 3),
  ('11111111-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000018', 4),
  -- IT Hardware
  ('11111111-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000019', 1),
  ('11111111-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000020', 2),
  ('11111111-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000021', 3)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. SEGMENT ↔ LEAD SOURCE MAPPINGS
-- GeM Portal, CPPP Tender, Direct Govt RFQ → Government-facing segments
-- All sources → available in all segments
-- ============================================================================
INSERT INTO public.segment_lead_sources (segment_id, source_id)
SELECT s.id, src.id
FROM public.segments s
CROSS JOIN public.lead_sources src
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. SEGMENT ↔ LEAD STAGE MAPPINGS (all stages available in all segments)
-- ============================================================================
INSERT INTO public.segment_lead_stages (segment_id, stage_id, display_order)
SELECT s.id, st.id,
  CASE st.code
    WHEN 'NEW_LEAD'        THEN 1
    WHEN 'CONTACTED'       THEN 2
    WHEN 'SITE_SURVEY'     THEN 3
    WHEN 'QUOTE_SUBMITTED' THEN 4
    WHEN 'TECH_EVAL'       THEN 5
    WHEN 'NEGOTIATION'     THEN 6
    WHEN 'PO_RECEIVED'     THEN 7
    WHEN 'WON'             THEN 8
    WHEN 'LOST'            THEN 9
    WHEN 'ON_HOLD'         THEN 10
    ELSE 99
  END
FROM public.segments s
CROSS JOIN public.lead_stages st
ON CONFLICT DO NOTHING;
