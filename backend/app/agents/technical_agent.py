"""Technical Analysis Agent: returns structured metadata + concise Markdown chart analysis."""

import json
from typing import Any, Dict, Literal
from pydantic import BaseModel

from app.agents.llm_client import call_llm_structured
from app.services.technical_analysis import TECHNICAL_DISCLAIMER


class _TechnicalLLMShape(BaseModel):
    report_markdown: str
    trend_direction: Literal["upward", "moderately_upward", "mixed", "moderately_downward", "downward"]
    momentum_signal: str


class TechnicalAgentOutput(BaseModel):
    agent_name: str = "technical"
    status: str = "success"
    summary: str
    report_markdown: str = ""
    trend_direction: str
    momentum_signal: str
    disclaimer: str = TECHNICAL_DISCLAIMER
    execution_time_ms: int = 0


SYSTEM_PROMPT = """You are the Technical Analysis Agent for StockSage.
Interpret the computed chart indicators (SMA-20, SMA-50, EMA-20, RSI-14, MACD, Volatility) in plain English.
Do NOT just parrot raw numbers without context — explain whether buyers or sellers control the chart and what key levels matter. Never guarantee future prices.

FORMATTING RULES FOR `report_markdown`:
- NO long paragraphs (max 2 short sentences per paragraph).
- Use clean Markdown with `###` headings, **bold** values, and short bullets (`- `).
- Structure strictly as:
  ### Trend Summary
  1-2 crisp sentences describing overall trend direction and buyer/seller control.
  ### Indicator Breakdown
  - **Moving Averages:** ...
  - **Momentum (RSI & MACD):** ...
  - **Volatility:** ...
  ### Levels to Watch
  1-2 sentences highlighting key moving-average support/resistance levels, plus a brief non-prediction note.

Return ONLY valid JSON:
{
  "report_markdown": "<markdown string following the exact rules above>",
  "trend_direction": "upward | moderately_upward | mixed | moderately_downward | downward",
  "momentum_signal": "short label e.g. Steady Uptrend | Momentum Cooling | Oversold Bounce"
}"""


def run_technical_agent(technical: Dict[str, Any]) -> TechnicalAgentOutput:
    compact_payload = {
        "symbol": technical.get("symbol"),
        "latest_price": technical.get("latest_price"),
        "period_return_pct": technical.get("period_return_pct"),
        "indicators": technical.get("indicators", {}),
        "signals": technical.get("signals", {}),
    }
    user_prompt = f"Interpret these chart indicators:\n{json.dumps(compact_payload, separators=(',', ':'))}"
    parsed, err, elapsed_ms = call_llm_structured(SYSTEM_PROMPT, user_prompt, _TechnicalLLMShape)

    if parsed is not None:
        return TechnicalAgentOutput(
            status="success",
            summary=parsed.report_markdown,
            report_markdown=parsed.report_markdown,
            trend_direction=parsed.trend_direction,
            momentum_signal=parsed.momentum_signal,
            disclaimer=TECHNICAL_DISCLAIMER,
            execution_time_ms=elapsed_ms,
        )

    ind = technical.get("indicators", {})
    trend = technical.get("signals", {}).get("overall_trend", "mixed")
    md = "\n".join([
        "### Trend Summary",
        f"**{technical.get('symbol')}** (₹{technical.get('latest_price')}) currently shows a **{trend.replace('_', ' ')}** historical trend.",
        "",
        "### Indicator Breakdown",
        f"- **Moving Averages:** SMA-20 at **₹{ind.get('sma20')}**, SMA-50 at **₹{ind.get('sma50')}**.",
        f"- **Momentum:** 14-day RSI is **{ind.get('rsi14')}**; MACD is **{ind.get('macd')}** vs Signal **{ind.get('macd_signal')}**.",
        f"- **Volatility:** Annualized volatility is **{ind.get('annualized_volatility_pct')}%**.",
        "",
        "### Note",
        f"- {TECHNICAL_DISCLAIMER}",
        "- Configure `GEMINI_API_KEY` on the backend for full AI chart interpretation." + (f" (`{err}`)" if err else ""),
    ])
    return TechnicalAgentOutput(
        status="fallback",
        summary=md,
        report_markdown=md,
        trend_direction=trend if trend in ("upward", "moderately_upward", "mixed", "moderately_downward", "downward") else "mixed",
        momentum_signal=f"RSI {ind.get('rsi14')}",
        disclaimer=TECHNICAL_DISCLAIMER,
        execution_time_ms=elapsed_ms,
    )
