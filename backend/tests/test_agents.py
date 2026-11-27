"""Unit tests verifying structured agent outputs and Markdown formatting."""

from unittest.mock import patch
from app.agents.fundamental_agent import FundamentalAgentOutput, run_fundamental_agent
from app.agents.llm_client import _extract_answer_text
from app.agents.technical_agent import TechnicalAgentOutput, run_technical_agent
from app.agents.news_agent import NewsAgentOutput, run_news_agent
from app.agents.risk_agent import RiskAgentOutput, run_risk_agent


def test_gemini_thought_parts_are_filtered():
    resp = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": "internal reasoning...", "thought": True},
                        {"text": '{"report_markdown":"### Snapshot\\nClean"}'},
                    ]
                }
            }
        ]
    }
    assert _extract_answer_text(resp) == '{"report_markdown":"### Snapshot\\nClean"}'


def test_fundamental_agent_structured_output():
    from app.agents.fundamental_agent import _FundamentalLLMShape

    fake_llm = _FundamentalLLMShape(
        report_markdown="### Snapshot\nStrong margins and low debt.\n\n### Investor Takeaway\nBalanced valuation.",
        valuation_assessment="fairly_valued",
        financial_health="strong",
    )
    with patch("app.agents.fundamental_agent.call_llm_structured", return_value=(fake_llm, None, 310)):
        out = run_fundamental_agent({"symbol": "INFY.NS", "valuation": {"pe_ratio": 25.0}})
        assert isinstance(out, FundamentalAgentOutput)
        assert out.status == "success"
        assert "### Snapshot" in out.report_markdown
        assert out.valuation_assessment == "fairly_valued"
        assert out.execution_time_ms == 310


def test_technical_agent_fallback_preserves_disclaimer():
    with patch("app.agents.technical_agent.call_llm_structured", return_value=(None, "HTTP 503: UNAVAILABLE", 50)):
        out = run_technical_agent({
            "symbol": "INFY.NS",
            "latest_price": 1151.3,
            "indicators": {"rsi14": 55.6},
            "signals": {"overall_trend": "upward", "conditions": []},
        })
        assert isinstance(out, TechnicalAgentOutput)
        assert out.status == "fallback"
        assert "### Trend Summary" in out.report_markdown
        assert "HTTP 503" not in out.report_markdown
        assert "GEMINI_API_KEY" not in out.report_markdown
        assert "not be treated as guaranteed predictions" in out.disclaimer


def test_llm_client_retries_503_and_falls_back_to_secondary_model():
    from unittest.mock import MagicMock
    from app.agents.fundamental_agent import _FundamentalLLMShape
    from app.agents.llm_client import call_llm_structured

    resp_503 = MagicMock(status_code=503, text='{"error":{"code":503,"status":"UNAVAILABLE"}}')
    resp_200 = MagicMock(status_code=200)
    resp_200.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": '{"report_markdown":"### Snapshot\\nRecovered.","valuation_assessment":"fairly_valued","financial_health":"strong"}'
                        }
                    ]
                }
            }
        ]
    }

    mock_client = MagicMock()
    # 2 attempts on primary (503, 503), then 503 on preview alias, then 200 on gemini-2.5-flash-lite
    mock_client.post.side_effect = [resp_503, resp_503, resp_503, resp_200]
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value = mock_client
    mock_cm.__exit__.return_value = False

    with (
        patch("app.agents.llm_client.settings.gemini_api_key", "test-key"),
        patch("app.agents.llm_client.httpx.Client", return_value=mock_cm),
        patch("app.agents.llm_client.time.sleep"),
    ):
        parsed, err, _ = call_llm_structured("sys", "usr", _FundamentalLLMShape)
        assert err is None
        assert parsed is not None
        assert parsed.valuation_assessment == "fairly_valued"
        assert mock_client.post.call_count == 4


def test_news_agent_preserves_urls_and_dates():
    from app.agents.news_agent import _ArticleClassification, _NewsLLMShape

    fake_llm = _NewsLLMShape(
        report_markdown="### Sentiment Overview\nPositive deal win reported.",
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
    with patch("app.agents.news_agent.call_llm_structured", return_value=(fake_llm, None, 250)):
        out = run_news_agent("INFY.NS", articles)
        assert isinstance(out, NewsAgentOutput)
        assert out.overall_sentiment == "positive"
        assert "### Sentiment Overview" in out.report_markdown
        assert out.articles[0].source_url == "https://example.com/infy-deal"
        assert out.articles[0].published_at == "2026-11-26T10:00:00+00:00"


def test_risk_agent_structured_output():
    from app.agents.risk_agent import _RiskLLMShape

    fake_llm = _RiskLLMShape(
        report_markdown="### Risk Profile\nModerate volatility.\n\n### Conflicting Signals\n- Uptrend vs flat revenue.",
        conflicting_findings=["Technical uptrend contrasts with flat YoY revenue growth."],
        limitations=["3-month window"],
    )
    with patch("app.agents.risk_agent.call_llm_structured", return_value=(fake_llm, None, 220)):
        out = run_risk_agent({"symbol": "INFY.NS", "risk_level": "MODERATE"}, {}, {}, {})
        assert isinstance(out, RiskAgentOutput)
        assert out.risk_level == "MODERATE"
        assert "### Risk Profile" in out.report_markdown
        assert len(out.conflicting_findings) == 1
