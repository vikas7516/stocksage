# Slide 1: Title Slide
# StockSage: AI-Powered Multi-Agent Market Research & Advisory
- **Domain:** Equity Research / Agentic Financial Advisory (NSE focus)
- **Architecture:** React (Frontend) + FastAPI (Backend) + Supabase (PostgreSQL & JWT Auth) + Multi-Agent Orchestration
- **Status:** Milestone 1 — System Scaffolding & Architecture Complete

---

# Slide 2: Problem Statement & Core Concept
- **The Challenge:** Retail stock research is fragmented across chart indicators, quarterly reports, and breaking news.
- **Our Solution:** A focused, advisory platform that coordinates multiple specialized AI agents.
- **What StockSage IS:** An autonomous research analyst that collects evidence, cross-checks indicators, and compiles an audit-backed report.
- **What StockSage IS NOT:** A trading terminal, broker (Zerodha/Groww), or automated trade executor.

---

# Slide 3: Milestone 1 Deliverables & Architecture
- **UI/UX:**
  - Modern, responsive Material UI design system (Google-style centered search with quick suggestions).
  - Search progress pipeline simulation & report-gating workflow.
  - Multi-gear processing dashboard reflecting active agent orchestration.
- **Backend Scaffold:**
  - FastAPI modular service with CORS, Pydantic data schemas, and health monitoring.
  - Native yfinance integration pipeline for 3-month OHLCV & technical series.
- **Security & Auth:**
  - Supabase JWT cryptographic verification (stateless authentication on backend routes).

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
- **Milestone 2:** Specialized Agents Implementation
  - Fundamental Agent (ratios, balance sheet audit).
  - Technical Agent (RSI, MACD, Moving Averages via NumPy/Pandas).
  - News & Sentiment Agent (corporate filings & financial headlines).
  - Risk Agent (conflicting evidence & anomaly detection).
- **Milestone 3:** Supervisor Agent & LangGraph Consensus Engine.
- **Milestone 4:** Full Interactive Visualization (Plotly) & Live Cloud Deployment.
