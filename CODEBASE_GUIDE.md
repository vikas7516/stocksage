# StockSage — Comprehensive Architecture & Codebase Ownership Guide

> **Purpose of this document:** This guide walks through every single folder, file, database table, and design pattern in **StockSage**. Read this so you understand the technical decisions, data flow, and code logic inside-out.

---

## 1. System Map & Request Flow

```
[ User Browser ]
       │
       ├───────────────────────────────────────────────────────┐
       ▼                                                       ▼
[ React Frontend (Vite) ]                             [ Supabase Auth ]
 (Pages, Components, Material UI)                      - Handles user signup/login
       │                                               - Issues HS256 JWT Access Token
       │ HTTP Requests (with Bearer JWT)                       │
       ▼                                                       │ Returns JWT to client
[ FastAPI Backend ] ◄──────────────────────────────────────────┘
  ├── 1. `auth.py` Middleware verifies JWT signature cryptographically (HS256)
  ├── 2. `search.py` resolves company query to NSE ticker (`INFY.NS`)
  ├── 3. `market_data.py` calls `yfinance` to pull 3-month OHLCV series
  ├── 4. Runs automated validation suite (nulls, duplicates, High < Low, negative volumes)
  └── 5. Returns validated series & metadata
       │
       ▼
[ PostgreSQL Database (Supabase) ]
  - 7 Normalized Tables protected by Row Level Security (RLS)
  - Stores users, tasks, agent findings (JSONB), reports, and citations
```

---

## 2. Directory Map (What Every File Does and Why It Exists)

```
infosys_project/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py              # Centralized environment variable settings
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── sql/
│   │   │   │   └── schema.sql         # Raw SQL schema definition with RLS
│   │   │   └── supabase_client.py     # Supabase Python SDK client initializer
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py             # Pydantic data validation & response models
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # JWT verification dependency & user endpoints
│   │   │   └── search.py              # Search & market data endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── market_data.py         # yfinance data retrieval & integrity validation logic
│   │   ├── __init__.py
│   │   └── main.py                    # FastAPI entrypoint, CORS configuration, router mounting
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_validation.py         # Pytest suite for OHLCV data validation suite
│   ├── .env.example                   # Template for backend secrets
│   ├── Dockerfile                     # Containerization instructions for Render deployment
│   ├── README.md                      # Backend setup and local development guide
│   └── requirements.txt               # Pinned Python package dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GearAnimation.jsx      # CSS keyframe-animated SVG gears component
│   │   │   └── SearchResultModal.jsx  # Interactive pipeline loading & data snapshot dialog
│   │   ├── lib/
│   │   │   └── supabaseClient.js      # Supabase JS browser client
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx      # Multi-agent progress dashboard with gear animation
│   │   │   ├── LandingPage.jsx        # Presentation landing page with light Material design
│   │   │   ├── LoginPage.jsx          # Login & registration card interface
│   │   │   └── SearchPage.jsx         # Google-style 100vh search page with live auto-complete
│   │   ├── App.jsx                    # Root component, theme definition, and React Router routes
│   │   ├── index.css                  # Global CSS resets and custom scrollbars
│   │   └── main.jsx                   # React DOM entrypoint
│   ├── .env.example                   # Template for frontend environment variables
│   ├── index.html                     # HTML shell, Google Fonts (DM Serif & Inter)
│   ├── package.json                   # Dependencies: Material UI, Supabase JS, React Router
│   └── vite.config.js                 # Vite bundler configuration
│
├── supabase/
│   └── migrations/
│       └── 20261113000000_initial_schema.sql # Version-controlled SQL migration
├── .gitignore                         # Excludes node_modules, .env, and build artifacts
├── PRESENTATION.md                    # Structured slide deck for Milestone 1 presentation
└── README.md                          # Top-level repository documentation
```

---

## 3. Deep Dive: Backend Files & Logic

### `backend/app/main.py`
- **Why it exists:** The heartbeat and entrypoint of the backend application.
- **Key Logic:**
  - Initializes `FastAPI(title="StockSage API")`.
  - Configures **`CORSMiddleware`**: In development and production, browsers block requests from `http://localhost:5173` to `http://localhost:8000` unless the server explicitly sends HTTP headers allowing it. `allow_origins=["*"]` or explicit frontend domains prevents browser CORS errors.
  - Mounts routers (`auth.router` and `search.router`).
  - Implements `/health` endpoint: Render uses this to ping your service and verify your container booted successfully.

### `backend/app/core/config.py`
- **Why it exists:** Single source of truth for all environment variables.
- **Key Logic:**
  - Uses `pydantic-settings` (`BaseSettings`). Instead of using `os.getenv(...)` scattered across multiple files, Pydantic loads and type-checks all environment variables at startup.
  - Features smart key resolution: Supabase recently renamed keys (from `anon`/`service_role` to `sb_publishable_...`/`sb_secret_...`). The `@property get_service_key` automatically checks both new and legacy names so nothing crashes if key naming formats change.

### `backend/app/routers/auth.py`
- **Why it exists:** Secures private endpoints using stateless JSON Web Tokens (JWT).
- **Key Logic:**
  - `verify_jwt(credentials: HTTPBearer)`: When a logged-in user makes an API call, their browser sends `Authorization: Bearer <token>`.
  - Uses `python-jose` to decode and verify the cryptographic signature using `SUPABASE_JWT_SECRET` and algorithm `HS256`.
  - **Why Stateless?** Your FastAPI server does **not** query a database to check if a session is valid. It verifies the signature mathematically. If valid, the user identity (`sub`, which is the Supabase UUID) is extracted instantly in sub-millisecond time.

### `backend/app/routers/search.py`
- **Why it exists:** Handles stock queries and historical market data calls.
- **Key Logic:**
  - `GET /api/search`: Authenticated stock search for registered users.
  - `GET /api/search/public`: Public search preview for pre-login modal queries.
  - `GET /api/market-data/historical`: Milestone 1's core operational endpoint. Accepts a stock symbol (e.g., `INFY`), resolves it to `INFY.NS`, and triggers the data retrieval and validation engine.

### `backend/app/services/market_data.py`
- **Why it exists:** Isolates all external financial data retrieval (`yfinance`) and data quality validation.
- **Key Logic:**
  - `fetch_historical_ohlcv(symbol, period="3mo", interval="1d")`: Queries Yahoo Finance for daily candlestick data over the last 3 months.
  - `validate_market_data(df, ticker)`: Evaluates data quality:
    1. **Missing Values:** Checks if any rows in `Open`, `High`, `Low`, `Close`, or `Volume` contain `NaN` or `None`.
    2. **Duplicate Dates:** Scans if the historical date index has repeated timestamps.
    3. **Price Sanity:** Verifies that a stock's intraday `High` is mathematically greater than or equal to `Low`, and trading `Volume >= 0`.
    4. **Data Sanitization:** Automatically removes duplicate rows and forward-fills (`ffill`) occasional trading halt gaps.

### `backend/app/models/schemas.py`
- **Why it exists:** Enforces strict contract structures for API request bodies and JSON responses.
- **Key Logic:**
  - Defines `OHLCVRecord`, `DataValidationResult`, `HistoricalDataResponse`, and `SearchResponse`.
  - Guarantees that any consumer (frontend, mobile, external) always receives predictable, type-safe data.

### `backend/tests/test_validation.py`
- **Why it exists:** Proves to evaluators that data validation algorithms are accurate.
- **Key Logic:**
  - Unit tests using `pytest` feeding mock DataFrames (clean data, intentional duplicates, null injections, and `High < Low` errors) to prove the validation flags them correctly.

---

## 4. Deep Dive: Frontend Files & Logic

### `frontend/src/App.jsx`
- **Why it exists:** Root component organizing global styling and page routing.
- **Key Logic:**
  - Defines a custom Material UI theme:
    - Primary: Royal Indigo (`#1a56db`)
    - Secondary: Deep Purple (`#7c3aed`)
    - Background: Crisp slate-white (`#f8faff`)
    - Typography: Editorial headings (`DM Serif Display`) and body text (`Inter`).
  - Sets up client-side page routing via `react-router-dom`:
    - `/` $\rightarrow$ `LandingPage`
    - `/search` $\rightarrow$ `SearchPage`
    - `/login` $\rightarrow$ `LoginPage`
    - `/dashboard` $\rightarrow$ `DashboardPage`

### `frontend/src/pages/LandingPage.jsx`
- **Why it exists:** First impression for users and evaluators.
- **Key Logic:**
  - Clean sticky navbar with direct access to search.
  - Hero section explaining the platform: *"Research NSE stocks intelligently."*
  - Dedicated architecture grid explaining the role of the 4 independent agents (Technical, Fundamental, News, and Risk).
  - Clear compliance disclaimer stating that StockSage is an informational advisory tool, not a registered broker.

### `frontend/src/pages/SearchPage.jsx`
- **Why it exists:** The core research portal designed with a non-scrollable Google-style UX.
- **Key Logic:**
  - Uses `100vh` and `overflow: hidden` to keep the viewport locked.
  - **Live As-You-Type Dropdown:** Uses a React `filteredStocks` state that dynamically matches inputs against both company names (e.g. "Infosys") and symbols ("INFY").
  - Smooth UI dock: When suggestions appear, the search input transitions its bottom corners (`24px 24px 0 0`) and docks to an auto-suggestion paper tray.
  - Clicking any item or hitting `Enter` opens the research preview modal.

### `frontend/src/components/SearchResultModal.jsx`
- **Why it exists:** Bridges the gap between pre-login and post-login research.
- **Key Logic:**
  - Animates through 4 pipeline steps with active checkmarks:
    1. Resolving NSE ticker mapping
    2. Retrieving 3-month OHLCV data
    3. Validating series integrity & null checks
    4. Preparing agent research environment
  - Asynchronously queries the backend (`/api/market-data/historical`) to fetch real data diagnostics.
  - Displays a clean data snapshot card and locks the full agentic report behind a sign-in CTA.

### `frontend/src/pages/LoginPage.jsx`
- **Why it exists:** Clean authentication interface.
- **Key Logic:**
  - Single card with smooth toggling between **Sign In** and **Sign Up**.
  - Direct integration hooks for Supabase Auth JWT issuance.
  - Includes a quick back-button returning to `/search`.

### `frontend/src/pages/DashboardPage.jsx` & `GearAnimation.jsx`
- **Why it exists:** Visual proof of multi-agent orchestration for Milestone 1.
- **Key Logic:**
  - `GearAnimation.jsx`: An SVG component with 3 interlocking gears animated via pure CSS `@keyframes` (`spinCW` and `spinCCW`) at harmonized speeds (10s, 5s, 2.5s).
  - Pipeline cards displaying the status of each agent:
    - Technical Agent: *In Progress*
    - Fundamental Agent: *Queued*
    - News & Sentiment Agent: *Queued*
    - Supervisor Agent: *Waiting*

---

## 5. Database Schema & Row Level Security (RLS)

All 7 tables were migrated to PostgreSQL via `supabase db push --linked`:

```
               ┌───────────────┐
               │  auth.users   │ (Managed by Supabase Auth)
               └──────┬────────┘
                      │ 1:1
                      ▼
               ┌───────────────┐
               │   profiles    │ (display_name, preferred_market)
               └──────┬────────┘
                      │
                      │ 1:N
                      ▼
┌──────────────┐   ┌─────────────────┐   ┌────────────────┐
│  ticker_map  │   │ research_tasks  │◄──┤  saved_stocks  │
└──────────────┘   └────────┬────────┘   └────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │ 1:N           │ 1:1           │ 1:N
            ▼               ▼               ▼
   ┌─────────────────┐ ┌───────────────┐ ┌──────────────────┐
   │  agent_results  │ │research_report│ │ source_documents │
   │ (JSONB output)  │ └───────────────┘ │ (citations/hash) │
   └─────────────────┘                   └──────────────────┘
```

1. **`profiles`:** Links to `auth.users` via a PostgreSQL trigger (`on_auth_user_created`). When a user signs up, a profile row is created automatically.
2. **`ticker_map`:** The translation table between human input and machine symbols (e.g. `Reliance Industries` $\rightarrow$ `RELIANCE.NS`). Indexed with **GIN full-text search** for fast fuzzy matching.
3. **`research_tasks`:** The central hub for research requests. Stores `ticker_symbol`, `requested_period` (`3mo`), and state (`pending` $\rightarrow$ `running` $\rightarrow$ `completed`).
4. **`agent_results`:** Independent table where each of the 4 agents writes its output. Uses `jsonb` because each agent returns a different schema (Technical returns indicator series, Fundamental returns financial ratios).
5. **`research_reports`:** Final report synthesized by the supervisor agent containing an executive summary, confidence score, and advisory recommendations (`BUY`, `HOLD`, `SELL`, `NEUTRAL`).
6. **`source_documents`:** Audit trail storing every URL, filing, and MD5 content hash used to generate findings, ensuring no unsubstantiated claims.
7. **`saved_stocks`:** User watchlists with a unique constraint on `(user_id, ticker_symbol)`.

### Why Row Level Security (RLS) Matters
In standard PostgreSQL, any authenticated user can view all table rows unless restricted in application queries. 
With **Supabase RLS**, security is enforced at the database level:
- `USING (auth.uid() = user_id)`: A user can physically never read or modify another user's tasks or watchlists, even if an API route has a vulnerability.

---

## 6. How to Run Locally & Verify Everything

### Running the Backend:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`
- Run unit tests: `pytest tests/`

### Running the Frontend:
```bash
cd frontend
npm install
npm run dev
```
- Open browser at `http://localhost:5173`
- Build for production: `npm run build`
