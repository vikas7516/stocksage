"""Risk Analysis Agent: returns structured risk level + concise Markdown assessment."""

import json
from typing import Any, Dict, List, Union
from pydantic import BaseModel, Field

from app.agents.llm_client import call_llm_structured


class _RiskLLMShape(BaseModel):
    report_markdown: str
    conflicting_findings: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)


class RiskAgentOutput(BaseModel):
    agent_name: str = "risk"
    status: str = "success"
    risk_level: str
    summary: str
    report_markdown: str = ""
    conflicting_findings: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    execution_time_ms: int = 0


SYSTEM_PROMPT = """You are the Risk Analysis Agent for StockSage.
Review the quantitative risk metrics (volatility, maximum drawdown, 95% VaR, Sharpe proxy) alongside fundamentals, technical trend, and news headlines.
Highlight disagreements across signals, frame bull/bear scenarios, and note data limitations.

FORMATTING RULES FOR `report_markdown`:
- NO long paragraphs (max 2 short sentences per paragraph).
- Use clean Markdown with `###` headings, **bold** values, and short bullets (`- `).
- Structure strictly as:
  ### Risk Profile
  1-2 crisp sentences translating volatility, drawdown, and VaR into practical downside awareness.
  ### Conflicting Signals
  - Highlight any disagreement across trend, fundamentals, and news (or state if aligned).
  ### Scenarios & Stance
  - **Upside Case:** ...
  - **Downside Case:** ...
  - **Advisory Stance:** 1-2 balanced sentences weighing upside vs risk.

Return ONLY valid JSON:
{
  "report_markdown": "<markdown string following the exact rules above>",
  "conflicting_findings": ["concise conflict 1, or empty array"],
  "limitations": ["short window / missing data notes"]
}"""


def run_risk_agent(
    risk_metrics: Dict[str, Any],
    fundamental_context: Dict[str, Any],
    technical_context: Dict[str, Any],
    news_context: Union[Dict[str, Any], List[Dict[str, Any]]],
) -> RiskAgentOutput:
    payload = {
        "symbol": risk_metrics.get("symbol"),
        "quantitative_risk_level": risk_metrics.get("risk_level"),
        "metrics": risk_metrics.get("metrics", {}),
        "deterministic_risk_factors": risk_metrics.get("risk_factors", []),
        "deterministic_limitations": risk_metrics.get("limitations", []),
        "fundamentals": fundamental_context,
        "technicals": technical_context,
        "recent_news": news_context,
    }
    user_prompt = f"Evaluate risks and conflicting signals:\n{json.dumps(payload, separators=(',', ':'))}"
    parsed, err, elapsed_ms = call_llm_structured(SYSTEM_PROMPT, user_prompt, _RiskLLMShape)

    risk_level = risk_metrics.get("risk_level", "MODERATE")
    if parsed is not None:
        return RiskAgentOutput(
            status="success",
            risk_level=risk_level,
            summary=parsed.report_markdown,
            report_markdown=parsed.report_markdown,
            conflicting_findings=parsed.conflicting_findings,
            limitations=parsed.limitations or risk_metrics.get("limitations", []),
            execution_time_ms=elapsed_ms,
        )

    m = risk_metrics.get("metrics", {})
    md = "\n".join([
        "### Risk Profile",
        f"**{risk_metrics.get('symbol')}** carries a **{risk_level}** quantitative risk profile with **{m.get('max_drawdown_pct')}%** max drawdown and **{m.get('annualized_volatility_pct')}%** annualized volatility.",
        "",
        "### Key Metrics",
        f"- **95% Daily VaR:** {m.get('var_95_daily_pct')}%",
        f"- **Sharpe Proxy:** {m.get('sharpe_proxy')}",
        "",
        "### Setup Note",
        "- Configure `GEMINI_API_KEY` on the backend for full cross-signal conflict & scenario analysis." + (f" (`{err}`)" if err else ""),
    ])
    return RiskAgentOutput(
        status="fallback",
        risk_level=risk_level,
        summary=md,
        report_markdown=md,
        conflicting_findings=[],
        limitations=risk_metrics.get("limitations", []),
        execution_time_ms=elapsed_ms,
    )
