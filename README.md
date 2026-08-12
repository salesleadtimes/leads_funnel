# HP Sales Funnel — Government & Non-Government Tracker

Next.js web application for tracking HP printer, scanner, plotter, and cartridge sales leads. Built for India public sector (GeM portal, CPPP tenders) and private corporate sales.

---

## Technical Stack & Modular Architecture

- **Frontend**: Next.js (App Router), React, Modular CSS & Components (`components/`, `hooks/useSalesData.js`).
- **Database**: PostgreSQL (Local Dev) / Supabase (Production) via `@supabase/supabase-js` and `postgres`.
- **Database Schema**: SQL script provided in `lib/db/schema.sql`.

---

## Project Structure

```
hp-sales-funnel-app/
├── app/
│   ├── api/
│   │   ├── leads/          # GET / POST leads
│   │   │   └── [id]/       # PUT / DELETE lead
│   │   ├── targets/        # GET / PUT targets
│   │   └── data/           # GET / PUT full state
│   ├── page.js             # Main page component
│   └── layout.js
├── components/
│   ├── Header.jsx          # Topbar & KPI summary badge
│   ├── Navigation.jsx      # Tab navigator
│   ├── DashboardTab.jsx    # Funnel view, KPIs, sector breakdown
│   ├── NewLeadTab.jsx      # Lead entry form
│   ├── LeadsListTab.jsx    # Filterable leads table & export/import
│   ├── ReviewsTab.jsx      # Target vs achievement reviews
│   └── LeadModal.jsx       # Edit & delete lead dialog
├── hooks/
│   └── useSalesData.js     # State hook & persistence engine
├── lib/
│   ├── db/
│   │   ├── client.js       # Supabase / PostgreSQL unified connection
│   │   └── schema.sql      # Database tables schema
│   ├── services/
│   │   ├── leadsService.js # Leads DB CRUD operations
│   │   └── targetsService.js # Targets DB operations
│   └── seed.js             # Default seed data
```

---

## Database Setup

Run the SQL script in `lib/db/schema.sql` on your PostgreSQL or Supabase SQL Editor:

```sql
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

CREATE TABLE IF NOT EXISTS targets (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
  daily NUMERIC NOT NULL DEFAULT 15000,
  weekly NUMERIC NOT NULL DEFAULT 100000,
  monthly NUMERIC NOT NULL DEFAULT 400000,
  quarterly NUMERIC NOT NULL DEFAULT 1200000,
  yearly NUMERIC NOT NULL DEFAULT 5000000
);
```

---

## Environment Variables

Set in `.env.local` or Vercel Settings:

```env
# Basic Auth
APP_USER=admin
APP_PASSWORD=changeme

# Production (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxx

# Local Dev (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hp_sales_funnel
```
