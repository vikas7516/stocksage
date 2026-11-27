"""Fundamental Analysis Agent: interprets computed financial ratios, growth, and stability."""

import json
from typing import Any, Dict, List, Literal
from pydantic import BaseModel, Field

from app.agents.llm_client import call_groq_structured


class _FundamentalLLMShape(BaseModel):
    summary: str
    valuation_assessment: Literal["undervalued", "fairly_valued", "richly_valued", "insufficient_data"]
    financial_health: Literal["strong", "moderate", "weak", "insufficient_data"]
    investor_takeaway: str
    key_highlights: List[str] = Field(default_factory=list)
    data_gaps: List[str] = Field(default_factory=list)


class FundamentalAgentOutput(BaseModel):
    agent_name: str = "fundamental"
    status: str = "success"
    summary: str
    valuation_assessment: str
    financial_health: str
    investor_takeaway: str = ""
    key_highlights: List[str] = Field(default_factory=list)
    data_gaps: List[str] = Field(default_factory=list)
    execution_time_ms: int = 0


SYSTEM_PROMPT = """You are the Fundamental Analysis Agent for StockSage (an NSE equity research advisory platform, NOT a broker).
Analyze ONLY the provided verified financial metrics and multi-year historical statements. Never invent numbers.
Write clearly in plain English so an investor understands WHAT the numbers mean, not just what the numbers are.
Return ONLY valid JSON matching this schema:
{
  "summary": "4-5 sentence explanation covering multi-year revenue/earnings trajectory, profitability (ROE, margins), balance-sheet debt stability, and valuation (P/E, P/B).",
  "valuation_assessment": "undervalued | fairly_valued | richly_valued | insufficient_data",
  "financial_health": "strong | moderate | weak | insufficient_data",
  "investor_takeaway": "1-2 sentence practical advisory takeaway explaining who this fundamental profile suits and what to watch.",
  "key_highlights": ["bullet 1", "bullet 2", "bullet 3"],
  "data_gaps": ["any missing or inconsistent financial fields"]
}"""


def run_fundamental_agent(fundamentals: Dict[str, Any]) -> FundamentalAgentOutput:
    user_prompt = f"Analyze these computed fundamental metrics:\n{json.dumps(fundamentals, indent=2)}"
    parsed, err, elapsed_ms = call_groq_structured(SYSTEM_PROMPT, user_prompt, _FundamentalLLMShape)

    if parsed is not None:
        return FundamentalAgentOutput(
            status="success",
            summary=parsed.summary,
            valuation_assessment=parsed.valuation_assessment,
            financial_health=parsed.financial_health,
            investor_takeaway=parsed.investor_takeaway,
            key_highlights=parsed.key_highlights,
            data_gaps=parsed.data_gaps or fundamentals.get("data_quality", {}).get("warnings", []),
            execution_time_ms=elapsed_ms,
        )

    # Deterministic fallback if LLM is unavailable
    val = fundamentals.get("valuation", {})
    prof = fundamentals.get("profitability", {})
    stab = fundamentals.get("financial_stability", {})
    missing = fundamentals.get("data_quality", {}).get("missing_fields", [])

    pe = val.get("pe_ratio")
    roe = prof.get("roe_pct")
    de = stab.get("debt_to_equity")

    summary = (
        f"Fundamental metrics for {fundamentals.get('symbol')}: "
        f"P/E is {pe if pe is not None else 'N/A'}, ROE is {f'{roe}%' if roe is not None else 'N/A'}, "
        f"and Debt-to-Equity is {de if de is not None else 'N/A'}."
    )
    return FundamentalAgentOutput(
        status="fallback",
        summary=summary,
        valuation_assessment="fairly_valued" if pe is not None else "insufficient_data",
        financial_health="strong" if (de is not None and de < 0.5) else "moderate",
        key_highlights=[
            f"Trailing P/E: {pe}" if pe is not None else "P/E unavailable",
            f"ROE: {roe}%" if roe is not None else "ROE unavailable",
            f"Net Margin: {prof.get('net_margin_pct')}%" if prof.get("net_margin_pct") is not None else "Net margin unavailable",
        ],
        data_gaps=[f"Missing: {', '.join(missing)}"] if missing else ([f"LLM fallback: {err}"] if err else []),
        execution_time_ms=elapsed_ms,
    )
