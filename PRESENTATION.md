# Slide 1: Title Slide
# StockSage: AI-Powered Multi-Agent Market Research & Advisory
- **Domain:** Equity Research / Agentic Financial Advisory (NSE Focus)
- **Architecture:** React (Frontend) + FastAPI (Backend) + Supabase (PostgreSQL & JWT Auth) + Multi-Agent Orchestration
- **Status:** Milestone 1 — Core Scaffolding, Data Pipeline & Validation Complete

---

# Slide 2: Problem Statement & Core Concept
- **The Challenge:** Retail stock research is fragmented across chart indicators, quarterly reports, and breaking news.
- **Our Solution:** A focused advisory platform coordinating multiple specialized AI agents.
- **What StockSage IS:** An autonomous research analyst that collects evidence, cross-checks indicators, and compiles an audit-backed report.
- **What StockSage IS NOT:** A trading terminal, broker (Zerodha/Groww), or automated trade execution system.

---

# Slide 3: Milestone 1 Deliverables
- **UI/UX (Material Design):**
  - Modern, responsive light-theme design system with DM Serif / Inter typography.
  - Centered Google-style search with instant NSE ticker mapping chips (`INFY`, `RELIANCE`, `TCS`, `HDFCBANK`).
  - Search progress pipeline simulation & report-gating workflow.
  - Multi-gear processing dashboard reflecting active agent orchestration.
- **Backend Scaffold & Modular Endpoints:**
  - FastAPI modular service with CORS, Pydantic schemas, and `/health` monitoring.
  - Security via Supabase JWT cryptographic verification on protected routes.
- **Market Data Retrieval & Validation Suite:**
  - Automated 3-month OHLCV data retrieval via yfinance (`/api/market-data/historical`).
  - Automated validation pipeline: checks for missing dates, null counts, High < Low inversions, and negative volume anomalies.

---

# Slide 4: Database Schema (Supabase / PostgreSQL)
A normalized 7-table schema with strict **Row Level Security (RLS)**:

1. **`profiles`:** User settings & preferred default exchange (linked to `auth.users`).
2. **`ticker_map`:** Central translation layer mapping company names & symbols to yfinance identifiers (`INFY` -> `INFY.NS`).
3. **`research_tasks`:** Tracks asynchronous user research jobs (`pending` -> `running` -> `completed`).
4. **`agent_results`:** Independent results per agent using flexible `jsonb` payloads.
5. **`research_reports`:** Final synthesized supervisor report with executive summary and advisory signals.
6. **`source_documents`:** Full citation trail and content hashes ensuring verifiable claims.
7. **`saved_stocks`:** User watchlists and portfolio tracking.

---

# Slide 5: Upcoming Milestones & Roadmap
- **Milestone 2 (Week 4):** Specialized Agents Implementation
  - Fundamental Agent (ratios, balance sheet audit).
  - Technical Agent (RSI, MACD, Moving Averages via NumPy/Pandas).
  - News & Sentiment Agent (corporate filings & financial headlines).
  - Risk Agent (conflicting evidence & anomaly detection).
- **Milestone 3 (Week 6):** Supervisor Agent & LangGraph Consensus Engine.
- **Milestone 4 (Week 8):** Full Interactive Visualizations (Plotly) & Live Cloud Deployment.

