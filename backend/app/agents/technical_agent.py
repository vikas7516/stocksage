"""Technical Analysis Agent: interprets computed SMA, EMA, RSI, MACD, and volatility signals."""

import json
from typing import Any, Dict, List, Literal
from pydantic import BaseModel, Field

from app.agents.llm_client import call_groq_structured
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
Interpret ONLY the provided computed indicators (SMA-20, SMA-50, EMA-20, RSI-14, MACD, Volatility) and condition flags.
Never guarantee future price returns; explain what the historical indicators signal right now.
Return ONLY valid JSON matching this schema:
{
  "summary": "4 sentence explanation of moving-average alignment, RSI momentum, MACD signal, and volatility.",
  "trend_direction": "upward | moderately_upward | mixed | moderately_downward | downward",
  "momentum_signal": "short label e.g. Neutral Momentum / Bullish Crossover / Overbought Caution",
  "investor_takeaway": "1-2 sentence practical interpretation of the chart trend and key support/resistance averages.",
  "key_observations": ["observation 1", "observation 2", "observation 3"]
}"""


def run_technical_agent(technical: Dict[str, Any]) -> TechnicalAgentOutput:
    # Omit chart_data array from prompt to keep tokens tight and fast
    compact_payload = {
        "symbol": technical.get("symbol"),
        "latest_price": technical.get("latest_price"),
        "period_return_pct": technical.get("period_return_pct"),
        "indicators": technical.get("indicators", {}),
        "signals": technical.get("signals", {}),
    }
    user_prompt = f"Analyze these computed technical indicators:\n{json.dumps(compact_payload, separators=(',', ':'))}"
    parsed, err, elapsed_ms = call_groq_structured(SYSTEM_PROMPT, user_prompt, _TechnicalLLMShape)

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
    conds = [c.get("detail", "") for c in technical.get("signals", {}).get("conditions", [])]
    return TechnicalAgentOutput(
        status="fallback",
        summary=f"{technical.get('symbol')} shows a {trend.replace('_', ' ')} historical trend at ₹{technical.get('latest_price')} with RSI-14 at {ind.get('rsi14')}.",
        trend_direction=trend if trend in ("upward", "moderately_upward", "mixed", "moderately_downward", "downward") else "mixed",
        momentum_signal=f"RSI {ind.get('rsi14')}",
        investor_takeaway="Watch how price behaves around SMA-20 and SMA-50 before treating short-term momentum as a sustained trend.",
        key_observations=conds or ([f"LLM fallback: {err}"] if err else []),
        disclaimer=TECHNICAL_DISCLAIMER,
        execution_time_ms=elapsed_ms,
    )
