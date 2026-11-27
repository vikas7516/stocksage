"""Canonical NSE ticker seed dataset and optional Supabase CLI/SDK upserter."""

from typing import Dict, List

NSE_SEED_TICKERS: List[Dict[str, str]] = [
    {"ticker_symbol": "INFY", "company_name": "Infosys Limited", "yfinance_symbol": "INFY.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "TCS", "company_name": "Tata Consultancy Services Limited", "yfinance_symbol": "TCS.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "RELIANCE", "company_name": "Reliance Industries Limited", "yfinance_symbol": "RELIANCE.NS", "exchange": "NSE", "sector": "Energy"},
    {"ticker_symbol": "HDFCBANK", "company_name": "HDFC Bank Limited", "yfinance_symbol": "HDFCBANK.NS", "exchange": "NSE", "sector": "Banking & Financial Services"},
    {"ticker_symbol": "ICICIBANK", "company_name": "ICICI Bank Limited", "yfinance_symbol": "ICICIBANK.NS", "exchange": "NSE", "sector": "Banking & Financial Services"},
    {"ticker_symbol": "WIPRO", "company_name": "Wipro Limited", "yfinance_symbol": "WIPRO.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "TATAMOTORS", "company_name": "Tata Motors Limited", "yfinance_symbol": "TATAMOTORS.NS", "exchange": "NSE", "sector": "Automobile"},
    {"ticker_symbol": "SBIN", "company_name": "State Bank of India", "yfinance_symbol": "SBIN.NS", "exchange": "NSE", "sector": "Banking & Financial Services"},
    {"ticker_symbol": "BHARTIARTL", "company_name": "Bharti Airtel Limited", "yfinance_symbol": "BHARTIARTL.NS", "exchange": "NSE", "sector": "Telecommunications"},
    {"ticker_symbol": "ITC", "company_name": "ITC Limited", "yfinance_symbol": "ITC.NS", "exchange": "NSE", "sector": "FMCG"},
    {"ticker_symbol": "HINDUNILVR", "company_name": "Hindustan Unilever Limited", "yfinance_symbol": "HINDUNILVR.NS", "exchange": "NSE", "sector": "FMCG"},
    {"ticker_symbol": "LT", "company_name": "Larsen & Toubro Limited", "yfinance_symbol": "LT.NS", "exchange": "NSE", "sector": "Engineering & Construction"},
    {"ticker_symbol": "AXISBANK", "company_name": "Axis Bank Limited", "yfinance_symbol": "AXISBANK.NS", "exchange": "NSE", "sector": "Banking & Financial Services"},
    {"ticker_symbol": "KOTAKBANK", "company_name": "Kotak Mahindra Bank Limited", "yfinance_symbol": "KOTAKBANK.NS", "exchange": "NSE", "sector": "Banking & Financial Services"},
    {"ticker_symbol": "BAJFINANCE", "company_name": "Bajaj Finance Limited", "yfinance_symbol": "BAJFINANCE.NS", "exchange": "NSE", "sector": "Financial Services"},
    {"ticker_symbol": "BAJAJFINSV", "company_name": "Bajaj Finserv Limited", "yfinance_symbol": "BAJAJFINSV.NS", "exchange": "NSE", "sector": "Financial Services"},
    {"ticker_symbol": "HCLTECH", "company_name": "HCL Technologies Limited", "yfinance_symbol": "HCLTECH.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "TECHM", "company_name": "Tech Mahindra Limited", "yfinance_symbol": "TECHM.NS", "exchange": "NSE", "sector": "Information Technology"},
    {"ticker_symbol": "MARUTI", "company_name": "Maruti Suzuki India Limited", "yfinance_symbol": "MARUTI.NS", "exchange": "NSE", "sector": "Automobile"},
    {"ticker_symbol": "M&M", "company_name": "Mahindra & Mahindra Limited", "yfinance_symbol": "M&M.NS", "exchange": "NSE", "sector": "Automobile"},
    {"ticker_symbol": "SUNPHARMA", "company_name": "Sun Pharmaceutical Industries Limited", "yfinance_symbol": "SUNPHARMA.NS", "exchange": "NSE", "sector": "Pharmaceuticals"},
    {"ticker_symbol": "CIPLA", "company_name": "Cipla Limited", "yfinance_symbol": "CIPLA.NS", "exchange": "NSE", "sector": "Pharmaceuticals"},
    {"ticker_symbol": "DRREDDY", "company_name": "Dr. Reddys Laboratories Limited", "yfinance_symbol": "DRREDDY.NS", "exchange": "NSE", "sector": "Pharmaceuticals"},
    {"ticker_symbol": "TITAN", "company_name": "Titan Company Limited", "yfinance_symbol": "TITAN.NS", "exchange": "NSE", "sector": "Consumer Durables"},
    {"ticker_symbol": "ASIANPAINT", "company_name": "Asian Paints Limited", "yfinance_symbol": "ASIANPAINT.NS", "exchange": "NSE", "sector": "Consumer Durables"},
    {"ticker_symbol": "ULTRACEMCO", "company_name": "UltraTech Cement Limited", "yfinance_symbol": "ULTRACEMCO.NS", "exchange": "NSE", "sector": "Materials & Cement"},
    {"ticker_symbol": "NESTLEIND", "company_name": "Nestle India Limited", "yfinance_symbol": "NESTLEIND.NS", "exchange": "NSE", "sector": "FMCG"},
    {"ticker_symbol": "BRITANNIA", "company_name": "Britannia Industries Limited", "yfinance_symbol": "BRITANNIA.NS", "exchange": "NSE", "sector": "FMCG"},
    {"ticker_symbol": "TATACONSUM", "company_name": "Tata Consumer Products Limited", "yfinance_symbol": "TATACONSUM.NS", "exchange": "NSE", "sector": "FMCG"},
    {"ticker_symbol": "NTPC", "company_name": "NTPC Limited", "yfinance_symbol": "NTPC.NS", "exchange": "NSE", "sector": "Power & Utilities"},
    {"ticker_symbol": "POWERGRID", "company_name": "Power Grid Corporation of India Limited", "yfinance_symbol": "POWERGRID.NS", "exchange": "NSE", "sector": "Power & Utilities"},
    {"ticker_symbol": "ONGC", "company_name": "Oil and Natural Gas Corporation Limited", "yfinance_symbol": "ONGC.NS", "exchange": "NSE", "sector": "Energy"},
    {"ticker_symbol": "COALINDIA", "company_name": "Coal India Limited", "yfinance_symbol": "COALINDIA.NS", "exchange": "NSE", "sector": "Energy & Mining"},
    {"ticker_symbol": "BPCL", "company_name": "Bharat Petroleum Corporation Limited", "yfinance_symbol": "BPCL.NS", "exchange": "NSE", "sector": "Energy"},
    {"ticker_symbol": "TATASTEEL", "company_name": "Tata Steel Limited", "yfinance_symbol": "TATASTEEL.NS", "exchange": "NSE", "sector": "Metals & Mining"},
    {"ticker_symbol": "JSWSTEEL", "company_name": "JSW Steel Limited", "yfinance_symbol": "JSWSTEEL.NS", "exchange": "NSE", "sector": "Metals & Mining"},
    {"ticker_symbol": "HINDALCO", "company_name": "Hindalco Industries Limited", "yfinance_symbol": "HINDALCO.NS", "exchange": "NSE", "sector": "Metals & Mining"},
    {"ticker_symbol": "ADANIENT", "company_name": "Adani Enterprises Limited", "yfinance_symbol": "ADANIENT.NS", "exchange": "NSE", "sector": "Diversified"},
    {"ticker_symbol": "ADANIPORTS", "company_name": "Adani Ports and Special Economic Zone Limited", "yfinance_symbol": "ADANIPORTS.NS", "exchange": "NSE", "sector": "Infrastructure"},
    {"ticker_symbol": "BAJAJ-AUTO", "company_name": "Bajaj Auto Limited", "yfinance_symbol": "BAJAJ-AUTO.NS", "exchange": "NSE", "sector": "Automobile"},
    {"ticker_symbol": "EICHERMOT", "company_name": "Eicher Motors Limited", "yfinance_symbol": "EICHERMOT.NS", "exchange": "NSE", "sector": "Automobile"},
    {"ticker_symbol": "HEROMOTOCO", "company_name": "Hero MotoCorp Limited", "yfinance_symbol": "HEROMOTOCO.NS", "exchange": "NSE", "sector": "Automobile"},
    {"ticker_symbol": "GRASIM", "company_name": "Grasim Industries Limited", "yfinance_symbol": "GRASIM.NS", "exchange": "NSE", "sector": "Materials & Cement"},
    {"ticker_symbol": "INDUSINDBK", "company_name": "IndusInd Bank Limited", "yfinance_symbol": "INDUSINDBK.NS", "exchange": "NSE", "sector": "Banking & Financial Services"},
    {"ticker_symbol": "APOLLOHOSP", "company_name": "Apollo Hospitals Enterprise Limited", "yfinance_symbol": "APOLLOHOSP.NS", "exchange": "NSE", "sector": "Healthcare"},
    {"ticker_symbol": "SBILIFE", "company_name": "SBI Life Insurance Company Limited", "yfinance_symbol": "SBILIFE.NS", "exchange": "NSE", "sector": "Insurance"},
    {"ticker_symbol": "HDFCLIFE", "company_name": "HDFC Life Insurance Company Limited", "yfinance_symbol": "HDFCLIFE.NS", "exchange": "NSE", "sector": "Insurance"},
    {"ticker_symbol": "LICI", "company_name": "Life Insurance Corporation of India", "yfinance_symbol": "LICI.NS", "exchange": "NSE", "sector": "Insurance"},
    {"ticker_symbol": "HAL", "company_name": "Hindustan Aeronautics Limited", "yfinance_symbol": "HAL.NS", "exchange": "NSE", "sector": "Aerospace & Defence"},
    {"ticker_symbol": "BEL", "company_name": "Bharat Electronics Limited", "yfinance_symbol": "BEL.NS", "exchange": "NSE", "sector": "Aerospace & Defence"},
    {"ticker_symbol": "IRCTC", "company_name": "Indian Railway Catering and Tourism Corporation Limited", "yfinance_symbol": "IRCTC.NS", "exchange": "NSE", "sector": "Services & Travel"},
    {"ticker_symbol": "TRENT", "company_name": "Trent Limited", "yfinance_symbol": "TRENT.NS", "exchange": "NSE", "sector": "Retail"},
    {"ticker_symbol": "DMART", "company_name": "Avenue Supermarts Limited (DMart)", "yfinance_symbol": "DMART.NS", "exchange": "NSE", "sector": "Retail"},
    {"ticker_symbol": "PIDILITIND", "company_name": "Pidilite Industries Limited", "yfinance_symbol": "PIDILITIND.NS", "exchange": "NSE", "sector": "Chemicals"},
    {"ticker_symbol": "HAVELLS", "company_name": "Havells India Limited", "yfinance_symbol": "HAVELLS.NS", "exchange": "NSE", "sector": "Electrical Equipment"},
    {"ticker_symbol": "SIEMENS", "company_name": "Siemens Limited", "yfinance_symbol": "SIEMENS.NS", "exchange": "NSE", "sector": "Engineering & Capital Goods"},
    {"ticker_symbol": "DLF", "company_name": "DLF Limited", "yfinance_symbol": "DLF.NS", "exchange": "NSE", "sector": "Real Estate"},
    {"ticker_symbol": "JIOFIN", "company_name": "Jio Financial Services Limited", "yfinance_symbol": "JIOFIN.NS", "exchange": "NSE", "sector": "Financial Services"},
    {"ticker_symbol": "VEDL", "company_name": "Vedanta Limited", "yfinance_symbol": "VEDL.NS", "exchange": "NSE", "sector": "Metals & Mining"},
    {"ticker_symbol": "DIVISLAB", "company_name": "Divi's Laboratories Limited", "yfinance_symbol": "DIVISLAB.NS", "exchange": "NSE", "sector": "Pharmaceuticals"},
]


def seed_database() -> int:
    """Upserts NSE_SEED_TICKERS into Supabase ticker_map (requires elevated service role key)."""
    from app.db.supabase_client import supabase

    if supabase is None:
        raise RuntimeError("Supabase client is not configured in .env")

    rows = [{**item, "is_active": True} for item in NSE_SEED_TICKERS]
    response = supabase.table("ticker_map").upsert(rows, on_conflict="ticker_symbol").execute()
    return len(response.data or [])


if __name__ == "__main__":
    count = seed_database()
    print(f"Seeded {count} NSE tickers into ticker_map.")
