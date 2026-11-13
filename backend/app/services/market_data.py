import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


def validate_market_data(df: pd.DataFrame, ticker: str) -> Dict[str, Any]:
    """
    Validates OHLCV historical time series data.
    Checks:
    1. Non-empty dataset
    2. Missing values / nulls
    3. Duplicate dates
    4. Price sanity (High >= Low, Volume >= 0)
    """
    checks = {
        "ticker": ticker,
        "is_valid": True,
        "row_count": len(df),
        "issues": [],
        "null_counts": {},
        "duplicates": 0,
        "date_range": {}
    }

    if df.empty:
        checks["is_valid"] = False
        checks["issues"].append("Empty DataFrame returned from yfinance")
        return checks

    # Handle duplicates in index/timestamp
    dup_count = int(df.index.duplicated().sum())
    checks["duplicates"] = dup_count
    if dup_count > 0:
        checks["is_valid"] = False
        checks["issues"].append(f"Found {dup_count} duplicate date indices")

    # Null checks across OHLCV columns
    required_cols = ["Open", "High", "Low", "Close", "Volume"]
    for col in required_cols:
        if col in df.columns:
            null_count = int(df[col].isnull().sum())
            checks["null_counts"][col] = null_count
            if null_count > 0:
                checks["is_valid"] = False
                checks["issues"].append(f"Column {col} has {null_count} null/missing values")
        else:
            checks["is_valid"] = False
            checks["issues"].append(f"Missing required column: {col}")

    # Logical price checks (High must be >= Low, Volume >= 0)
    if "High" in df.columns and "Low" in df.columns:
        invalid_spreads = int((df["High"] < df["Low"]).sum())
        if invalid_spreads > 0:
            checks["is_valid"] = False
            checks["issues"].append(f"Found {invalid_spreads} records where High < Low")

    if "Volume" in df.columns:
        negative_volumes = int((df["Volume"] < 0).sum())
        if negative_volumes > 0:
            checks["is_valid"] = False
            checks["issues"].append(f"Found {negative_volumes} records with negative volume")

    # Date bounds
    try:
        start_date = str(df.index.min().date())
        end_date = str(df.index.max().date())
        checks["date_range"] = {"start": start_date, "end": end_date}
    except Exception as e:
        logger.warning(f"Could not parse date range for {ticker}: {e}")

    return checks


def fetch_historical_ohlcv(
    symbol: str,
    period: str = "3mo",
    interval: str = "1d"
) -> Dict[str, Any]:
    """
    Fetches and sanitizes OHLCV series using yfinance.
    Appends ticker validation metadata.
    """
    retrieval_timestamp = datetime.now(timezone.utc).isoformat()
    try:
        ticker_obj = yf.Ticker(symbol)
        df = ticker_obj.history(period=period, interval=interval)

        # Run validation suite
        validation = validate_market_data(df, symbol)

        records: List[Dict[str, Any]] = []
        if not df.empty:
            # Drop duplicates if any and forward-fill occasional market halts
            clean_df = df.loc[~df.index.duplicated(keep="first")].copy()
            clean_df.ffill(inplace=True)

            for ts, row in clean_df.iterrows():
                date_str = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
                records.append({
                    "date": date_str,
                    "open": round(float(row.get("Open", 0.0)), 2),
                    "high": round(float(row.get("High", 0.0)), 2),
                    "low": round(float(row.get("Low", 0.0)), 2),
                    "close": round(float(row.get("Close", 0.0)), 2),
                    "volume": int(row.get("Volume", 0)),
                })

        # Fetch basic profile details if available
        company_info = {}
        try:
            info = ticker_obj.info or {}
            company_info = {
                "name": info.get("shortName") or info.get("longName"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "currency": info.get("currency", "INR"),
                "market_cap": info.get("marketCap"),
                "regular_market_price": info.get("regularMarketPrice") or info.get("currentPrice"),
                "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
                "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
            }
        except Exception as info_err:
            logger.info(f"Summary info unavailable for {symbol}: {info_err}")

        return {
            "success": True,
            "symbol": symbol,
            "period": period,
            "retrieval_timestamp": retrieval_timestamp,
            "company_info": company_info,
            "validation": validation,
            "data": records
        }

    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {str(e)}")
        return {
            "success": False,
            "symbol": symbol,
            "period": period,
            "retrieval_timestamp": retrieval_timestamp,
            "error": str(e),
            "validation": {
                "is_valid": False,
                "issues": [f"Fetch exception: {str(e)}"]
            },
            "data": []
        }
