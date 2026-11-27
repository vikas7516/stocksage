"""Week 3 deterministic analysis API routes (Technical chart, Fundamentals, Risk, News)."""

from fastapi import APIRouter, HTTPException, Query, status
import yfinance as yf
from app.models.schemas import (
    FundamentalAnalysisResponse,
    NewsItem,
    RiskAnalysisResponse,
    StockSnapshotResponse,
    TechnicalAnalysisResponse,
    TickerResult,
)
from app.routers.search import resolve_yfinance_symbol
from app.services.fundamental_analysis import fetch_and_compute_fundamentals
from app.services.news_service import fetch_stock_news
from app.services.risk_analysis import assess_risk_metrics
from app.services.technical_analysis import analyze_technical_indicators

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

PERIOD_BARS = {
    "1mo": 22,
    "3mo": 65,
    "6mo": 126,
    "1y": 252,
}


def _fetch_warmup_history(yf_symbol: str, period: str):
    """
    Fetches extra lookback history (at least 1y for 1mo/3mo/6mo, 2y for 1y)
    so SMA-50, EMA-20, RSI-14, and MACD(12,26,9) have zero warm-up NaNs in the chart window.
    """
    fetch_period = "2y" if period == "1y" else "1y"
    df = yf.Ticker(yf_symbol).history(period=fetch_period, interval="1d")
    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No historical market data returned for {yf_symbol}",
        )
    return df, PERIOD_BARS.get(period, 65)


@router.get("/technical", response_model=TechnicalAnalysisResponse)
def get_technical_analysis(
    symbol: str = Query(..., description="NSE ticker or company name, e.g. INFY"),
    period: str = Query("3mo", pattern="^(1mo|3mo|6mo|1y)$"),
):
    resolved = resolve_yfinance_symbol(symbol)
    yf_symbol = resolved["yfinance_symbol"]
    df, bars = _fetch_warmup_history(yf_symbol, period)
    return analyze_technical_indicators(df, symbol=yf_symbol, display_bars=bars)


@router.get("/fundamentals", response_model=FundamentalAnalysisResponse)
def get_fundamental_analysis(
    symbol: str = Query(..., description="NSE ticker or company name, e.g. INFY"),
):
    resolved = resolve_yfinance_symbol(symbol)
    return fetch_and_compute_fundamentals(resolved["yfinance_symbol"])


@router.get("/risk", response_model=RiskAnalysisResponse)
def get_risk_analysis(
    symbol: str = Query(..., description="NSE ticker or company name, e.g. INFY"),
    period: str = Query("3mo", pattern="^(1mo|3mo|6mo|1y)$"),
):
    resolved = resolve_yfinance_symbol(symbol)
    yf_symbol = resolved["yfinance_symbol"]
    df, bars = _fetch_warmup_history(yf_symbol, period)
    window_df = df.iloc[-bars:] if len(df) > bars else df
    return assess_risk_metrics(window_df, symbol=yf_symbol)


@router.get("/news", response_model=list[NewsItem])
def get_stock_news(
    symbol: str = Query(..., description="NSE ticker or company name, e.g. INFY"),
):
    resolved = resolve_yfinance_symbol(symbol)
    return fetch_stock_news(
        symbol=resolved["yfinance_symbol"],
        company_name=resolved["company_name"],
    )


@router.get("/snapshot", response_model=StockSnapshotResponse)
def get_stock_snapshot(
    symbol: str = Query(..., description="NSE ticker or company name, e.g. INFY"),
    period: str = Query("3mo", pattern="^(1mo|3mo|6mo|1y)$"),
):
    """Combined deterministic snapshot: OHLCV + indicators chart, fundamentals, risk, and news."""
    resolved = resolve_yfinance_symbol(symbol)
    yf_symbol = resolved["yfinance_symbol"]

    df, bars = _fetch_warmup_history(yf_symbol, period)
    window_df = df.iloc[-bars:] if len(df) > bars else df

    technical = analyze_technical_indicators(df, symbol=yf_symbol, display_bars=bars)
    fundamentals = fetch_and_compute_fundamentals(yf_symbol)
    risk = assess_risk_metrics(window_df, symbol=yf_symbol, fundamentals=fundamentals)
    news = fetch_stock_news(symbol=yf_symbol, company_name=resolved["company_name"])

    return StockSnapshotResponse(
        resolved=TickerResult(**resolved),
        period=period,
        technical=technical,
        fundamentals=fundamentals,
        risk=risk,
        news=news,
    )
