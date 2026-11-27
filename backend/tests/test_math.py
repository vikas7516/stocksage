"""Numerical validation tests comparing financial math functions against independent reference values."""

import math
import numpy as np
import pandas as pd
import pytest

from app.services.fundamental_analysis import (
    compute_current_ratio,
    compute_debt_to_equity,
    compute_fundamentals_from_inputs,
    compute_margin,
    compute_pb_ratio,
    compute_pe_ratio,
    compute_roe,
    compute_yoy_growth,
)
from app.services.risk_analysis import (
    assess_risk_metrics,
    calculate_max_drawdown,
    calculate_var_95,
)
from app.services.technical_analysis import (
    analyze_technical_indicators,
    calculate_ema,
    calculate_historical_volatility,
    calculate_macd,
    calculate_rsi,
    calculate_sma,
)


def test_sma_reference():
    s = pd.Series([10.0, 20.0, 30.0, 40.0, 50.0])
    sma3 = calculate_sma(s, 3)
    assert pd.isna(sma3.iloc[0])
    assert pd.isna(sma3.iloc[1])
    assert sma3.iloc[2] == pytest.approx(20.0)
    assert sma3.iloc[3] == pytest.approx(30.0)
    assert sma3.iloc[4] == pytest.approx(40.0)


def test_ema_reference():
    # Manual EMA(3): alpha = 2/(3+1) = 0.5
    # e0 = 10; e1 = 0.5*20 + 0.5*10 = 15; e2 = 0.5*30 + 0.5*15 = 22.5; e3 = 0.5*40 + 0.5*22.5 = 31.25
    s = pd.Series([10.0, 20.0, 30.0, 40.0])
    ema3 = calculate_ema(s, 3)
    assert pd.isna(ema3.iloc[0])
    assert pd.isna(ema3.iloc[1])
    assert ema3.iloc[2] == pytest.approx(22.5)
    assert ema3.iloc[3] == pytest.approx(31.25)


def test_rsi_monotone_trends():
    # Strictly rising prices -> RSI = 100
    rising = pd.Series([100.0 + i for i in range(25)])
    rsi_up = calculate_rsi(rising, period=14)
    assert rsi_up.iloc[-1] == pytest.approx(100.0)

    # Strictly falling prices -> RSI = 0
    falling = pd.Series([200.0 - i for i in range(25)])
    rsi_down = calculate_rsi(falling, period=14)
    assert rsi_down.iloc[-1] == pytest.approx(0.0)


def test_macd_constant_series_is_zero():
    flat = pd.Series([150.0] * 40)
    macd_line, signal_line, hist = calculate_macd(flat)
    assert macd_line.iloc[-1] == pytest.approx(0.0)
    assert signal_line.iloc[-1] == pytest.approx(0.0)
    assert hist.iloc[-1] == pytest.approx(0.0)


def test_macd_uptrend_positive():
    uptrend = pd.Series([100.0 + i * 2.0 for i in range(50)])
    macd_line, signal_line, hist = calculate_macd(uptrend)
    assert macd_line.iloc[-1] > 0
    assert signal_line.iloc[-1] > 0


def test_historical_volatility_reference():
    # Alternating +10% and -10% returns? Better: known returns 100 -> 110 (+10%), 110 -> 110 (0%), 110 -> 121 (+10%)
    s = pd.Series([100.0, 110.0, 110.0, 121.0])
    # returns = [0.10, 0.00, 0.10], mean = 0.0666667, sample std = sqrt(((0.03333^2)*2 + 0.06667^2)/2) = 0.0577350269
    expected = round(pd.Series([0.10, 0.0, 0.10]).std(ddof=1) * math.sqrt(252) * 100.0, 2)
    assert calculate_historical_volatility(s) == pytest.approx(expected)


def test_max_drawdown_reference():
    dates = pd.date_range("2025-01-01", periods=6, freq="D")
    # Peak at 200 on day 2, trough at 100 on day 4 -> -50.0%, recovers to 180 on day 6 -> current DD = -10.0%
    close = pd.Series([100.0, 200.0, 150.0, 100.0, 140.0, 180.0], index=dates)
    dd = calculate_max_drawdown(close)
    assert dd["max_drawdown_pct"] == pytest.approx(-50.0)
    assert dd["peak_price"] == pytest.approx(200.0)
    assert dd["peak_date"] == "2025-01-02"
    assert dd["trough_price"] == pytest.approx(100.0)
    assert dd["trough_date"] == "2025-01-04"
    assert dd["current_drawdown_pct"] == pytest.approx(-10.0)


def test_var_95_and_risk_assessment():
    dates = pd.date_range("2025-01-01", periods=60, freq="B")
    rng = np.random.default_rng(42)
    prices = 1000.0 * np.cumprod(1.0 + rng.normal(0.0005, 0.02, size=60))
    df = pd.DataFrame({
        "Open": prices,
        "High": prices * 1.01,
        "Low": prices * 0.99,
        "Close": prices,
        "Volume": np.full(60, 100000),
    }, index=dates)

    risk1 = assess_risk_metrics(df, "TEST.NS")
    risk2 = assess_risk_metrics(df, "TEST.NS")
    # Reproducibility check
    assert risk1 == risk2
    assert risk1["risk_level"] in ("LOW", "MODERATE", "HIGH")
    assert risk1["metrics"]["max_drawdown_pct"] <= 0.0
    assert calculate_var_95(pd.Series(prices).pct_change()) < 0.0


def test_fundamental_ratios_and_missing_checks():
    assert compute_pe_ratio(1500.0, 50.0) == pytest.approx(30.0)
    assert compute_pe_ratio(1500.0, -5.0) is None
    assert compute_pb_ratio(1500.0, 300.0) == pytest.approx(5.0)
    assert compute_roe(250.0, 1000.0) == pytest.approx(25.0)
    assert compute_margin(200.0, 1000.0) == pytest.approx(20.0)
    assert compute_debt_to_equity(400.0, 1000.0) == pytest.approx(0.4)
    assert compute_current_ratio(600.0, 300.0) == pytest.approx(2.0)
    assert compute_yoy_growth(1200.0, 1000.0) == pytest.approx(20.0)

    summary = compute_fundamentals_from_inputs(
        symbol="INFY.NS",
        price=1500.0,
        eps=50.0,
        book_value_per_share=300.0,
        revenue_current=12000.0,
        revenue_previous=10000.0,
        net_income_current=2400.0,
        net_income_previous=2000.0,
        operating_income=3000.0,
        total_debt=1000.0,
        shareholders_equity=8000.0,
        # Intentionally omit current_assets & current_liabilities to test missing detection
    )
    assert summary["valuation"]["pe_ratio"] == pytest.approx(30.0)
    assert summary["valuation"]["pb_ratio"] == pytest.approx(5.0)
    assert summary["profitability"]["roe_pct"] == pytest.approx(30.0)
    assert summary["profitability"]["net_margin_pct"] == pytest.approx(20.0)
    assert summary["profitability"]["operating_margin_pct"] == pytest.approx(25.0)
    assert summary["growth"]["revenue_growth_yoy_pct"] == pytest.approx(20.0)
    assert summary["growth"]["earnings_growth_yoy_pct"] == pytest.approx(20.0)
    assert summary["financial_stability"]["debt_to_equity"] == pytest.approx(0.12)
    assert "current_ratio" in summary["data_quality"]["missing_fields"]


def test_analyze_technical_indicators_chart_output():
    dates = pd.date_range("2025-01-01", periods=100, freq="B")
    close = np.linspace(100.0, 160.0, 100)
    df = pd.DataFrame({
        "Open": close - 0.5,
        "High": close + 1.0,
        "Low": close - 1.0,
        "Close": close,
        "Volume": np.full(100, 50000),
    }, index=dates)

    res = analyze_technical_indicators(df, symbol="INFY.NS", display_bars=30)
    assert len(res["chart_data"]) == 30
    assert res["indicators"]["sma20"] is not None
    assert res["indicators"]["sma50"] is not None
    assert res["indicators"]["rsi14"] is not None
    assert res["signals"]["overall_trend"] == "upward"
