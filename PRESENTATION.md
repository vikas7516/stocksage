# Slide 1: Project Overview & Milestone 1 Status
## StockSage: AI-Powered Multi-Agent Stock Research Analyst
- **Objective:** Build an agentic stock research and advisory platform focused on publicly listed NSE companies.
- **Milestone 1 Scope:** Core Architecture Setup, Database Schema Implementation, Authentication Flow, and Market Data Retrieval with Automated Validation.
- **Tech Stack:**
  - **Frontend:** React.js (Vite), Material UI (Custom Light Theme), React Router v6.
  - **Backend:** FastAPI, Pydantic v2, Python-Jose (JWT), yfinance, pandas.
  - **Database & Auth:** Supabase (PostgreSQL 17) with Row Level Security (RLS) & JWT.
- **Repository:** `https://github.com/vikas7516/stocksage` (Continuous Deployment Ready).

---

# Slide 2: Milestone 1 Deliverables & Technical Progress
We have completed all requirements specified for Milestone 1:

1. **Frontend Scaffolding & Google-Style Interactive Search:**
   - Dedicated landing page with clean architectural overview and advisory disclaimers.
   - Non-scrollable Google-style search interface with **live dynamic auto-suggestion dropdown** as the user types.
   - Animated multi-stage research preview modal communicating data pipeline progress.
   - "Building in progress" dashboard with synchronized multi-gear SVG animations illustrating the multi-agent pipeline.
2. **FastAPI Backend & Scaffolding:**
   - Modular structure: routers (`auth`, `search`), models (`schemas`), and services (`market_data`).
   - CORS middleware enabled for seamless frontend-backend communication.
   - Health check endpoint (`GET /health`) for container uptime verification.
3. **End-to-End Supabase JWT Authentication Flow:**
   - Real client authentication: integrated `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.
   - Passwords securely hashed and stored in Supabase's `auth.users` vault (trigger creates corresponding `profiles` row).
   - Issues cryptographically signed HS256 JWT access tokens, stored in client `localStorage`.
   - FastAPI intercepts tokens via `verify_jwt` middleware to validate user identity statelessly without database session overhead.

---

# Slide 3: Market Data Retrieval & Integrity Validation Suite
Implemented in `backend/app/services/market_data.py`:

- **Historical Data Retrieval:**
  - Dynamic NSE symbol translation (e.g. `INFY` → `INFY.NS`) integrated with `yfinance`.
  - Automated extraction of 3-month daily OHLCV (Open, High, Low, Close, Volume) series.
  - Captures contextual company metrics (market cap, 52-week high/low, industry sector) and UTC timestamps.
- **Data Integrity & Validation Suite:**
  - **Null & Missing Value Auditing:** Verifies completeness across all OHLCV columns.
  - **Duplicate Date Checking:** Scans date indices for duplicate market sessions.
  - **Price Sanity Verification:** Validates that `High >= Low` and `Volume >= 0` for all records.
  - **Sanitization:** Automatically drops duplicate trading timestamps and forward-fills gaps caused by trading halts.
  - Validated via unit test suite in `backend/tests/test_validation.py`.

---

# Slide 4: Database Schema Design (PostgreSQL / Supabase)
Implemented, migrated, and pushed directly to Supabase (`infosys_project`) with **Row Level Security (RLS)** active on all tables.

### 1. `profiles` (User Extensions)
- `id` (UUID, PK, FK → `auth.users.id` ON DELETE CASCADE)
- `display_name` (TEXT)
- `preferred_market` (TEXT, DEFAULT 'NSE')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Trigger:* Auto-populates a row whenever a new user registers in `auth.users`.

### 2. `ticker_map` (Symbol Translation Layer)
- `id` (SERIAL, PK)
- `company_name` (TEXT, NOT NULL)
- `ticker_symbol` (TEXT, NOT NULL, UNIQUE)
- `yfinance_symbol` (TEXT, NOT NULL) — e.g. `INFY.NS`
- `exchange` (TEXT, DEFAULT 'NSE')
- `sector` (TEXT)
- `is_active` (BOOLEAN, DEFAULT TRUE)
- *Indexes:* GIN full-text index on `company_name` and B-tree index on `ticker_symbol`.

### 3. `research_tasks` (Task Lifecycle)
- `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
- `user_id` (UUID, FK → `auth.users.id` ON DELETE CASCADE)
- `ticker_symbol` (TEXT, NOT NULL)
- `yfinance_symbol` (TEXT, NOT NULL)
- `market` (TEXT, DEFAULT 'NSE')
- `requested_period` (TEXT, DEFAULT '3mo')
- `status` (TEXT, CHECK: `'pending'`, `'running'`, `'completed'`, `'failed'`)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `completed_at` (TIMESTAMPTZ, NULLABLE)

### 4. `agent_results` (Independent Multi-Agent Storage)
- `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
- `task_id` (UUID, FK → `research_tasks.id` ON DELETE CASCADE)
- `agent_name` (TEXT, CHECK: `'fundamental'`, `'technical'`, `'news'`, `'risk'`, `'supervisor'`)
- `status` (TEXT, CHECK: `'pending'`, `'running'`, `'success'`, `'failed'`)
- `output_json` (JSONB) — flexible semi-structured findings per agent
- `error_message` (TEXT, NULLABLE)
- `execution_time_ms` (INTEGER)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

---

# Slide 5: Database Schema (Continued) & Security Policies

### 5. `research_reports` (Consolidated Research Output)
- `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
- `task_id` (UUID, UNIQUE, FK → `research_tasks.id` ON DELETE CASCADE)
- `report_content` (TEXT) — Markdown/HTML structured report
- `summary` (TEXT) — executive brief
- `recommendation` (TEXT, CHECK: `'BUY'`, `'HOLD'`, `'SELL'`, `'NEUTRAL'`)
- `confidence_score` (FLOAT, 0.0 to 1.0)
- `limitations` (TEXT) — identified data gaps or conflicting signals
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 6. `source_documents` (Auditability & Citations)
- `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
- `task_id` (UUID, FK → `research_tasks.id` ON DELETE CASCADE)
- `agent_name` (TEXT)
- `source_type` (TEXT) — `'yfinance'`, `'news_api'`, `'filing'`
- `title` (TEXT)
- `source_url` (TEXT)
- `published_at` (TIMESTAMPTZ)
- `retrieved_at` (TIMESTAMPTZ, DEFAULT NOW())
- `content_hash` (TEXT) — cryptographic verification of raw evidence

### 7. `saved_stocks` (User Watchlists)
- `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
- `user_id` (UUID, FK → `auth.users.id` ON DELETE CASCADE)
- `ticker_symbol` (TEXT, NOT NULL)
- `company_name` (TEXT)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Constraint:* `UNIQUE(user_id, ticker_symbol)`

### Row Level Security (RLS) Implementation:
- `ticker_map`: Public read-only access.
- `profiles`, `research_tasks`, `saved_stocks`: Strictly limited to `auth.uid() = user_id`.
- `agent_results`, `research_reports`, `source_documents`: Access restricted through subquery join on parent task ownership (`WHERE task_id IN (SELECT id FROM research_tasks WHERE user_id = auth.uid())`).

---

# Slide 6: Summary & Next Steps (Milestone 2 Roadmap)
- **Current Milestone 1 Accomplishments:**
  - Complete backend & frontend scaffolding operational.
  - Supabase database linked and migrated with all 7 core tables and RLS.
  - Data ingestion & automated validation suite for 3-month NSE OHLCV functional.
  - Authentication flow established using Supabase JWT.
- **Milestone 2 Focus:**
  - Build the **Technical Analysis Agent** (computations for RSI, MACD, 50/200 DMA, Historical Volatility).
  - Build the **Fundamental Analysis Agent** (P/E, P/B, Debt-to-Equity, Profitability Ratios).
  - Implement news extraction & citation pipelines.
  - Structured agent output standardization.
