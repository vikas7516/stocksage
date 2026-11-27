import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.models.schemas import SearchResponse, TickerResult, HistoricalDataResponse
from app.routers.auth import verify_jwt
from app.services.market_data import fetch_historical_ohlcv
from app.db.supabase_client import supabase
from app.db.seed_tickers import NSE_SEED_TICKERS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["search"])


def _query_ticker_map(query_str: str, limit: int = 10) -> List[dict]:
    """
    Query Supabase public.ticker_map by ticker symbol or company name.
    Falls back to the canonical NSE seed list if Supabase is unavailable or empty.
    """
    q_clean = query_str.strip()
    if not q_clean:
        return []

    if supabase is not None:
        try:
            # Sanitize commas/parens so PostgREST filter syntax doesn't break
            safe_q = q_clean.replace(",", " ").replace("(", "").replace(")", "")
            res = (
                supabase.table("ticker_map")
                .select("ticker_symbol, company_name, yfinance_symbol, exchange, sector")
                .eq("is_active", True)
                .or_(f"ticker_symbol.ilike.%{safe_q}%,company_name.ilike.%{safe_q}%")
                .limit(limit)
                .execute()
            )
            if res.data:
                return _sort_matches(res.data, q_clean)[:limit]
        except Exception as exc:
            logger.warning(f"Supabase ticker_map lookup failed, falling back to local list: {exc}")

    q_lower = q_clean.lower()
    matches = [
        t for t in NSE_SEED_TICKERS
        if q_lower in t["company_name"].lower()
        or q_lower in t["ticker_symbol"].lower()
        or q_lower in (t.get("sector") or "").lower()
    ]
    return _sort_matches(matches, q_clean)[:limit]


def _sort_matches(matches: List[dict], q_clean: str) -> List[dict]:
    """Prioritize exact symbol match, then symbol prefix, then company name prefix."""
    q_upper = q_clean.upper()
    q_lower = q_clean.lower()

    def rank(item: dict) -> tuple:
        sym = item["ticker_symbol"].upper()
        name = item["company_name"].lower()
        if sym == q_upper:
            return (0, sym)
        if sym.startswith(q_upper):
            return (1, sym)
        if name.startswith(q_lower):
            return (2, sym)
        return (3, sym)

    return sorted(matches, key=rank)


def resolve_yfinance_symbol(query: str) -> Optional[dict]:
    q_clean = query.strip()
    matches = _query_ticker_map(q_clean, limit=5)
    if matches:
        return matches[0]
    q_upper = q_clean.upper()
    if q_upper.endswith(".NS") or q_upper.endswith(".BO"):
        base = q_upper.rsplit(".", 1)[0]
        return {
            "ticker_symbol": base,
            "company_name": base,
            "yfinance_symbol": q_upper,
            "exchange": "BSE" if q_upper.endswith(".BO") else "NSE",
            "sector": "General",
        }
    return {
        "ticker_symbol": q_upper,
        "company_name": q_upper,
        "yfinance_symbol": f"{q_upper}.NS",
        "exchange": "NSE",
        "sector": "General",
    }


@router.get("/search", response_model=SearchResponse)
def search_stocks(
    q: str = Query(..., min_length=1, description="Company name or ticker symbol"),
    limit: int = Query(10, ge=1, le=25),
    user=Depends(verify_jwt),
):
    """Search NSE stocks from Supabase ticker_map (Authenticated)."""
    matches = _query_ticker_map(q, limit=limit)
    return SearchResponse(
        results=[TickerResult(**t) for t in matches],
        query=q,
    )


@router.get("/search/public", response_model=SearchResponse)
def search_stocks_public(
    q: str = Query(..., min_length=1, description="Company name or ticker symbol"),
    limit: int = Query(8, ge=1, le=15),
):
    """Public stock search & autocomplete endpoint backed by Supabase ticker_map."""
    matches = _query_ticker_map(q, limit=limit)
    return SearchResponse(
        results=[TickerResult(**t) for t in matches],
        query=q,
    )


@router.get("/market-data/historical", response_model=HistoricalDataResponse)
def get_historical_market_data(
    symbol: str = Query(..., description="NSE symbol e.g. INFY, RELIANCE, TCS"),
    period: str = Query("3mo", pattern="^(1mo|3mo|6mo|1y|2y|5y)$", description="Data duration (default: 3mo)"),
    interval: str = Query("1d", pattern="^(1d|1wk|1mo)$", description="Candle interval (default: 1d)"),
):
    """
    Milestone 1 Core Service:
    1. Resolves ticker symbol against ticker_map to yfinance format (.NS suffix).
    2. Downloads historical OHLCV data.
    3. Runs automated data validation checks (missing values, duplicate dates, price sanity).
    """
    resolved = resolve_yfinance_symbol(symbol)
    yf_symbol = resolved["yfinance_symbol"] if resolved else f"{symbol.upper()}.NS"

    res = fetch_historical_ohlcv(symbol=yf_symbol, period=period, interval=interval)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to fetch data for {symbol}: {res.get('error', 'Unknown retrieval error')}",
        )

    return res
