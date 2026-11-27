# Slide 1: Milestone 2 Overview (Weeks 3 & 4)
## StockSage — Financial Analysis Tools & Individual Agents
- **Goal:** Build verified financial/technical calculations, integrate news sources, and implement 4 independent research agents.
- **Tech Stack:** FastAPI, pandas, NumPy, yfinance, Google News RSS, Gemini (`gemini-3.1-flash-lite`), React + Plotly, Supabase.
- **Database Update:** Seeded 60 NSE stocks into Supabase `ticker_map` and wired live search.

---

# Slide 2: Quantitative Math & Validation
All math runs deterministically in Python (`pandas` & `numpy`) before AI interpretation:

- **Technical Indicators:** SMA (20, 50), EMA (20), RSI (14), MACD (12, 26, 9), and Annualized Volatility.
- **Fundamental Ratios:** P/E, P/B, ROE, Net & Operating Margins, Debt-to-Equity, Current Ratio, YoY Growth, and Multi-Year Financials.
- **Risk Metrics:** Maximum Drawdown (peak-to-trough %), 95% Daily VaR, and Sharpe Ratio proxy.
- **Validation:** 23 automated `pytest` tests verifying formulas against independently computed reference values and flagging missing data.

---

# Slide 3: 4 Independent Research Agents
All 4 agents run in parallel and return strict `Pydantic`-validated schemas:

1. **Fundamental Agent:** Explains revenue/profit trends, debt stability, valuation, and missing data gaps.
2. **Technical Agent:** Explains trend direction, momentum, and key moving-average levels (with non-prediction caveat).
3. **News & Sentiment Agent:** Aggregates `yfinance` + Google News RSS headlines, classifies sentiment, and preserves source URLs and publication dates.
4. **Risk Agent:** Evaluates drawdown/volatility, highlights conflicting signals across data, and outlines bull/bear scenarios.

---

# Slide 4: Live Demo & Milestone 2 Outcomes Check
- **Live Demo Flow:** Search any NSE stock → Interactive Plotly chart (Candles/Line, SMA/EMA, RSI, MACD) + Ratios/History/News tabs + 4-Agent sidebar with follow-up Q&A.
- **PDF Outcomes Verified:**
  - Individual research agents operational & following defined schemas ✅
  - Financial ratios, technical indicators & risk metrics tested reproducibly ✅
  - Interactive technical charts available ✅
  - News summaries include source links and publication dates ✅
- **Next (Milestone 3 — Weeks 5 & 6):** LangGraph Supervisor Agent for retries and consolidated report generation.
