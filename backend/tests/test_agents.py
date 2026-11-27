"""Unit tests verifying structured agent outputs and fallback behavior."""

from unittest.mock import patch
from app.agents.fundamental_agent import FundamentalAgentOutput, run_fundamental_agent
from app.agents.technical_agent import TechnicalAgentOutput, run_technical_agent
from app.agents.news_agent import NewsAgentOutput, run_news_agent
from app.agents.risk_agent import RiskAgentOutput, run_risk_agent


def test_fundamental_agent_structured_output():
    mock_parsed = FundamentalAgentOutput.__annotations__
    from app.agents.fundamental_agent import _FundamentalLLMShape

    fake_llm = _FundamentalLLMShape(
        summary="Strong margins and low debt with reasonable valuation.",
        valuation_assessment="fairly_valued",
        financial_health="strong",
        investor_takeaway="Balanced valuation supported by strong cash generation and low debt.",
        key_highlights=["ROE 29%", "Net Margin 17%"],
        data_gaps=[],
    )
    with patch("app.agents.fundamental_agent.call_groq_structured", return_value=(fake_llm, None, 310)):
        out = run_fundamental_agent({"symbol": "INFY.NS", "valuation": {"pe_ratio": 25.0}})
        assert isinstance(out, FundamentalAgentOutput)
        assert out.status == "success"
        assert out.valuation_assessment == "fairly_valued"
        assert out.execution_time_ms == 310


def test_technical_agent_fallback_preserves_disclaimer():
    with patch("app.agents.technical_agent.call_groq_structured", return_value=(None, "timeout", 50)):
        out = run_technical_agent({
            "symbol": "INFY.NS",
            "latest_price": 1151.3,
            "indicators": {"rsi14": 55.6},
            "signals": {"overall_trend": "upward", "conditions": []},
        })
        assert isinstance(out, TechnicalAgentOutput)
        assert out.status == "fallback"
        assert "not be treated as guaranteed predictions" in out.disclaimer


def test_news_agent_preserves_urls_and_dates():
    from app.agents.news_agent import _ArticleClassification, _NewsLLMShape

    fake_llm = _NewsLLMShape(
        summary="Positive deal win reported.",
        overall_sentiment="positive",
        classifications=[
            _ArticleClassification(index=0, sentiment="positive", event_type="Corporate", takeaway="Major cloud deal signed.")
        ],
        conflicting_reports=[],
    )
    articles = [{
        "title": "Infosys wins large cloud deal",
        "source_url": "https://example.com/infy-deal",
        "publisher": "Reuters",
        "published_at": "2026-11-26T10:00:00+00:00",
        "source_type": "google_news_rss",
    }]
    with patch("app.agents.news_agent.call_groq_structured", return_value=(fake_llm, None, 250)):
        out = run_news_agent("INFY.NS", articles)
        assert isinstance(out, NewsAgentOutput)
        assert out.overall_sentiment == "positive"
        assert out.articles[0].source_url == "https://example.com/infy-deal"
        assert out.articles[0].published_at == "2026-11-26T10:00:00+00:00"


def test_risk_agent_structured_output():
    from app.agents.risk_agent import _RiskLLMShape

    fake_llm = _RiskLLMShape(
        summary="Moderate volatility with technicals bullish against slower revenue growth.",
        advisory_stance="Moderate risk profile; balance upward trend against margin headwinds.",
        conflicting_findings=["Technical uptrend contrasts with flat YoY revenue growth."],
        alternative_scenarios=["Margin expansion on AI deals", "US BFSI slowdown"],
        limitations=["3-month window"],
    )
    with patch("app.agents.risk_agent.call_groq_structured", return_value=(fake_llm, None, 220)):
        out = run_risk_agent({"symbol": "INFY.NS", "risk_level": "MODERATE"}, {}, {}, {})
        assert isinstance(out, RiskAgentOutput)
        assert out.risk_level == "MODERATE"
        assert len(out.conflicting_findings) == 1
