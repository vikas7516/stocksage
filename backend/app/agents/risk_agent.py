"""Risk Analysis Agent: evaluates volatility/drawdown and surfaces inter-agent conflicts."""

import json
from typing import Any, Dict, List
from pydantic import BaseModel, Field

from app.agents.llm_client import call_groq_structured


class _RiskLLMShape(BaseModel):
    summary: str
    advisory_stance: str
    conflicting_findings: List[str] = Field(default_factory=list)
    alternative_scenarios: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)


class RiskAgentOutput(BaseModel):
    agent_name: str = "risk"
    status: str = "success"
    risk_level: str
    summary: str
    advisory_stance: str = ""
    conflicting_findings: List[str] = Field(default_factory=list)
    alternative_scenarios: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    execution_time_ms: int = 0


SYSTEM_PROMPT = """You are the Risk Analysis Agent for StockSage.
Review the quantitative risk metrics (volatility, maximum drawdown, 95% VaR, Sharpe proxy) alongside the Fundamental, Technical, and News summaries.
Explicitly detect disagreements across agents (e.g. positive technical trend vs weak fundamentals or negative news), explain alternative scenarios, and list data limitations.
Return ONLY valid JSON matching this schema:
{
  "summary": "3-4 sentence risk & reliability assessment grounded in the computed drawdown, volatility, and cross-agent agreement.",
  "advisory_stance": "1-2 sentence balanced risk-aware advisory stance weighing upside vs downside without guaranteeing returns.",
  "conflicting_findings": ["specific disagreements across agents, or empty array if aligned"],
  "alternative_scenarios": ["upside scenario", "downside scenario"],
  "limitations": ["missing data, short window, or uncertainty notes"]
}"""


def run_risk_agent(
    risk_metrics: Dict[str, Any],
    fundamental_summary: Dict[str, Any],
    technical_summary: Dict[str, Any],
    news_summary: Dict[str, Any],
) -> RiskAgentOutput:
    payload = {
        "symbol": risk_metrics.get("symbol"),
        "quantitative_risk_level": risk_metrics.get("risk_level"),
        "metrics": risk_metrics.get("metrics", {}),
        "deterministic_risk_factors": risk_metrics.get("risk_factors", []),
        "deterministic_limitations": risk_metrics.get("limitations", []),
        "fundamental_agent": {
            "valuation": fundamental_summary.get("valuation_assessment"),
            "health": fundamental_summary.get("financial_health"),
            "summary": fundamental_summary.get("summary"),
        },
        "technical_agent": {
            "trend": technical_summary.get("trend_direction"),
            "momentum": technical_summary.get("momentum_signal"),
            "summary": technical_summary.get("summary"),
        },
        "news_agent": {
            "sentiment": news_summary.get("overall_sentiment"),
            "summary": news_summary.get("summary"),
        },
    }
    user_prompt = f"Evaluate risks and cross-agent conflicts:\n{json.dumps(payload, indent=2)}"
    parsed, err, elapsed_ms = call_groq_structured(SYSTEM_PROMPT, user_prompt, _RiskLLMShape)

    risk_level = risk_metrics.get("risk_level", "MODERATE")
    if parsed is not None:
        return RiskAgentOutput(
            status="success",
            risk_level=risk_level,
            summary=parsed.summary,
            advisory_stance=parsed.advisory_stance,
            conflicting_findings=parsed.conflicting_findings,
            alternative_scenarios=parsed.alternative_scenarios,
            limitations=parsed.limitations or risk_metrics.get("limitations", []),
            execution_time_ms=elapsed_ms,
        )

    return RiskAgentOutput(
        status="fallback",
        risk_level=risk_level,
        summary=f"Quantitative risk for {risk_metrics.get('symbol')} is {risk_level} with {risk_metrics.get('metrics', {}).get('max_drawdown_pct')}% max drawdown.",
        conflicting_findings=[],
        alternative_scenarios=["Monitor volatility and earnings updates before drawing conclusions."],
        limitations=risk_metrics.get("limitations", []) + ([f"LLM fallback: {err}"] if err else []),
        execution_time_ms=elapsed_ms,
    )
