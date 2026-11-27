"""News & Sentiment Analysis Agent: returns structured article tags + concise Markdown briefing."""

import json
import logging
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.agents.llm_client import call_llm_structured

logger = logging.getLogger(__name__)


class _ArticleClassification(BaseModel):
    index: int
    sentiment: Literal["positive", "negative", "neutral"]
    event_type: str
    takeaway: str


class _NewsLLMShape(BaseModel):
    report_markdown: str
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
    report_markdown: str = ""
    overall_sentiment: str
    articles: List[ArticleSentiment] = Field(default_factory=list)
    conflicting_reports: List[str] = Field(default_factory=list)
    execution_time_ms: int = 0


SYSTEM_PROMPT = """You are the News & Sentiment Analysis Agent for StockSage.
Analyze the numbered headlines (from Yahoo Finance & Google News RSS). Summarize corporate events (earnings, deals, acquisitions, regulatory news), classify each article, and flag conflicting reports. Never invent headlines or URLs.

FORMATTING RULES FOR `report_markdown`:
- NO long paragraphs (max 2 short sentences per paragraph).
- Use clean Markdown with `###` headings and concise bullet points (`- `).
- Structure strictly as:
  ### Sentiment Overview
  1-2 crisp sentences summarizing overall news tone and main drivers.
  ### Key Headlines
  - **[Positive/Negative/Neutral]** Short takeaway citing publisher & date. (3-4 bullets max)
  ### Conflicts & Watchouts
  - Mention any opposing reports, or write `- No major conflicting headlines found.`

Return ONLY valid JSON:
{
  "report_markdown": "<markdown string following the exact rules above>",
  "overall_sentiment": "positive | negative | neutral | mixed",
  "classifications": [
    {"index": 0, "sentiment": "positive | negative | neutral", "event_type": "Earnings | Regulatory | Corporate | Analyst | Market", "takeaway": "1 concise sentence"}
  ],
  "conflicting_reports": ["any opposing headlines or empty array"]
}"""


def run_news_agent(symbol: str, news_items: List[Dict[str, Any]]) -> NewsAgentOutput:
    if not news_items:
        md = f"### Sentiment Overview\nNo recent news headlines were retrieved for **{symbol}**."
        return NewsAgentOutput(
            status="unavailable",
            summary=md,
            report_markdown=md,
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
            summary=parsed.report_markdown,
            report_markdown=parsed.report_markdown,
            overall_sentiment=parsed.overall_sentiment,
            articles=enriched,
            conflicting_reports=parsed.conflicting_reports,
            execution_time_ms=elapsed_ms,
        )

    if err:
        logger.warning(f"News agent fell back ({symbol}): {err}")

    bullets = [
        f"- [{a.title}]({a.source_url}) — *{a.publisher}*"
        + (f" ({a.published_at[:10]})" if a.published_at else "")
        for a in enriched[:5]
    ]
    md = "\n".join([
        "### Sentiment Overview",
        f"Retrieved **{len(enriched)}** recent headlines for **{symbol}**.",
        "",
        "### Key Headlines",
        *bullets,
    ])
    return NewsAgentOutput(
        status="fallback",
        summary=md,
        report_markdown=md,
        overall_sentiment="neutral",
        articles=enriched,
        conflicting_reports=[],
        execution_time_ms=elapsed_ms,
    )
