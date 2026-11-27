"""FastAPI TestClient integration tests for search, health, and analysis endpoints."""

from unittest.mock import MagicMock, patch
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_cors_allows_render_frontend_origin():
    origin = "https://stocksage-frontend-0wht.onrender.com"
    res = client.get("/health", headers={"Origin": origin})
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == origin

    preflight = client.options(
        "/api/agents/chat",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == origin


def test_public_search_resolves_nse_stocks():
    res = client.get("/api/search/public?q=inf")
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "inf"
    assert len(data["results"]) >= 1
    assert data["results"][0]["ticker_symbol"] == "INFY"
    assert data["results"][0]["yfinance_symbol"] == "INFY.NS"


def test_analysis_snapshot_endpoint_with_mock_yfinance():
    dates = pd.date_range("2026-01-01", periods=100, freq="B")
    close = np.linspace(1400.0, 1650.0, 100)
    mock_df = pd.DataFrame(
        {
            "Open": close - 5.0,
            "High": close + 10.0,
            "Low": close - 10.0,
            "Close": close,
            "Volume": np.full(100, 1500000),
        },
        index=dates,
    )

    mock_ticker = MagicMock()
    mock_ticker.history.return_value = mock_df
    mock_ticker.info = {
        "shortName": "Infosys Limited",
        "sector": "Information Technology",
        "currentPrice": 1650.0,
        "trailingEps": 62.5,
        "bookValue": 250.0,
        "marketCap": 6800000000000,
        "returnOnEquity": 0.29,
        "profitMargins": 0.17,
        "operatingMargins": 0.21,
        "debtToEquity": 9.5,
        "currentRatio": 2.3,
        "revenueGrowth": 0.08,
        "earningsGrowth": 0.11,
    }
    mock_ticker.income_stmt = pd.DataFrame()
    mock_ticker.balance_sheet = pd.DataFrame()
    mock_ticker.news = []

    with (
        patch("app.routers.analysis.yf.Ticker", return_value=mock_ticker),
        patch("app.services.fundamental_analysis.yf.Ticker", return_value=mock_ticker),
        patch("app.services.news_service._fetch_yfinance_news", return_value=[]),
        patch("app.services.news_service._fetch_google_rss_news", return_value=[]),
    ):
        res = client.get("/api/analysis/snapshot?symbol=INFY&period=3mo")
        assert res.status_code == 200
        body = res.json()
        assert body["resolved"]["yfinance_symbol"] == "INFY.NS"
        assert len(body["technical"]["chart_data"]) == 65
        assert body["technical"]["indicators"]["sma20"] is not None
        assert body["technical"]["indicators"]["rsi14"] is not None
        assert body["fundamentals"]["valuation"]["pe_ratio"] == 26.4
        assert body["risk"]["risk_level"] in ("LOW", "MODERATE", "HIGH")
