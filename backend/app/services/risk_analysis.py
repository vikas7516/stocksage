"""Reproducible quantitative risk calculations (volatility, drawdown, VaR, Sharpe proxy)."""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def calculate_max_drawdown(close_series: pd.Series) -> Dict[str, Any]:
    """
    Computes Maximum Drawdown (MDD) from a Close price series.
    Drawdown(t) = (Close(t) - RunningPeak(t)) / RunningPeak(t).
    """
    clean = close_series.astype(float).dropna()
    if clean.empty:
        return {
            "max_drawdown_pct": None,
            "peak_date": None,
            "peak_price": None,
            "trough_date": None,
            "trough_price": None,
            "current_drawdown_pct": None,
        }

    running_max = clean.cummax()
    drawdowns = (clean - running_max) / running_max

    trough_idx = drawdowns.idxmin()
    max_dd = float(drawdowns.loc[trough_idx])

    # Peak preceding the trough
    slice_to_trough = clean.loc[:trough_idx]
    peak_idx = slice_to_trough.idxmax()

    def _fmt_date(idx: Any) -> str:
        return idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]

    return {
        "max_drawdown_pct": round(max_dd * 100.0, 2),
        "peak_date": _fmt_date(peak_idx),
        "peak_price": round(float(clean.loc[peak_idx]), 2),
        "trough_date": _fmt_date(trough_idx),
        "trough_price": round(float(clean.loc[trough_idx]), 2),
        "current_drawdown_pct": round(float(drawdowns.iloc[-1]) * 100.0, 2),
    }


def calculate_var_95(returns: pd.Series) -> Optional[float]:
    """Historical 95% daily Value at Risk (%) — 5th percentile of daily returns."""
    clean = returns.dropna()
    if len(clean) < 5:
        return None
    return round(float(np.percentile(clean, 5)) * 100.0, 2)


def calculate_sharpe_ratio(
    returns: pd.Series,
    risk_free_annual: float = 0.065,
    trading_days: int = 252,
) -> Optional[float]:
    """Annualized Sharpe ratio using 6.5% India T-Bill/G-Sec risk-free proxy."""
    clean = returns.dropna()
    if len(clean) < 2:
        return None
    std = float(clean.std(ddof=1))
    if std == 0.0:
        return None
    ann_return = float(clean.mean()) * trading_days
    ann_vol = std * np.sqrt(trading_days)
    return round((ann_return - risk_free_annual) / ann_vol, 2)


def assess_risk_metrics(
    df: pd.DataFrame,
    symbol: str,
    fundamentals: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Computes reproducible risk metrics from historical OHLCV data
    and flags financial/data risks deterministically.
    """
    if df.empty or "Close" not in df.columns:
        return {
            "symbol": symbol,
            "risk_level": "UNKNOWN",
            "metrics": {},
            "risk_factors": ["No historical price series available."],
            "limitations": ["Insufficient market data to calculate volatility or drawdown."],
        }

    work = df.loc[~df.index.duplicated(keep="first")].copy().sort_index()
    work.ffill(inplace=True)
    close = work["Close"].astype(float)
    returns = close.pct_change().dropna()

    ann_vol_pct = (
        round(float(returns.std(ddof=1)) * np.sqrt(252) * 100.0, 2)
        if len(returns) >= 2
        else None
    )
    dd_info = calculate_max_drawdown(close)
    var_95_pct = calculate_var_95(returns)
    sharpe = calculate_sharpe_ratio(returns)

    risk_factors: List[str] = []
    limitations: List[str] = []
    score = 0

    if ann_vol_pct is not None:
        if ann_vol_pct >= 35.0:
            score += 2
            risk_factors.append(f"High annualized price volatility ({ann_vol_pct:.2f}% >= 35%).")
        elif ann_vol_pct >= 20.0:
            score += 1
            risk_factors.append(f"Moderate annualized price volatility ({ann_vol_pct:.2f}%).")
        else:
            risk_factors.append(f"Low annualized price volatility ({ann_vol_pct:.2f}% < 20%).")

    max_dd = dd_info.get("max_drawdown_pct")
    if max_dd is not None:
        if max_dd <= -20.0:
            score += 2
            risk_factors.append(f"Severe peak-to-trough drawdown of {max_dd:.2f}%.")
        elif max_dd <= -10.0:
            score += 1
            risk_factors.append(f"Notable peak-to-trough drawdown of {max_dd:.2f}%.")

    if fundamentals:
        de = fundamentals.get("financial_stability", {}).get("debt_to_equity")
        if de is not None and de > 1.5:
            score += 1
            risk_factors.append(f"Elevated Debt-to-Equity ratio ({de:.2f}).")
        missing = fundamentals.get("data_quality", {}).get("missing_fields", [])
        if missing:
            limitations.append(f"Missing fundamental fields: {', '.join(missing)}.")

    if len(close) < 40:
        limitations.append(f"Short price sample ({len(close)} trading days); risk estimates may be noisy.")

    if score >= 3:
        risk_level = "HIGH"
    elif score >= 1:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    return {
        "symbol": symbol,
        "risk_level": risk_level,
        "metrics": {
            "annualized_volatility_pct": ann_vol_pct,
            "max_drawdown_pct": dd_info["max_drawdown_pct"],
            "peak_date": dd_info["peak_date"],
            "peak_price": dd_info["peak_price"],
            "trough_date": dd_info["trough_date"],
            "trough_price": dd_info["trough_price"],
            "current_drawdown_pct": dd_info["current_drawdown_pct"],
            "var_95_daily_pct": var_95_pct,
            "sharpe_proxy": sharpe,
        },
        "risk_factors": risk_factors,
        "limitations": limitations,
    }
