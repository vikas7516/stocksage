"""Deterministic technical indicator calculations and chart series builder."""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

TECHNICAL_DISCLAIMER = (
    "Technical indicators describe historical market conditions and should not be "
    "treated as guaranteed predictions or financial advice."
)


def calculate_sma(series: pd.Series, window: int) -> pd.Series:
    """Simple Moving Average over `window` periods."""
    if window <= 0:
        raise ValueError("SMA window must be positive")
    return series.astype(float).rolling(window=window, min_periods=window).mean()


def calculate_ema(series: pd.Series, span: int) -> pd.Series:
    """Exponential Moving Average with standard alpha = 2 / (span + 1)."""
    if span <= 0:
        raise ValueError("EMA span must be positive")
    return series.astype(float).ewm(span=span, adjust=False, min_periods=span).mean()


def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """
    Wilder's Relative Strength Index (RSI).
    RSI = 100 - (100 / (1 + AvgGain / AvgLoss)).
    """
    if period <= 0:
        raise ValueError("RSI period must be positive")

    close = series.astype(float)
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)

    avg_gain = gain.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()

    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    # When avg_loss is 0 and avg_gain > 0, RSI is 100; when both are 0, RSI is 50
    rsi = rsi.where(avg_loss != 0.0, np.where(avg_gain > 0.0, 100.0, 50.0))
    # Preserve initial warm-up NaNs
    rsi.iloc[:period] = np.nan
    return rsi


def calculate_macd(
    series: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9,
) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """
    Moving Average Convergence Divergence (MACD).
    Returns (macd_line, signal_line, histogram).
    """
    close = series.astype(float)
    ema_fast = close.ewm(span=fast, adjust=False, min_periods=fast).mean()
    ema_slow = close.ewm(span=slow, adjust=False, min_periods=slow).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def calculate_historical_volatility(series: pd.Series, trading_days: int = 252) -> Optional[float]:
    """
    Annualized historical volatility (%) from daily percentage returns.
    Uses sample standard deviation (ddof=1).
    """
    returns = series.astype(float).pct_change().dropna()
    if len(returns) < 2:
        return None
    daily_std = float(returns.std(ddof=1))
    return round(daily_std * np.sqrt(trading_days) * 100.0, 2)


def _clean_float(val: Any, decimals: int = 2) -> Optional[float]:
    if val is None or pd.isna(val) or np.isinf(val):
        return None
    return round(float(val), decimals)


def analyze_technical_indicators(
    df: pd.DataFrame,
    symbol: str,
    display_bars: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Computes SMA-20, SMA-50, EMA-20, RSI-14, MACD(12,26,9), and Annualized Volatility,
    evaluates predefined trend conditions, and builds chart-ready OHLCV + indicator records.
    """
    if df.empty or "Close" not in df.columns:
        return {
            "symbol": symbol,
            "error": "Insufficient price history for technical analysis",
            "latest_price": None,
            "indicators": {},
            "signals": {"overall_trend": "unavailable", "conditions": []},
            "disclaimer": TECHNICAL_DISCLAIMER,
            "chart_data": [],
        }

    work = df.loc[~df.index.duplicated(keep="first")].copy().sort_index()
    work.ffill(inplace=True)

    close = work["Close"].astype(float)
    sma20 = calculate_sma(close, 20)
    sma50 = calculate_sma(close, 50)
    ema20 = calculate_ema(close, 20)
    rsi14 = calculate_rsi(close, 14)
    macd_line, signal_line, macd_hist = calculate_macd(close, 12, 26, 9)

    work["sma20"] = sma20
    work["sma50"] = sma50
    work["ema20"] = ema20
    work["rsi14"] = rsi14
    work["macd"] = macd_line
    work["macd_signal"] = signal_line
    work["macd_hist"] = macd_hist

    if display_bars and len(work) > display_bars:
        view_df = work.iloc[-display_bars:]
    else:
        view_df = work

    ann_vol = calculate_historical_volatility(view_df["Close"])
    latest = view_df.iloc[-1]
    first_close = float(view_df.iloc[0]["Close"])
    latest_close = float(latest["Close"])
    period_return_pct = (
        round(((latest_close - first_close) / first_close) * 100.0, 2)
        if first_close > 0
        else None
    )

    latest_sma20 = _clean_float(latest["sma20"])
    latest_sma50 = _clean_float(latest["sma50"])
    latest_ema20 = _clean_float(latest["ema20"])
    latest_rsi14 = _clean_float(latest["rsi14"])
    latest_macd = _clean_float(latest["macd"], 3)
    latest_macd_sig = _clean_float(latest["macd_signal"], 3)
    latest_macd_hist = _clean_float(latest["macd_hist"], 3)

    conditions: List[Dict[str, str]] = []
    bullish_votes = 0
    bearish_votes = 0

    if latest_sma20 is not None:
        if latest_close > latest_sma20:
            bullish_votes += 1
            conditions.append({"indicator": "SMA-20", "signal": "bullish", "detail": f"Price ({latest_close:.2f}) is above 20-day SMA ({latest_sma20:.2f})."})
        else:
            bearish_votes += 1
            conditions.append({"indicator": "SMA-20", "signal": "bearish", "detail": f"Price ({latest_close:.2f}) is below 20-day SMA ({latest_sma20:.2f})."})

    if latest_sma50 is not None:
        if latest_close > latest_sma50:
            bullish_votes += 1
            conditions.append({"indicator": "SMA-50", "signal": "bullish", "detail": f"Price ({latest_close:.2f}) is above 50-day SMA ({latest_sma50:.2f})."})
        else:
            bearish_votes += 1
            conditions.append({"indicator": "SMA-50", "signal": "bearish", "detail": f"Price ({latest_close:.2f}) is below 50-day SMA ({latest_sma50:.2f})."})

    if latest_rsi14 is not None:
        if latest_rsi14 >= 70:
            conditions.append({"indicator": "RSI-14", "signal": "overbought", "detail": f"RSI-14 is {latest_rsi14:.2f} (>= 70 overbought zone)."})
        elif latest_rsi14 <= 30:
            conditions.append({"indicator": "RSI-14", "signal": "oversold", "detail": f"RSI-14 is {latest_rsi14:.2f} (<= 30 oversold zone)."})
        else:
            conditions.append({"indicator": "RSI-14", "signal": "neutral", "detail": f"RSI-14 is {latest_rsi14:.2f} (neutral 30-70 range)."})

    if latest_macd is not None and latest_macd_sig is not None:
        if latest_macd > latest_macd_sig:
            bullish_votes += 1
            conditions.append({"indicator": "MACD", "signal": "bullish", "detail": f"MACD ({latest_macd:.3f}) is above Signal ({latest_macd_sig:.3f})."})
        else:
            bearish_votes += 1
            conditions.append({"indicator": "MACD", "signal": "bearish", "detail": f"MACD ({latest_macd:.3f}) is below Signal ({latest_macd_sig:.3f})."})

    if bullish_votes >= 2 and bearish_votes == 0:
        overall_trend = "upward"
    elif bearish_votes >= 2 and bullish_votes == 0:
        overall_trend = "downward"
    elif bullish_votes > bearish_votes:
        overall_trend = "moderately_upward"
    elif bearish_votes > bullish_votes:
        overall_trend = "moderately_downward"
    else:
        overall_trend = "mixed"

    chart_data: List[Dict[str, Any]] = []
    for ts, row in view_df.iterrows():
        date_str = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
        chart_data.append({
            "date": date_str,
            "open": _clean_float(row.get("Open")),
            "high": _clean_float(row.get("High")),
            "low": _clean_float(row.get("Low")),
            "close": _clean_float(row.get("Close")),
            "volume": int(row.get("Volume", 0)) if not pd.isna(row.get("Volume")) else 0,
            "sma20": _clean_float(row["sma20"]),
            "sma50": _clean_float(row["sma50"]),
            "ema20": _clean_float(row["ema20"]),
            "rsi14": _clean_float(row["rsi14"]),
            "macd": _clean_float(row["macd"], 3),
            "macd_signal": _clean_float(row["macd_signal"], 3),
            "macd_hist": _clean_float(row["macd_hist"], 3),
        })

    return {
        "symbol": symbol,
        "latest_price": round(latest_close, 2),
        "period_return_pct": period_return_pct,
        "indicators": {
            "sma20": latest_sma20,
            "sma50": latest_sma50,
            "ema20": latest_ema20,
            "rsi14": latest_rsi14,
            "macd": latest_macd,
            "macd_signal": latest_macd_sig,
            "macd_histogram": latest_macd_hist,
            "annualized_volatility_pct": ann_vol,
        },
        "signals": {
            "overall_trend": overall_trend,
            "conditions": conditions,
        },
        "disclaimer": TECHNICAL_DISCLAIMER,
        "chart_data": chart_data,
    }
