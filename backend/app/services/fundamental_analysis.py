"""Deterministic fundamental ratio calculations and financial statement parser."""

from typing import Any, Dict, List, Optional
import math
import yfinance as yf


def _safe_num(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        num = float(val)
        if math.isnan(num) or math.isinf(num):
            return None
        return num
    except (TypeError, ValueError):
        return None


def compute_pe_ratio(price: Optional[float], eps: Optional[float]) -> Optional[float]:
    """Price-to-Earnings ratio = Price / EPS (only defined for positive EPS)."""
    if price is None or eps is None or eps <= 0:
        return None
    return round(price / eps, 2)


def compute_pb_ratio(price: Optional[float], book_value_per_share: Optional[float]) -> Optional[float]:
    """Price-to-Book ratio = Price / Book Value per Share."""
    if price is None or book_value_per_share is None or book_value_per_share <= 0:
        return None
    return round(price / book_value_per_share, 2)


def compute_roe(net_income: Optional[float], shareholders_equity: Optional[float]) -> Optional[float]:
    """Return on Equity (%) = (Net Income / Shareholders' Equity) * 100."""
    if net_income is None or shareholders_equity is None or shareholders_equity <= 0:
        return None
    return round((net_income / shareholders_equity) * 100.0, 2)


def compute_margin(numerator: Optional[float], revenue: Optional[float]) -> Optional[float]:
    """Profit/Operating Margin (%) = (Numerator / Total Revenue) * 100."""
    if numerator is None or revenue is None or revenue <= 0:
        return None
    return round((numerator / revenue) * 100.0, 2)


def compute_debt_to_equity(total_debt: Optional[float], shareholders_equity: Optional[float]) -> Optional[float]:
    """Debt-to-Equity ratio = Total Debt / Shareholders' Equity."""
    if total_debt is None or shareholders_equity is None or shareholders_equity <= 0:
        return None
    return round(total_debt / shareholders_equity, 2)


def compute_current_ratio(current_assets: Optional[float], current_liabilities: Optional[float]) -> Optional[float]:
    """Current Ratio = Current Assets / Current Liabilities."""
    if current_assets is None or current_liabilities is None or current_liabilities <= 0:
        return None
    return round(current_assets / current_liabilities, 2)


def compute_yoy_growth(current_value: Optional[float], previous_value: Optional[float]) -> Optional[float]:
    """Year-over-Year growth (%) = ((Current - Previous) / |Previous|) * 100."""
    if current_value is None or previous_value is None or previous_value == 0:
        return None
    return round(((current_value - previous_value) / abs(previous_value)) * 100.0, 2)


def _extract_row_values(statement_df: Any, candidate_keys: List[str]) -> List[Optional[float]]:
    """Extracts up to 2 most recent period values for the first matching line item."""
    if statement_df is None or getattr(statement_df, "empty", True):
        return []
    for key in candidate_keys:
        if key in statement_df.index:
            row = statement_df.loc[key]
            # Sort columns descending by date if possible
            vals = [_safe_num(v) for v in row.values[:2]]
            return vals
    return []


def compute_fundamentals_from_inputs(
    symbol: str,
    price: Optional[float] = None,
    eps: Optional[float] = None,
    book_value_per_share: Optional[float] = None,
    revenue_current: Optional[float] = None,
    revenue_previous: Optional[float] = None,
    net_income_current: Optional[float] = None,
    net_income_previous: Optional[float] = None,
    operating_income: Optional[float] = None,
    total_debt: Optional[float] = None,
    shareholders_equity: Optional[float] = None,
    current_assets: Optional[float] = None,
    current_liabilities: Optional[float] = None,
    market_cap: Optional[float] = None,
    dividend_yield_pct: Optional[float] = None,
    info_fallbacks: Optional[Dict[str, Optional[float]]] = None,
    company_name: Optional[str] = None,
    sector: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Pure, reproducible fundamental metric calculator.
    Computes ratios directly from financial statement inputs and flags missing fields.
    """
    fallbacks = info_fallbacks or {}
    missing_fields: List[str] = []
    warnings: List[str] = []

    pe_ratio = compute_pe_ratio(price, eps) or _safe_num(fallbacks.get("pe_ratio"))
    pb_ratio = compute_pb_ratio(price, book_value_per_share) or _safe_num(fallbacks.get("pb_ratio"))
    roe_pct = compute_roe(net_income_current, shareholders_equity) or _safe_num(fallbacks.get("roe_pct"))
    net_margin_pct = compute_margin(net_income_current, revenue_current) or _safe_num(fallbacks.get("net_margin_pct"))
    operating_margin_pct = compute_margin(operating_income, revenue_current) or _safe_num(fallbacks.get("operating_margin_pct"))
    debt_to_equity = compute_debt_to_equity(total_debt, shareholders_equity)
    if debt_to_equity is None:
        fb_de = _safe_num(fallbacks.get("debt_to_equity"))
        if fb_de is not None:
            debt_to_equity = fb_de
    current_ratio = compute_current_ratio(current_assets, current_liabilities) or _safe_num(fallbacks.get("current_ratio"))
    revenue_growth_pct = compute_yoy_growth(revenue_current, revenue_previous)
    if revenue_growth_pct is None:
        revenue_growth_pct = _safe_num(fallbacks.get("revenue_growth_pct"))
    earnings_growth_pct = compute_yoy_growth(net_income_current, net_income_previous)
    if earnings_growth_pct is None:
        earnings_growth_pct = _safe_num(fallbacks.get("earnings_growth_pct"))

    metric_map = {
        "pe_ratio": pe_ratio,
        "pb_ratio": pb_ratio,
        "roe_pct": roe_pct,
        "net_margin_pct": net_margin_pct,
        "operating_margin_pct": operating_margin_pct,
        "debt_to_equity": debt_to_equity,
        "current_ratio": current_ratio,
        "revenue_growth_pct": revenue_growth_pct,
        "earnings_growth_pct": earnings_growth_pct,
    }

    for k, v in metric_map.items():
        if v is None:
            missing_fields.append(k)

    if eps is not None and eps <= 0:
        warnings.append("EPS is non-positive; P/E ratio is not meaningful.")
    if shareholders_equity is not None and shareholders_equity <= 0:
        warnings.append("Shareholders' equity is non-positive; ROE and Debt-to-Equity cannot be reliably computed.")
    if missing_fields:
        warnings.append(f"Missing or unavailable metrics: {', '.join(missing_fields)}")

    return {
        "symbol": symbol,
        "company_name": company_name,
        "sector": sector,
        "currency": "INR",
        "valuation": {
            "current_price": round(price, 2) if price is not None else None,
            "market_cap": market_cap,
            "eps": round(eps, 2) if eps is not None else None,
            "pe_ratio": pe_ratio,
            "pb_ratio": pb_ratio,
            "dividend_yield_pct": dividend_yield_pct,
        },
        "profitability": {
            "roe_pct": roe_pct,
            "net_margin_pct": net_margin_pct,
            "operating_margin_pct": operating_margin_pct,
        },
        "growth": {
            "revenue_latest": revenue_current,
            "revenue_growth_yoy_pct": revenue_growth_pct,
            "net_income_latest": net_income_current,
            "earnings_growth_yoy_pct": earnings_growth_pct,
        },
        "financial_stability": {
            "total_debt": total_debt,
            "shareholders_equity": shareholders_equity,
            "debt_to_equity": debt_to_equity,
            "current_ratio": current_ratio,
        },
        "data_quality": {
            "missing_fields": missing_fields,
            "warnings": warnings,
        },
    }


def fetch_and_compute_fundamentals(symbol: str) -> Dict[str, Any]:
    """Fetches yfinance statements and info for `symbol` and runs deterministic ratio math."""
    ticker = yf.Ticker(symbol)
    info = ticker.info or {}

    try:
        income_stmt = ticker.income_stmt
    except Exception:
        income_stmt = None

    try:
        balance_sheet = ticker.balance_sheet
    except Exception:
        balance_sheet = None

    rev_vals = _extract_row_values(income_stmt, ["Total Revenue", "Operating Revenue"])
    ni_vals = _extract_row_values(income_stmt, ["Net Income", "Net Income Common Stockholders"])
    op_vals = _extract_row_values(income_stmt, ["Operating Income", "EBIT"])

    debt_vals = _extract_row_values(balance_sheet, ["Total Debt", "Long Term Debt And Capital Lease Obligation"])
    eq_vals = _extract_row_values(balance_sheet, ["Stockholders Equity", "Total Equity Gross Minority Interest", "Common Stock Equity"])
    ca_vals = _extract_row_values(balance_sheet, ["Current Assets"])
    cl_vals = _extract_row_values(balance_sheet, ["Current Liabilities"])

    price = _safe_num(info.get("currentPrice") or info.get("regularMarketPrice"))
    eps = _safe_num(info.get("trailingEps"))
    bvps = _safe_num(info.get("bookValue"))
    market_cap = _safe_num(info.get("marketCap"))
    div_yield_raw = _safe_num(info.get("dividendYield"))
    dividend_yield_pct = round(div_yield_raw * 100.0, 2) if div_yield_raw is not None and div_yield_raw < 1 else div_yield_raw

    # yfinance info provides some ratios as fractions (e.g. 0.25 for 25%) or percentages (debtToEquity is %)
    info_de = _safe_num(info.get("debtToEquity"))
    info_fallbacks = {
        "pe_ratio": round(float(info["trailingPE"]), 2) if _safe_num(info.get("trailingPE")) else None,
        "pb_ratio": round(float(info["priceToBook"]), 2) if _safe_num(info.get("priceToBook")) else None,
        "roe_pct": round(float(info["returnOnEquity"]) * 100.0, 2) if _safe_num(info.get("returnOnEquity")) is not None else None,
        "net_margin_pct": round(float(info["profitMargins"]) * 100.0, 2) if _safe_num(info.get("profitMargins")) is not None else None,
        "operating_margin_pct": round(float(info["operatingMargins"]) * 100.0, 2) if _safe_num(info.get("operatingMargins")) is not None else None,
        "debt_to_equity": round(info_de / 100.0, 2) if info_de is not None else None,
        "current_ratio": round(float(info["currentRatio"]), 2) if _safe_num(info.get("currentRatio")) else None,
        "revenue_growth_pct": round(float(info["revenueGrowth"]) * 100.0, 2) if _safe_num(info.get("revenueGrowth")) is not None else None,
        "earnings_growth_pct": round(float(info["earningsGrowth"]) * 100.0, 2) if _safe_num(info.get("earningsGrowth")) is not None else None,
    }

    return compute_fundamentals_from_inputs(
        symbol=symbol,
        price=price,
        eps=eps,
        book_value_per_share=bvps,
        revenue_current=rev_vals[0] if len(rev_vals) >= 1 else None,
        revenue_previous=rev_vals[1] if len(rev_vals) >= 2 else None,
        net_income_current=ni_vals[0] if len(ni_vals) >= 1 else None,
        net_income_previous=ni_vals[1] if len(ni_vals) >= 2 else None,
        operating_income=op_vals[0] if len(op_vals) >= 1 else None,
        total_debt=debt_vals[0] if len(debt_vals) >= 1 else None,
        shareholders_equity=eq_vals[0] if len(eq_vals) >= 1 else None,
        current_assets=ca_vals[0] if len(ca_vals) >= 1 else None,
        current_liabilities=cl_vals[0] if len(cl_vals) >= 1 else None,
        market_cap=market_cap,
        dividend_yield_pct=dividend_yield_pct,
        info_fallbacks=info_fallbacks,
        company_name=info.get("shortName") or info.get("longName"),
        sector=info.get("sector"),
    )
