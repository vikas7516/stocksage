"""Milestone 2 API router: runs individual research agents and handles chat follow-ups."""

from concurrent.futures import ThreadPoolExecutor
import json
from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.agents.fundamental_agent import FundamentalAgentOutput, run_fundamental_agent
from app.agents.llm_client import call_llm_chat
from app.agents.news_agent import NewsAgentOutput, run_news_agent
from app.agents.risk_agent import RiskAgentOutput, run_risk_agent
from app.agents.technical_agent import TechnicalAgentOutput, run_technical_agent
from app.core.config import settings
from app.models.schemas import (
    FundamentalAnalysisResponse,
    NewsItem,
    RiskAnalysisResponse,
    TechnicalAnalysisResponse,
    TickerResult,
)
from app.routers.analysis import _fetch_warmup_history
from app.routers.search import resolve_yfinance_symbol
from app.services.fundamental_analysis import fetch_and_compute_fundamentals
from app.services.news_service import fetch_stock_news
from app.services.risk_analysis import assess_risk_metrics
from app.services.technical_analysis import analyze_technical_indicators

router = APIRouter(prefix="/api/agents", tags=["agents"])


class AgentOutputsBundle(BaseModel):
    model: str
    fundamental: FundamentalAgentOutput
    technical: TechnicalAgentOutput
    news: NewsAgentOutput
    risk: RiskAgentOutput


class FullAgentResearchResponse(BaseModel):
    resolved: TickerResult
    period: str
    technical: TechnicalAnalysisResponse
    fundamentals: FundamentalAnalysisResponse
    risk: RiskAnalysisResponse
    news: List[NewsItem]
    agents: AgentOutputsBundle


class AgentChatRequest(BaseModel):
    symbol: str
    question: str = Field(..., min_length=1, max_length=1000)
    agent_focus: Literal["all", "fundamental", "technical", "news", "risk"] = "all"
    context: Optional[Dict[str, Any]] = None
    history: List[Dict[str, str]] = Field(default_factory=list)


class AgentChatResponse(BaseModel):
    agent: str
    model: str
    reply: str
    latency_ms: int


@router.get("/analyze", response_model=FullAgentResearchResponse)
def run_all_individual_agents(
    symbol: str = Query(..., description="NSE ticker or company name, e.g. INFY"),
    period: str = Query("3mo", pattern="^(1mo|3mo|6mo|1y)$"),
):
    """
    Runs deterministic data collection + math, then invokes all 4 Milestone 2 agents
    (Fundamental, Technical, News in parallel, followed by Risk Agent to detect conflicts).
    """
    resolved = resolve_yfinance_symbol(symbol)
    yf_symbol = resolved["yfinance_symbol"]
    company_name = resolved["company_name"]

    df, bars = _fetch_warmup_history(yf_symbol, period)
    window_df = df.iloc[-bars:] if len(df) > bars else df

    technical_data = analyze_technical_indicators(df, symbol=yf_symbol, display_bars=bars)
    fundamental_data = fetch_and_compute_fundamentals(yf_symbol)
    risk_data = assess_risk_metrics(window_df, symbol=yf_symbol, fundamentals=fundamental_data)
    news_data = fetch_stock_news(symbol=yf_symbol, company_name=company_name)

    # Run Fundamental, Technical, News in parallel (Gemini 3.1 Flash Lite supports 250k TPM / 15 RPM)
    with ThreadPoolExecutor(max_workers=3) as pool:
        f_fund = pool.submit(run_fundamental_agent, fundamental_data)
        f_tech = pool.submit(run_technical_agent, technical_data)
        f_news = pool.submit(run_news_agent, yf_symbol, news_data)

        fund_out = f_fund.result()
        tech_out = f_tech.result()
        news_out = f_news.result()

    risk_out = run_risk_agent(
        risk_metrics=risk_data,
        fundamental_summary=fund_out.model_dump(),
        technical_summary=tech_out.model_dump(),
        news_summary=news_out.model_dump(),
    )

    return FullAgentResearchResponse(
        resolved=TickerResult(**resolved),
        period=period,
        technical=technical_data,
        fundamentals=fundamental_data,
        risk=risk_data,
        news=news_data,
        agents=AgentOutputsBundle(
            model=settings.gemini_model,
            fundamental=fund_out,
            technical=tech_out,
            news=news_out,
            risk=risk_out,
        ),
    )


@router.get("/single/{agent_name}")
def run_single_agent(
    agent_name: Literal["fundamental", "technical", "news", "risk"],
    symbol: str = Query(..., description="NSE ticker or company name, e.g. INFY"),
    period: str = Query("3mo", pattern="^(1mo|3mo|6mo|1y)$"),
):
    """Run any individual Milestone 2 agent independently and inspect its structured JSON output."""
    resolved = resolve_yfinance_symbol(symbol)
    yf_symbol = resolved["yfinance_symbol"]

    if agent_name == "fundamental":
        return run_fundamental_agent(fetch_and_compute_fundamentals(yf_symbol))
    if agent_name == "technical":
        df, bars = _fetch_warmup_history(yf_symbol, period)
        return run_technical_agent(analyze_technical_indicators(df, symbol=yf_symbol, display_bars=bars))
    if agent_name == "news":
        news_data = fetch_stock_news(symbol=yf_symbol, company_name=resolved["company_name"])
        return run_news_agent(yf_symbol, news_data)
    if agent_name == "risk":
        df, bars = _fetch_warmup_history(yf_symbol, period)
        window_df = df.iloc[-bars:] if len(df) > bars else df
        risk_data = assess_risk_metrics(window_df, symbol=yf_symbol)
        return run_risk_agent(risk_data, {}, {}, {})

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown agent")


@router.post("/chat", response_model=AgentChatResponse)
def agent_chat_followup(req: AgentChatRequest):
    """Conversational follow-up grounded in the current stock's computed metrics and agent findings."""
    agent_label = {
        "all": "StockSage Research Team",
        "fundamental": "Fundamental Analysis Agent",
        "technical": "Technical Analysis Agent",
        "news": "News & Sentiment Agent",
        "risk": "Risk Analysis Agent",
    }[req.agent_focus]

    compact_ctx = req.context or {}
    system_prompt = (
        f"You are the {agent_label} on StockSage (an NSE research advisory platform, NOT a broker). "
        f"Answer concisely and clearly using ONLY the verified metrics below for {req.symbol}. "
        f"If data is missing, state that explicitly.\n\n"
        f"VERIFIED CONTEXT:\n{json.dumps(compact_ctx)[:2800]}"
    )

    recent_history = [
        {"role": m["role"], "content": m["content"]}
        for m in req.history[-6:]
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    recent_history.append({"role": "user", "content": req.question})

    reply, _, latency_ms = call_llm_chat(system_prompt, recent_history)
    return AgentChatResponse(
        agent=req.agent_focus,
        model=settings.gemini_model,
        reply=reply,
        latency_ms=latency_ms,
    )
