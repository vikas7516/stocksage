from fastapi import APIRouter, Depends, Query
from app.models.schemas import SearchResponse, TickerResult
from app.routers.auth import verify_jwt

router = APIRouter(prefix="/api", tags=["search"])

# Stub NSE ticker list — will be replaced by DB query
STUB_TICKERS = [
    {"ticker_symbol": "INFY", "company_name": "Infosys Limited", "yfinance_symbol": "INFY.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "TCS", "company_name": "Tata Consultancy Services", "yfinance_symbol": "TCS.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "RELIANCE", "company_name": "Reliance Industries Limited", "yfinance_symbol": "RELIANCE.NS", "exchange": "NSE", "sector": "Energy"},
    {"ticker_symbol": "HDFCBANK", "company_name": "HDFC Bank Limited", "yfinance_symbol": "HDFCBANK.NS", "exchange": "NSE", "sector": "Banking"},
    {"ticker_symbol": "WIPRO", "company_name": "Wipro Limited", "yfinance_symbol": "WIPRO.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "ICICIBANK", "company_name": "ICICI Bank Limited", "yfinance_symbol": "ICICIBANK.NS", "exchange": "NSE", "sector": "Banking"},
]


@router.get("/search", response_model=SearchResponse)
def search_stocks(
    q: str = Query(..., min_length=1, description="Company name or ticker symbol"),
    user=Depends(verify_jwt)
):
    """
    Search NSE stocks by company name or ticker.
    Requires authentication (JWT in Authorization header).
    Currently uses stub data — will query ticker_map table later.
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
    Public search endpoint — no auth required.
    Returns limited results for the pre-login modal preview.
    """
    q_lower = q.lower()
    matches = [
        t for t in STUB_TICKERS
        if q_lower in t["company_name"].lower() or q_lower in t["ticker_symbol"].lower()
    ]
    # Limit to 1 result for public endpoint
    return SearchResponse(results=matches[:1], query=q)
