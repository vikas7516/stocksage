"""Fundamental Analysis Agent: returns structured metadata + concise Markdown analysis."""

import json
import logging
from typing import Any, Dict, List, Literal
from pydantic import BaseModel, Field

from app.agents.llm_client import call_llm_structured

logger = logging.getLogger(__name__)


class _FundamentalLLMShape(BaseModel):
    report_markdown: str
    valuation_assessment: Literal["undervalued", "fairly_valued", "richly_valued", "insufficient_data"]
    financial_health: Literal["strong", "moderate", "weak", "insufficient_data"]


class FundamentalAgentOutput(BaseModel):
    agent_name: str = "fundamental"
    status: str = "success"
    summary: str
    report_markdown: str = ""
    valuation_assessment: str
    financial_health: str
    data_gaps: List[str] = Field(default_factory=list)
    execution_time_ms: int = 0


SYSTEM_PROMPT = """You are the Fundamental Analysis Agent for StockSage (an NSE research advisory platform, NOT a broker).
Analyze the provided financial ratios and multi-year statements. Explain WHAT they mean in plain English.

FORMATTING RULES FOR `report_markdown`:
- NO long paragraphs (max 2 short sentences in any paragraph).
- Use clean Markdown with `###` headings, **bold** key values, and short scannable bullet points (`- `).
- Structure strictly as:
  ### Snapshot
  1-2 crisp sentences summarizing valuation and business quality.
  ### Key Drivers
  - **Valuation:** ...
  - **Profitability:** ...
  - **Growth & History:** ...
  - **Balance Sheet:** ...
  ### Investor Takeaway
  1-2 concise sentences on who this suits and what to watch next.
  *(Add a short `### Data Gaps` bullet only if fields are missing.)*

Return ONLY valid JSON:
{
  "report_markdown": "<markdown string following the exact rules above>",
  "valuation_assessment": "undervalued | fairly_valued | richly_valued | insufficient_data",
  "financial_health": "strong | moderate | weak | insufficient_data"
}"""


def run_fundamental_agent(fundamentals: Dict[str, Any]) -> FundamentalAgentOutput:
    user_prompt = f"Analyze these fundamental metrics:\n{json.dumps(fundamentals, separators=(',', ':'))}"
    parsed, err, elapsed_ms = call_llm_structured(SYSTEM_PROMPT, user_prompt, _FundamentalLLMShape)

    missing = fundamentals.get("data_quality", {}).get("missing_fields", [])
    if parsed is not None:
        return FundamentalAgentOutput(
            status="success",
            summary=parsed.report_markdown,
            report_markdown=parsed.report_markdown,
            valuation_assessment=parsed.valuation_assessment,
            financial_health=parsed.financial_health,
            data_gaps=fundamentals.get("data_quality", {}).get("warnings", []),
            execution_time_ms=elapsed_ms,
        )

    val = fundamentals.get("valuation", {})
    prof = fundamentals.get("profitability", {})
    stab = fundamentals.get("financial_stability", {})
    pe = val.get("pe_ratio")
    pb = val.get("pb_ratio")
    roe = prof.get("roe_pct")
    margin = prof.get("net_margin_pct")
    de = stab.get("debt_to_equity")

    if err:
        logger.warning(f"Fundamental agent fell back ({fundamentals.get('symbol')}): {err}")

    md = "\n".join([
        "### Snapshot",
        f"**{fundamentals.get('symbol')}** trades at a P/E of **{pe if pe is not None else 'N/A'}** and P/B of **{pb if pb is not None else 'N/A'}**.",
        "",
        "### Key Drivers",
        f"- **Profitability:** ROE is **{f'{roe}%' if roe is not None else 'N/A'}** with a net margin of **{f'{margin}%' if margin is not None else 'N/A'}**.",
        f"- **Balance Sheet:** Debt-to-Equity stands at **{de if de is not None else 'N/A'}**.",
    ])
    return FundamentalAgentOutput(
        status="fallback",
        summary=md,
        report_markdown=md,
        valuation_assessment="fairly_valued" if pe is not None else "insufficient_data",
        financial_health="strong" if (de is not None and de < 0.5) else "moderate",
        data_gaps=[f"Missing: {', '.join(missing)}"] if missing else [],
        execution_time_ms=elapsed_ms,
    )
