"""Technical Analysis Agent: explains price trends, momentum, and key chart levels in plain English."""

import json
from typing import Any, Dict, List, Literal
from pydantic import BaseModel, Field

from app.agents.llm_client import call_llm_structured
from app.services.technical_analysis import TECHNICAL_DISCLAIMER


class _TechnicalLLMShape(BaseModel):
    summary: str
    trend_direction: Literal["upward", "moderately_upward", "mixed", "moderately_downward", "downward"]
    momentum_signal: str
    investor_takeaway: str
    key_observations: List[str] = Field(default_factory=list)


class TechnicalAgentOutput(BaseModel):
    agent_name: str = "technical"
    status: str = "success"
    summary: str
    trend_direction: str
    momentum_signal: str
    investor_takeaway: str = ""
    key_observations: List[str] = Field(default_factory=list)
    disclaimer: str = TECHNICAL_DISCLAIMER
    execution_time_ms: int = 0


SYSTEM_PROMPT = """You are the Technical Analysis Agent for StockSage.
Explain the chart's price action and computed indicators (SMA-20, SMA-50, EMA-20, RSI-14, MACD, Volatility) so a non-expert clearly understands what the chart is showing — NOT by repeating raw strings like "Price is above SMA-20".
Explain what the trend means (e.g., whether buyers control short- and medium-term momentum, whether RSI leaves room before getting overheated above 70, whether MACD confirms strength or warns of a slowdown, and where nearby moving-average support/resistance sits).
Never guarantee future prices.
Return ONLY valid JSON:
{
  "summary": "4 clear sentences interpreting trend strength, momentum health (RSI + MACD), and price swing volatility in plain English.",
  "trend_direction": "upward | moderately_upward | mixed | moderately_downward | downward",
  "momentum_signal": "concise phrase e.g. Steady Uptrend / Overheated Rally / Bearish Cooling",
  "investor_takeaway": "1-2 sentence practical takeaway highlighting key moving-average support/resistance levels to watch on the chart.",
  "key_observations": ["plain-English chart insight 1", "insight 2", "insight 3"]
}"""


def run_technical_agent(technical: Dict[str, Any]) -> TechnicalAgentOutput:
    compact_payload = {
        "symbol": technical.get("symbol"),
        "latest_price": technical.get("latest_price"),
        "period_return_pct": technical.get("period_return_pct"),
        "indicators": technical.get("indicators", {}),
        "signals": technical.get("signals", {}),
    }
    user_prompt = f"Interpret these chart indicators in plain English:\n{json.dumps(compact_payload, separators=(',', ':'))}"
    parsed, err, elapsed_ms = call_llm_structured(SYSTEM_PROMPT, user_prompt, _TechnicalLLMShape)

    if parsed is not None:
        return TechnicalAgentOutput(
            status="success",
            summary=parsed.summary,
            trend_direction=parsed.trend_direction,
            momentum_signal=parsed.momentum_signal,
            investor_takeaway=parsed.investor_takeaway,
            key_observations=parsed.key_observations,
            disclaimer=TECHNICAL_DISCLAIMER,
            execution_time_ms=elapsed_ms,
        )

    ind = technical.get("indicators", {})
    trend = technical.get("signals", {}).get("overall_trend", "mixed")
    sma20 = ind.get("sma20")
    sma50 = ind.get("sma50")
    rsi = ind.get("rsi14")
    return TechnicalAgentOutput(
        status="fallback",
        summary=(
            f"At ₹{technical.get('latest_price')}, {technical.get('symbol')} is in a {trend.replace('_', ' ')} phase "
            f"with 14-day RSI at {rsi} (neutral momentum). Short- and medium-term moving averages sit near ₹{sma20} and ₹{sma50}."
        ),
        trend_direction=trend if trend in ("upward", "moderately_upward", "mixed", "moderately_downward", "downward") else "mixed",
        momentum_signal=f"RSI {rsi}",
        investor_takeaway="Add GEMINI_API_KEY in backend environment to unlock full AI chart interpretation.",
        key_observations=[f"Fallback reason: {err}"] if err else [],
        disclaimer=TECHNICAL_DISCLAIMER,
        execution_time_ms=elapsed_ms,
    )
