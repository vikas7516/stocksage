"""News & Sentiment Analysis Agent: classifies corporate events & preserves source links/dates."""

import json
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.agents.llm_client import call_llm_structured


class _ArticleClassification(BaseModel):
    index: int
    sentiment: Literal["positive", "negative", "neutral"]
    event_type: str
    takeaway: str


class _NewsLLMShape(BaseModel):
    summary: str
    overall_sentiment: Literal["positive", "negative", "neutral", "mixed"]
    classifications: List[_ArticleClassification] = Field(default_factory=list)
    conflicting_reports: List[str] = Field(default_factory=list)


class ArticleSentiment(BaseModel):
    title: str
    source_url: str
    publisher: str
    published_at: Optional[str] = None
    source_type: str
    sentiment: str = "neutral"
    event_type: str = "Market News"
    takeaway: str = ""


class NewsAgentOutput(BaseModel):
    agent_name: str = "news"
    status: str = "success"
    summary: str
    overall_sentiment: str
    articles: List[ArticleSentiment] = Field(default_factory=list)
    conflicting_reports: List[str] = Field(default_factory=list)
    execution_time_ms: int = 0


SYSTEM_PROMPT = """You are the News & Sentiment Analysis Agent for StockSage.
Given numbered recent headlines (from Yahoo Finance & Google News RSS), summarize key corporate events (earnings, deals, acquisitions, regulatory developments), explain why they matter to investors, classify sentiment per article, and flag conflicting reports.
Never invent headlines or URLs.
Return ONLY valid JSON:
{
  "summary": "3-4 clear sentences explaining the main news drivers, corporate catalysts, and overall investor sentiment.",
  "overall_sentiment": "positive | negative | neutral | mixed",
  "classifications": [
    {"index": 0, "sentiment": "positive | negative | neutral", "event_type": "Earnings | Regulatory | Corporate | Analyst | Market", "takeaway": "1 concise sentence explaining why this headline matters"}
  ],
  "conflicting_reports": ["any opposing headlines or uncertainties, or empty array"]
}"""


def run_news_agent(symbol: str, news_items: List[Dict[str, Any]]) -> NewsAgentOutput:
    if not news_items:
        return NewsAgentOutput(
            status="unavailable",
            summary=f"No recent news articles were retrieved for {symbol} from yfinance or Google News RSS.",
            overall_sentiment="unavailable",
            articles=[],
            conflicting_reports=[],
            execution_time_ms=0,
        )

    numbered = [
        {
            "index": idx,
            "title": item["title"],
            "publisher": item["publisher"],
            "published_at": item.get("published_at"),
        }
        for idx, item in enumerate(news_items)
    ]
    user_prompt = f"Analyze recent news for {symbol}:\n{json.dumps(numbered, separators=(',', ':'))}"
    parsed, err, elapsed_ms = call_llm_structured(SYSTEM_PROMPT, user_prompt, _NewsLLMShape)

    class_map = {c.index: c for c in parsed.classifications} if parsed is not None else {}

    enriched: List[ArticleSentiment] = []
    for idx, item in enumerate(news_items):
        c = class_map.get(idx)
        enriched.append(
            ArticleSentiment(
                title=item["title"],
                source_url=item["source_url"],
                publisher=item["publisher"],
                published_at=item.get("published_at"),
                source_type=item["source_type"],
                sentiment=c.sentiment if c else "neutral",
                event_type=c.event_type if c else "Market News",
                takeaway=c.takeaway if c else item["title"],
            )
        )

    if parsed is not None:
        return NewsAgentOutput(
            status="success",
            summary=parsed.summary,
            overall_sentiment=parsed.overall_sentiment,
            articles=enriched,
            conflicting_reports=parsed.conflicting_reports,
            execution_time_ms=elapsed_ms,
        )

    return NewsAgentOutput(
        status="fallback",
        summary=f"Retrieved {len(enriched)} recent headlines for {symbol} from yfinance and Google News RSS.",
        overall_sentiment="neutral",
        articles=enriched,
        conflicting_reports=[f"Fallback reason: {err}"] if err else [],
        execution_time_ms=elapsed_ms,
    )
