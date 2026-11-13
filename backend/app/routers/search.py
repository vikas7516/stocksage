from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.models.schemas import SearchResponse, TickerResult, HistoricalDataResponse
from app.routers.auth import verify_jwt
from app.services.market_data import fetch_historical_ohlcv
from typing import Optional

router = APIRouter(prefix="/api", tags=["search"])

# Supported NSE initial mapping list
STUB_TICKERS = [
    {"ticker_symbol": "INFY", "company_name": "Infosys Limited", "yfinance_symbol": "INFY.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "TCS", "company_name": "Tata Consultancy Services", "yfinance_symbol": "TCS.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "RELIANCE", "company_name": "Reliance Industries Limited", "yfinance_symbol": "RELIANCE.NS", "exchange": "NSE", "sector": "Energy"},
    {"ticker_symbol": "HDFCBANK", "company_name": "HDFC Bank Limited", "yfinance_symbol": "HDFCBANK.NS", "exchange": "NSE", "sector": "Banking"},
    {"ticker_symbol": "WIPRO", "company_name": "Wipro Limited", "yfinance_symbol": "WIPRO.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "ICICIBANK", "company_name": "ICICI Bank Limited", "yfinance_symbol": "ICICIBANK.NS", "exchange": "NSE", "sector": "Banking"},
    {"ticker_symbol": "TATAMOTORS", "company_name": "Tata Motors Limited", "yfinance_symbol": "TATAMOTORS.NS", "exchange": "NSE", "sector": "Automobile"},
]


def resolve_yfinance_symbol(query: str) -> Optional[dict]:
    q_clean = query.strip().upper()
    for item in STUB_TICKERS:
        if q_clean == item["ticker_symbol"] or q_clean.lower() in item["company_name"].lower():
            return item
    # Fallback default: format as NSE stock on yfinance
    return {
        "ticker_symbol": q_clean,
        "company_name": q_clean,
        "yfinance_symbol": f"{q_clean}.NS",
        "exchange": "NSE",
        "sector": "General"
    }


@router.get("/search", response_model=SearchResponse)
def search_stocks(
    q: str = Query(..., min_length=1, description="Company name or ticker symbol"),
    user=Depends(verify_jwt)
):
    """
    Search NSE stocks by company name or ticker (Authenticated).
    """
    q_lower = q.lower()
    matches = [
        t for t in STUB_TICKERS
        if q_lower in t["company_name"].lower() or q_lower in t["ticker_symbol"].lower()
    ]
    return SearchResponse(
        results=[TickerResult(**t) for t in matches],
        query=q
    )


@router.get("/search/public", response_model=SearchResponse)
def search_stocks_public(
    q: str = Query(..., min_length=1)
):
    """
    Public search preview endpoint (Unauthenticated).
    """
    q_lower = q.lower()
    matches = [
        t for t in STUB_TICKERS
        if q_lower in t["company_name"].lower() or q_lower in t["ticker_symbol"].lower()
    ]
    return SearchResponse(results=matches[:3], query=q)


@router.get("/market-data/historical", response_model=HistoricalDataResponse)
def get_historical_market_data(
    symbol: str = Query(..., description="NSE symbol e.g. INFY, RELIANCE, TCS"),
    period: str = Query("3mo", regex="^(1mo|3mo|6mo|1y|2y|5y)$", description="Data duration (default: 3mo)"),
    interval: str = Query("1d", regex="^(1d|1wk|1mo)$", description="Candle interval (default: 1d)")
):
    """
    Milestone 1 Core Service:
    1. Resolves ticker symbol to yfinance format (.NS suffix).
    2. Downloads 3 months historical OHLCV data.
    3. Runs automated data validation checks (missing values, duplicate dates, price sanity).
    4. Records retrieval timestamp and data source details.
    """
    resolved = resolve_yfinance_symbol(symbol)
    yf_symbol = resolved["yfinance_symbol"] if resolved else f"{symbol.upper()}.NS"

    res = fetch_historical_ohlcv(symbol=yf_symbol, period=period, interval=interval)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to fetch data for {symbol}: {res.get('error', 'Unknown retrieval error')}"
        )

    return res

