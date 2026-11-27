# Slide 1: Milestone 2 Overview (Weeks 3 & 4)
## StockSage — Financial Analysis Tools & Individual Agents
- **Goal:** Build the deterministic math layer, news integration, and 4 independent research agents.
- **Tech Used:** Python, FastAPI, pandas, NumPy, yfinance, Google News RSS, Gemini API (`gemini-3.1-flash-lite`), React + Plotly.
- **Status:** All Milestone 2 deliverables implemented and tested (`23` automated unit & API tests passing).

---

# Slide 2: Deterministic Financial Math (Week 3)
All calculations run in Python (`pandas` & `numpy`) before any AI agent reads them:

- **Technical Indicators:** SMA-20, SMA-50, EMA-20, RSI-14, MACD (12, 26, 9), and Annualized Volatility.
- **Fundamental Ratios:** P/E, P/B, ROE, Net & Operating Margins, Debt-to-Equity, Current Ratio, YoY Growth, plus Multi-Year History.
- **Risk Metrics:** Maximum Drawdown (peak-to-trough %), 95% Daily Value at Risk (VaR), and Sharpe Ratio proxy.
- **Data Quality Checks:** Explicitly flags missing or inconsistent financial statement fields.

---

# Slide 3: The 4 Independent Research Agents (Week 4)
All 4 agents run in parallel using structured JSON schemas (`Pydantic`) + Gemini `gemini-3.1-flash-lite`:

1. **Fundamental Agent:** Explains revenue/profit trends, balance-sheet health, and valuation with a clear takeaway.
2. **Technical Agent:** Explains trend direction, momentum, and key moving-average levels (with non-prediction disclaimer).
3. **News & Sentiment Agent:** Pulls headlines from `yfinance` + Google News RSS, filters quote spam, classifies sentiment, and keeps source links & dates.
4. **Risk Agent:** Evaluates volatility/drawdown, detects conflicting signals across data, and outlines bull/bear scenarios.

---

# Slide 4: Dashboard UI & Verification
- **Interactive Dashboard:**
  - **Left:** KPI summary strip, interactive Plotly Candlestick/Line chart (with SMA/EMA/RSI/MACD toggles), and tabbed tables for ratios, fiscal history, and news citations.
  - **Right:** Focused 4-tab Agent Analysis sidebar (`Fundamental`, `Technical`, `News`, `Risk`) with plain-English takeaways and follow-up Q&A.
- **Verification:**
  - `pytest`: 23 tests checking indicator formulas, drawdown/VaR math, missing-field detection, structured agent outputs, and API endpoints.
- **Next (Milestone 3 — Weeks 5 & 6):** LangGraph Supervisor Agent to coordinate retries and generate the final consolidated report.
